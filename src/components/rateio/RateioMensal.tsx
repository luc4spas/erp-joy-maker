import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { formatCurrency } from '@/lib/processData';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, ChevronLeft, ChevronRight, Calendar, Printer, DollarSign } from 'lucide-react';
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Funcionario {
  id: string;
  nome: string;
  setor: 'Garçom' | 'Cozinha' | 'Administrativo';
  frente: 'Japa' | 'Trattoria' | 'Ambas';
  ativo: boolean;
}

interface Fechamento {
  id: string;
  data: string;
  comissao_japa: number;
  comissao_trattoria: number;
}

interface RateioMensalItem {
  funcionario: Funcionario;
  semanas: { inicio: string; fim: string; valor: number }[];
  totalMes: number;
  valorJapa: number;
  valorTrattoria: number;
}

export function RateioMensal() {
  const [monthStart, setMonthStart] = useState<Date>(() => startOfMonth(new Date()));
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [rateioMensal, setRateioMensal] = useState<RateioMensalItem[]>([]);
  const [semanasDoMes, setSemanasDoMes] = useState<{ inicio: Date; fim: Date }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalGeralMes, setTotalGeralMes] = useState(0);

  const { user } = useAuth();

  useEffect(() => {
    if (user) fetchMonthlyData();
  }, [user, monthStart]);

  const getWeeksInMonth = (start: Date, end: Date) => {
    const weeks: { inicio: Date; fim: Date }[] = [];
    let current = new Date(start);
    
    // Ajusta para o primeiro domingo do mês ou anterior para manter a lógica de semanas
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 0) {
      current.setDate(current.getDate() - dayOfWeek);
    }

    while (current <= end) {
      const weekStart = new Date(current);
      const weekEnd = new Date(current);
      weekEnd.setDate(weekEnd.getDate() + 6);
      weeks.push({ inicio: weekStart, fim: weekEnd });
      current.setDate(current.getDate() + 7);
    }
    return weeks;
  };

  const fetchMonthlyData = async () => {
    setIsLoading(true);

    // Define os limites estritos do mês
    const realMonthStart = startOfMonth(monthStart);
    const realMonthEnd = endOfMonth(monthStart);

    const weeks = getWeeksInMonth(realMonthStart, realMonthEnd);
    setSemanasDoMes(weeks);

    const fetchStart = format(realMonthStart, 'yyyy-MM-dd');
    const fetchEnd = format(realMonthEnd, 'yyyy-MM-dd');

    const [funcRes, fechRes] = await Promise.all([
      supabase.from('funcionarios').select('*').eq('ativo', true),
      supabase.from('fechamentos')
        .select('id, data, comissao_japa, comissao_trattoria')
        .gte('data', fetchStart) // Filtro: Início do mês
        .lte('data', fetchEnd)   // Filtro: Fim do mês
        .order('data', { ascending: true }),
    ]);

    const funcs = (funcRes.data || []) as Funcionario[];
    const fechs = (fechRes.data || []) as Fechamento[];
    setFuncionarios(funcs);

    if (fechs.length === 0 || funcs.length === 0) {
      setRateioMensal([]);
      setTotalGeralMes(0);
      setIsLoading(false);
      return;
    }

    const funcMap = new Map<string, RateioMensalItem>();
    funcs.forEach(f => {
      funcMap.set(f.id, {
        funcionario: f, semanas: [], totalMes: 0, valorJapa: 0, valorTrattoria: 0,
      });
    });

    const percentGarcom = 0.475 / 0.8;
    const percentCozinha = 0.275 / 0.8;
    const percentAdmin = 0.05 / 0.8;

    weeks.forEach(week => {
      const weekStartStr = format(week.inicio, 'yyyy-MM-dd');
      const weekEndStr = format(week.fim, 'yyyy-MM-dd');

      // Filtra fechamentos da semana respeitando os limites do mês
      const weekFechs = fechs.filter(f => 
        f.data >= weekStartStr && 
        f.data <= weekEndStr &&
        f.data >= fetchStart && 
        f.data <= fetchEnd
      );

      if (weekFechs.length === 0) return;

      const totalJapa = weekFechs.reduce((sum, f) => sum + Number(f.comissao_japa), 0);
      const totalTrattoria = weekFechs.reduce((sum, f) => sum + Number(f.comissao_trattoria), 0);
      const totalComissao = totalJapa + totalTrattoria;

      if (totalComissao === 0) return;

      const japaGarcom = totalJapa * percentGarcom;
      const japaCozinha = totalJapa * percentCozinha;
      const trattoriaGarcom = totalTrattoria * percentGarcom;
      const trattoriaCozinha = totalTrattoria * percentCozinha;
      const adminTotal = totalComissao * percentAdmin;

      const garcomJapa = funcs.filter(f => f.setor === 'Garçom' && (f.frente === 'Japa' || f.frente === 'Ambas'));
      const garcomTrat = funcs.filter(f => f.setor === 'Garçom' && (f.frente === 'Trattoria' || f.frente === 'Ambas'));
      const cozJapa = funcs.filter(f => f.setor === 'Cozinha' && (f.frente === 'Japa' || f.frente === 'Ambas'));
      const cozTrat = funcs.filter(f => f.setor === 'Cozinha' && (f.frente === 'Trattoria' || f.frente === 'Ambas'));
      const admins = funcs.filter(f => f.setor === 'Administrativo');

      const weekValues = new Map<string, { japa: number; trattoria: number }>();
      funcs.forEach(f => weekValues.set(f.id, { japa: 0, trattoria: 0 }));

      const addVal = (id: string, j, t) => {
        const v = weekValues.get(id);
        if (v) { v.japa += j; v.trattoria += t; }
      };

      garcomJapa.forEach(f => addVal(f.id, japaGarcom / garcomJapa.length, 0));
      garcomTrat.forEach(f => addVal(f.id, 0, trattoriaGarcom / garcomTrat.length));
      cozJapa.forEach(f => addVal(f.id, japaCozinha / cozJapa.length, 0));
      cozTrat.forEach(f => addVal(f.id, 0, trattoriaCozinha / cozTrat.length));
      admins.forEach(f => {
        const val = adminTotal / (admins.length || 1);
        const propJapa = totalJapa / (totalComissao || 1);
        addVal(f.id, val * propJapa, val * (1 - propJapa));
      });

      const periodoLabel = `${format(week.inicio, 'dd/MM')} a ${format(week.fim, 'dd/MM')}`;
      weekValues.forEach((val, id) => {
        const total = val.japa + val.trattoria;
        if (total <= 0) return;
        const item = funcMap.get(id);
        if (item) {
          item.semanas.push({ inicio: periodoLabel, fim: weekEndStr, valor: total });
          item.totalMes += total;
          item.valorJapa += val.japa;
          item.valorTrattoria += val.trattoria;
        }
      });
    });

    const result = Array.from(funcMap.values()).filter(i => i.totalMes > 0).sort((a, b) => b.totalMes - a.totalMes);
    setRateioMensal(result);
    setTotalGeralMes(result.reduce((sum, r) => sum + r.totalMes, 0));
    setIsLoading(false);
  };

  const handlePrintMonthly = () => {
    const mesAno = format(monthStart, "MMMM 'de' yyyy", { locale: ptBR });
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`<html><head><title>Rateio - ${mesAno}</title><style>body{font-family:sans-serif;padding:20px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ddd;padding:8px;text-align:left}.text-right{text-align:right}</style></head><body><h1>Rateio Mensal - ${mesAno}</h1><table><thead><tr><th>Nome</th><th>Setor</th><th class="text-right">Total</th></tr></thead><tbody>${rateioMensal.map(r => `<tr><td>${r.funcionario.nome}</td><td>${r.funcionario.setor}</td><td class="text-right">${formatCurrency(r.totalMes)}</td></tr>`).join('')}</tbody></table></body></html>`);
    w.document.close(); w.print();
  };

  const mesAnoLabel = format(monthStart, "MMMM 'de' yyyy", { locale: ptBR });

  return (
    <div className="space-y-6">
      <div className="bg-card rounded-xl p-4 shadow-card border border-border flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={() => setMonthStart(subMonths(monthStart, 1))}><ChevronLeft className="w-4 h-4" /></Button>
          <div className="text-center min-w-[150px]">
            <p className="text-xs text-muted-foreground">Mês de Referência</p>
            <p className="text-lg font-semibold capitalize">{mesAnoLabel}</p>
          </div>
          <Button variant="outline" size="icon" onClick={() => setMonthStart(addMonths(monthStart, 1))}><ChevronRight className="w-4 h-4" /></Button>
          <Button variant="ghost" size="sm" onClick={() => setMonthStart(startOfMonth(new Date()))}>Hoje</Button>
        </div>
        <Button variant="outline" onClick={handlePrintMonthly} disabled={rateioMensal.length === 0}><Printer className="w-4 h-4 mr-2" /> Imprimir</Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card p-4 rounded-xl border border-border shadow-sm">
          <p className="text-xs text-muted-foreground">Total Geral Comissão</p>
          <p className="text-2xl font-bold text-primary">{formatCurrency(totalGeralMes)}</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      ) : (
        <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Colaborador</TableHead>
                <TableHead>Setor</TableHead>
                {semanasDoMes.map((_, i) => <TableHead key={i} className="text-right text-xs">Sem {i + 1}</TableHead>)}
                <TableHead className="text-right">Total Mês</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rateioMensal.map((r) => (
                <TableRow key={r.funcionario.id}>
                  <TableCell className="font-medium">{r.funcionario.nome}</TableCell>
                  <TableCell><Badge variant="secondary">{r.funcionario.setor}</Badge></TableCell>
                  {semanasDoMes.map((w, i) => {
                    const semana = r.semanas[i];
                    return <TableCell key={i} className="text-right text-xs">{semana ? formatCurrency(semana.valor) : '-'}</TableCell>;
                  })}
                  <TableCell className="text-right font-bold text-primary">{formatCurrency(r.totalMes)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
