import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { formatCurrency } from '@/lib/processData';
import { formatDateBR } from '@/lib/dateUtils';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, ChevronLeft, ChevronRight, Calendar, Printer, DollarSign, Users } from 'lucide-react';
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
  japa_taxa: number;
  trattoria_taxa: number;
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
  const monthEnd = endOfMonth(monthStart);

  useEffect(() => {
    if (user) fetchMonthlyData();
  }, [user, monthStart]);

  const getWeeksInMonth = (start: Date, end: Date) => {
    const weeks: { inicio: Date; fim: Date }[] = [];
    let current = new Date(start);
    
    // Find the first Sunday on or before the month start
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 0) {
      current = new Date(current);
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

    const weeks = getWeeksInMonth(monthStart, monthEnd);
    setSemanasDoMes(weeks);

    // Fetch wider range to cover partial weeks
    const fetchStart = format(weeks[0]?.inicio || monthStart, 'yyyy-MM-dd');
    const fetchEnd = format(weeks[weeks.length - 1]?.fim || monthEnd, 'yyyy-MM-dd');

    const [funcRes, fechRes, pagRes] = await Promise.all([
      supabase.from('funcionarios').select('*').eq('ativo', true),
      supabase.from('fechamentos')
        .select('id, data, comissao_japa, comissao_trattoria, japa_taxa, trattoria_taxa')
        .gte('data', fetchStart)
        .lte('data', fetchEnd)
        .order('data', { ascending: true }),
      supabase.from('pagamentos_funcionarios')
        .select('id, funcionario_id, pago, valor, data')
        .gte('data', fetchStart)
        .lte('data', fetchEnd)
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

    // Calculate rateio per week, then aggregate per month
    const funcMap = new Map<string, RateioMensalItem>();

    funcs.forEach(f => {
      funcMap.set(f.id, {
        funcionario: f,
        semanas: [],
        totalMes: 0,
        valorJapa: 0,
        valorTrattoria: 0,
      });
    });

    const percentGarcom = 0.475 / 0.8;
    const percentCozinha = 0.275 / 0.8;
    const percentAdmin = 0.05 / 0.8;

    weeks.forEach(week => {
      const weekStartStr = format(week.inicio, 'yyyy-MM-dd');
      const weekEndStr = format(week.fim, 'yyyy-MM-dd');

      const weekFechs = fechs.filter(f => f.data >= weekStartStr && f.data <= weekEndStr);
      if (weekFechs.length === 0) return;

      const totalComissaoJapa = weekFechs.reduce((sum, f) => sum + Number(f.comissao_japa), 0);
      const totalComissaoTrattoria = weekFechs.reduce((sum, f) => sum + Number(f.comissao_trattoria), 0);
      const totalComissao = totalComissaoJapa + totalComissaoTrattoria;
      if (totalComissao === 0) return;

      const japaGarcom = totalComissaoJapa * percentGarcom;
      const japaCozinha = totalComissaoJapa * percentCozinha;
      const trattoriaGarcom = totalComissaoTrattoria * percentGarcom;
      const trattoriaCozinha = totalComissaoTrattoria * percentCozinha;
      const adminTotal = totalComissao * percentAdmin;

      const garcomJapaFuncs = funcs.filter(f => f.setor === 'Garçom' && (f.frente === 'Japa' || f.frente === 'Ambas'));
      const garcomTrattoriaFuncs = funcs.filter(f => f.setor === 'Garçom' && (f.frente === 'Trattoria' || f.frente === 'Ambas'));
      const cozinhaJapaFuncs = funcs.filter(f => f.setor === 'Cozinha' && (f.frente === 'Japa' || f.frente === 'Ambas'));
      const cozinhaTrattoriaFuncs = funcs.filter(f => f.setor === 'Cozinha' && (f.frente === 'Trattoria' || f.frente === 'Ambas'));
      const adminFuncs = funcs.filter(f => f.setor === 'Administrativo');

      // Temp map for this week
      const weekValues = new Map<string, { japa: number; trattoria: number }>();
      funcs.forEach(f => weekValues.set(f.id, { japa: 0, trattoria: 0 }));

      const addVal = (id: string, japa: number, trattoria: number) => {
        const v = weekValues.get(id)!;
        v.japa += japa;
        v.trattoria += trattoria;
      };

      garcomJapaFuncs.forEach(f => addVal(f.id, japaGarcom / garcomJapaFuncs.length, 0));
      garcomTrattoriaFuncs.forEach(f => addVal(f.id, 0, trattoriaGarcom / garcomTrattoriaFuncs.length));
      cozinhaJapaFuncs.forEach(f => addVal(f.id, japaCozinha / cozinhaJapaFuncs.length, 0));
      cozinhaTrattoriaFuncs.forEach(f => addVal(f.id, 0, trattoriaCozinha / cozinhaTrattoriaFuncs.length));
      adminFuncs.forEach(f => {
        const val = adminTotal / adminFuncs.length;
        const propJapa = totalComissaoJapa / totalComissao;
        addVal(f.id, val * propJapa, val * (1 - propJapa));
      });

      const periodoLabel = `${format(week.inicio, 'dd/MM')} a ${format(week.fim, 'dd/MM')}`;

      weekValues.forEach((val, id) => {
        const total = val.japa + val.trattoria;
        if (total <= 0) return;
        const item = funcMap.get(id);
        if (!item) return;
        item.semanas.push({ inicio: periodoLabel, fim: weekEndStr, valor: total });
        item.totalMes += total;
        item.valorJapa += val.japa;
        item.valorTrattoria += val.trattoria;
      });
    });

    const result = Array.from(funcMap.values())
      .filter(item => item.totalMes > 0)
      .sort((a, b) => b.totalMes - a.totalMes);

    setRateioMensal(result);
    setTotalGeralMes(result.reduce((sum, r) => sum + r.totalMes, 0));
    setIsLoading(false);
  };

  const handlePrintMonthly = () => {
    const mesAno = format(monthStart, "MMMM 'de' yyyy", { locale: ptBR });
    
    const w = window.open('', '_blank');
    if (!w) return;

    w.document.write(`
      <html>
      <head>
        <title>Rateio Mensal - ${mesAno}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 30px; max-width: 900px; margin: 0 auto; color: #333; }
          h1 { font-size: 20px; text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; }
          .periodo { background: #f0f0f0; padding: 10px; border-radius: 5px; text-align: center; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th { background: #f5f5f5; padding: 8px; text-align: left; border-bottom: 2px solid #ddd; }
          td { padding: 8px; border-bottom: 1px solid #eee; }
          .text-right { text-align: right; }
          .font-bold { font-weight: bold; }
          .total-row { background: #f0f7ff; font-weight: bold; }
          .semanas { font-size: 11px; color: #666; }
          @media print { body { padding: 15px; } }
        </style>
      </head>
      <body>
        <h1>RATEIO MENSAL - FOLHA DE PAGAMENTO</h1>
        <div class="periodo">
          <strong>Referência:</strong> ${mesAno.charAt(0).toUpperCase() + mesAno.slice(1)} | 
          <strong>Total:</strong> ${formatCurrency(totalGeralMes)}
        </div>
        <table>
          <thead>
            <tr>
              <th>Colaborador</th>
              <th>Setor</th>
              <th>Semanas</th>
              <th class="text-right">Japa</th>
              <th class="text-right">Trattoria</th>
              <th class="text-right">Total Mês</th>
            </tr>
          </thead>
          <tbody>
            ${rateioMensal.map(r => `
              <tr>
                <td class="font-bold">${r.funcionario.nome}</td>
                <td>${r.funcionario.setor === 'Administrativo' ? 'Caixa/Adm/Cumins' : `${r.funcionario.setor} ${r.funcionario.frente}`}</td>
                <td class="semanas">${r.semanas.length} semana(s)</td>
                <td class="text-right">${r.valorJapa > 0 ? formatCurrency(r.valorJapa) : '-'}</td>
                <td class="text-right">${r.valorTrattoria > 0 ? formatCurrency(r.valorTrattoria) : '-'}</td>
                <td class="text-right font-bold">${formatCurrency(r.totalMes)}</td>
              </tr>
            `).join('')}
            <tr class="total-row">
              <td colspan="5">TOTAL GERAL</td>
              <td class="text-right">${formatCurrency(totalGeralMes)}</td>
            </tr>
          </tbody>
        </table>
      </body>
      </html>
    `);
    w.document.close();
    w.print();
  };

  const goToPreviousMonth = () => setMonthStart(startOfMonth(subMonths(monthStart, 1)));
  const goToNextMonth = () => setMonthStart(startOfMonth(addMonths(monthStart, 1)));
  const goToCurrentMonth = () => setMonthStart(startOfMonth(new Date()));

  const mesAnoLabel = format(monthStart, "MMMM 'de' yyyy", { locale: ptBR });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Month Selector */}
      <div className="bg-card rounded-xl p-4 shadow-card border border-border flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={goToPreviousMonth}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
              <Calendar className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Mês Selecionado</p>
              <p className="text-lg font-semibold text-foreground capitalize">
                {mesAnoLabel}
              </p>
            </div>
          </div>
          <Button variant="outline" size="icon" onClick={goToNextMonth}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={goToCurrentMonth}>Mês Atual</Button>
          {rateioMensal.length > 0 && (
            <Button variant="outline" onClick={handlePrintMonthly}>
              <Printer className="w-4 h-4 mr-2" /> Imprimir Folha
            </Button>
          )}
        </div>
      </div>

      {/* Summary Card */}
      {rateioMensal.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-card rounded-xl p-4 shadow-card border border-border">
            <p className="text-xs text-muted-foreground">Colaboradores</p>
            <p className="text-2xl font-bold text-foreground">{rateioMensal.length}</p>
          </div>
          <div className="bg-card rounded-xl p-4 shadow-card border border-border">
            <p className="text-xs text-muted-foreground">Semanas no Período</p>
            <p className="text-2xl font-bold text-foreground">{semanasDoMes.length}</p>
          </div>
          <div className="bg-card rounded-xl p-4 shadow-card border border-border">
            <p className="text-xs text-muted-foreground">Total Geral do Mês</p>
            <p className="text-2xl font-bold text-primary">{formatCurrency(totalGeralMes)}</p>
          </div>
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : rateioMensal.length === 0 ? (
        <div className="text-center py-16 bg-card rounded-2xl shadow-card">
          <DollarSign className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Nenhum fechamento encontrado para este mês.</p>
        </div>
      ) : (
        <div className="bg-card rounded-2xl shadow-card overflow-hidden">
          <div className="p-4 border-b border-border">
            <h3 className="font-semibold text-lg">Consolidado Mensal por Colaborador</h3>
            <p className="text-sm text-muted-foreground">Valores para composição da folha de pagamento</p>
          </div>

          {/* Desktop */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Colaborador</TableHead>
                  <TableHead>Setor</TableHead>
                  {semanasDoMes.map((w, i) => (
                    <TableHead key={i} className="text-right text-xs">
                      Sem {i + 1}<br />
                      <span className="text-muted-foreground font-normal">
                        {format(w.inicio, 'dd/MM')}
                      </span>
                    </TableHead>
                  ))}
                  <TableHead className="text-right">Total Mês</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rateioMensal.map((r) => (
                  <TableRow key={r.funcionario.id}>
                    <TableCell className="font-medium">{r.funcionario.nome}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={
                        r.funcionario.setor === 'Administrativo' ? 'bg-commission-light text-commission-foreground' :
                        r.funcionario.frente === 'Japa' ? 'bg-japa-light text-japa-foreground' :
                        r.funcionario.frente === 'Trattoria' ? 'bg-trattoria-light text-trattoria-foreground' :
                        'bg-secondary'
                      }>
                        {r.funcionario.setor === 'Administrativo' 
                          ? 'CAIXA/ADM' 
                          : `${r.funcionario.setor.toUpperCase()} ${r.funcionario.frente.toUpperCase()}`}
                      </Badge>
                    </TableCell>
                    {semanasDoMes.map((w, i) => {
                      const semana = r.semanas[i];
                      return (
                        <TableCell key={i} className="text-right tabular-nums">
                          {semana ? formatCurrency(semana.valor) : <span className="text-muted-foreground">-</span>}
                        </TableCell>
                      );
                    })}
                    <TableCell className="text-right font-bold text-primary tabular-nums">
                      {formatCurrency(r.totalMes)}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-secondary/50 font-bold">
                  <TableCell colSpan={2}>TOTAL GERAL</TableCell>
                  {semanasDoMes.map((w, i) => {
                    const weekTotal = rateioMensal.reduce((sum, r) => {
                      const s = r.semanas[i];
                      return sum + (s ? s.valor : 0);
                    }, 0);
                    return (
                      <TableCell key={i} className="text-right tabular-nums">
                        {weekTotal > 0 ? formatCurrency(weekTotal) : '-'}
                      </TableCell>
                    );
                  })}
                  <TableCell className="text-right text-primary tabular-nums">
                    {formatCurrency(totalGeralMes)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden divide-y divide-border">
            {rateioMensal.map((r) => (
              <div key={r.funcionario.id} className="p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-foreground">{r.funcionario.nome}</p>
                    <Badge variant="secondary" className={`mt-1 text-xs ${
                      r.funcionario.setor === 'Administrativo' ? 'bg-commission-light text-commission-foreground' :
                      r.funcionario.frente === 'Japa' ? 'bg-japa-light text-japa-foreground' :
                      r.funcionario.frente === 'Trattoria' ? 'bg-trattoria-light text-trattoria-foreground' :
                      'bg-secondary'
                    }`}>
                      {r.funcionario.setor === 'Administrativo' 
                        ? 'CAIXA/ADM' 
                        : `${r.funcionario.setor.toUpperCase()} ${r.funcionario.frente.toUpperCase()}`}
                    </Badge>
                  </div>
                  <p className="text-xl font-bold text-primary">{formatCurrency(r.totalMes)}</p>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {r.valorJapa > 0 && (
                    <div className="bg-japa-light rounded-lg p-2">
                      <span className="text-japa-foreground">Japa: {formatCurrency(r.valorJapa)}</span>
                    </div>
                  )}
                  {r.valorTrattoria > 0 && (
                    <div className="bg-trattoria-light rounded-lg p-2">
                      <span className="text-trattoria-foreground">Trattoria: {formatCurrency(r.valorTrattoria)}</span>
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{r.semanas.length} semana(s) com comissão</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
