import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { formatCurrency } from '@/lib/processData';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, ChevronLeft, ChevronRight, Calendar, Printer, DollarSign } from 'lucide-react';
import { format, startOfMonth, endOfMonth, addMonths, subMonths, isWithinInterval } from 'date-fns';
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
  semanas: { label: string; valor: number }[];
  totalMes: number;
  valorJapa: number;
  valorTrattoria: number;
}

export function RateioMensal() {
  const [monthStart, setMonthStart] = useState<Date>(() => startOfMonth(new Date()));
  const [rateioMensal, setRateioMensal] = useState<RateioMensalItem[]>([]);
  const [semanasDoMes, setSemanasDoMes] = useState<{ inicio: Date; fim: Date; label: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalGeralMes, setTotalGeralMes] = useState(0);

  const { user } = useAuth();
  const monthEnd = endOfMonth(monthStart);

  useEffect(() => {
    if (user) fetchMonthlyData();
  }, [user, monthStart]);

  const getWeeksInMonth = (start: Date, end: Date) => {
    const weeks: { inicio: Date; fim: Date; label: string }[] = [];
    let current = new Date(start);
    
    const firstDay = current.getDay();
    if (firstDay !== 0) {
      current.setDate(current.getDate() - firstDay);
    }

    while (current <= end) {
      const wStart = new Date(current);
      const wEnd = new Date(current);
      wEnd.setDate(wEnd.getDate() + 6);
      
      weeks.push({ 
        inicio: wStart, 
        fim: wEnd,
        label: `${format(wStart, 'dd/MM')} a ${format(wEnd, 'dd/MM')}`
      });
      current.setDate(current.getDate() + 7);
    }
    return weeks;
  };

  const fetchMonthlyData = async () => {
    setIsLoading(true);
    const weeks = getWeeksInMonth(monthStart, monthEnd);
    setSemanasDoMes(weeks);

    const fetchStart = format(monthStart, 'yyyy-MM-dd');
    const fetchEnd = format(monthEnd, 'yyyy-MM-dd');

    const [funcRes, fechRes] = await Promise.all([
      supabase.from('funcionarios').select('*').eq('ativo', true),
      supabase.from('fechamentos')
        .select('id, data, comissao_japa, comissao_trattoria')
        .gte('data', fetchStart)
        .lte('data', fetchEnd)
        .order('data', { ascending: true }),
    ]);

    const funcs = (funcRes.data || []) as Funcionario[];
    const fechs = (fechRes.data || []) as Fechamento[];

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

    const pGarcom = 0.475 / 0.8;
    const pCozinha = 0.275 / 0.8;
    const pAdmin = 0.05 / 0.8;

    weeks.forEach(week => {
      const weekFechs = fechs.filter(f => {
        const d = new Date(f.data + 'T12:00:00');
        return d >= week.inicio && d <= week.fim;
      });

      if (weekFechs.length === 0) return;

      const totJapa = weekFechs.reduce((sum, f) => sum + Number(f.comissao_japa), 0);
      const totTrat = weekFechs.reduce((sum, f) => sum + Number(f.comissao_trattoria), 0);
      const totCom = totJapa + totTrat;

      const gJapa = funcs.filter(f => f.setor === 'Garçom' && (f.frente === 'Japa' || f.frente === 'Ambas'));
      const gTrat = funcs.filter(f => f.setor === 'Garçom' && (f.frente === 'Trattoria' || f.frente === 'Ambas'));
      const cJapa = funcs.filter(f => f.setor === 'Cozinha' && (f.frente === 'Japa' || f.frente === 'Ambas'));
      const cTrat = funcs.filter(f => f.setor === 'Cozinha' && (f.frente === 'Trattoria' || f.frente === 'Ambas'));
      const admins = funcs.filter(f => f.setor === 'Administrativo');

      funcs.forEach(f => {
        let j = 0, t = 0;
        if (f.setor === 'Garçom') {
          if (gJapa.includes(f)) j += (totJapa * pGarcom) / gJapa.length;
          if (gTrat.includes(f)) t += (totTrat * pGarcom) / gTrat.length;
        } else if (f.setor === 'Cozinha') {
          if (cJapa.includes(f)) j += (totJapa * pCozinha) / cJapa.length;
          if (cTrat.includes(f)) t += (totTrat * pCozinha) / cTrat.length;
        } else if (f.setor === 'Administrativo') {
          const vAdmin = (totCom * pAdmin) / admins.length;
          const prop = totJapa / (totCom || 1);
          j = vAdmin * prop; t = vAdmin * (1 - prop);
        }

        if (j + t > 0) {
          const item = funcMap.get(f.id)!;
          item.semanas.push({ label: week.label, valor: j + t });
          item.totalMes += (j + t);
          item.valorJapa += j;
          item.valorTrattoria += t;
        }
      });
    });

    const result = Array.from(funcMap.values()).filter(i => i.totalMes > 0).sort((a, b) => b.totalMes - a.totalMes);
    setRateioMensal(result);
    setTotalGeralMes(result.reduce((sum, r) => sum + r.totalMes, 0));
    setIsLoading(false);
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
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Total Geral</p>
            <p className="text-xl font-bold text-primary">{formatCurrency(totalGeralMes)}</p>
          </div>
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
                {semanasDoMes.map((w, i) => (
                  <TableHead key={i} className="text-right text-[10px] leading-tight min-w-[80px]">
                    {w.label}
                  </TableHead>
                ))}
                <TableHead className="text-right text-japa">Total Japa</TableHead>
                <TableHead className="text-right text-trattoria">Total Trat.</TableHead>
                <TableHead className="text-right font-bold">Total Geral</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rateioMensal.map((r) => (
                <TableRow key={r.funcionario.id}>
                  <TableCell className="font-medium text-xs">{r.funcionario.nome}</TableCell>
                  <TableCell><Badge variant="outline" className="text-[10px]">{r.funcionario.setor}</Badge></TableCell>
                  {semanasDoMes.map((w, i) => {
                    const valorSemana = r.semanas.find(s => s.label === w.label)?.valor;
                    return (
                      <TableCell key={i} className="text-right text-xs">
                        {valorSemana ? formatCurrency(valorSemana) : '-'}
                      </TableCell>
                    );
                  })}
                  <TableCell className="text-right text-xs text-muted-foreground">{formatCurrency(r.valorJapa)}</TableCell>
                  <TableCell className="text-right text-xs text-muted-foreground">{formatCurrency(r.valorTrattoria)}</TableCell>
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
