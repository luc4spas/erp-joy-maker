import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { formatCurrency } from '@/lib/processData';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, ChevronLeft, ChevronRight, Printer, AlertCircle } from 'lucide-react';
import { format, startOfMonth, endOfMonth, addMonths, subMonths, eachWeekOfInterval, endOfWeek, isWithinInterval, parseISO } from 'date-fns';
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
  valoresSemanais: Record<string, number>;
  totalMes: number;
  valorJapa: number;
  valorTrattoria: number;
}

export function RateioMensal() {
  const [monthStart, setMonthStart] = useState<Date>(() => startOfMonth(new Date()));
  const [rateioMensal, setRateioMensal] = useState<RateioMensalItem[]>([]);
  const [colunasSemanas, setColunasSemanas] = useState<{ inicio: Date; fim: Date; label: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalGeralMes, setTotalGeralMes] = useState(0);

  const { user } = useAuth();
  const monthEnd = endOfMonth(monthStart);

  useEffect(() => {
    if (user) fetchMonthlyData();
  }, [user, monthStart]);

  const fetchMonthlyData = async () => {
    setIsLoading(true);
    
    // 1. Gerar as semanas do mês para os cabeçalhos
    const weeks = eachWeekOfInterval({ start: monthStart, end: monthEnd }, { weekStartsOn: 0 });
    const colunas = weeks.map(w => {
      const s = w < monthStart ? monthStart : w;
      const e = endOfWeek(w, { weekStartsOn: 0 }) > monthEnd ? monthEnd : endOfWeek(w, { weekStartsOn: 0 });
      return {
        inicio: s,
        fim: e,
        label: `${format(s, 'dd/MM')} a ${format(e, 'dd/MM')}`
      };
    });
    setColunasSemanas(colunas);

    // 2. Buscar dados (Filtro estrito do dia 1 ao 30/31)
    const { data: funcData } = await supabase.from('funcionarios').select('*').eq('ativo', true);
    const { data: fechData } = await supabase.from('fechamentos')
      .select('data, comissao_japa, comissao_trattoria')
      .gte('data', format(monthStart, 'yyyy-MM-dd'))
      .lte('data', format(monthEnd, 'yyyy-MM-dd'));

    const funcs = (funcData || []) as Funcionario[];
    const fechs = (fechData || []) as Fechamento[];

    const funcMap = new Map<string, RateioMensalItem>();
    funcs.forEach(f => {
      funcMap.set(f.id, {
        funcionario: f, valoresSemanais: {}, totalMes: 0, valorJapa: 0, valorTrattoria: 0
      });
    });

    // Percentuais oficiais do sistema
    const pGarcom = 0.475 / 0.8;
    const pCozinha = 0.275 / 0.8;
    const pAdmin = 0.05 / 0.8;

    // 3. Processar cada semana separadamente
    colunas.forEach(col => {
      const fechsDaSemana = fechs.filter(f => {
        const dataF = parseISO(f.data);
        return dataF >= col.inicio && dataF <= col.fim;
      });

      if (fechsDaSemana.length === 0) return;

      const totJapa = fechsDaSemana.reduce((s, f) => s + Number(f.comissao_japa), 0);
      const totTrat = fechsDaSemana.reduce((s, f) => s + Number(f.comissao_trattoria), 0);
      const totCom = totJapa + totTrat;

      // Filtragem de equipes para esta distribuição
      const gJapa = funcs.filter(f => f.setor === 'Garçom' && (f.frente === 'Japa' || f.frente === 'Ambas'));
      const gTrat = funcs.filter(f => f.setor === 'Garçom' && (f.frente === 'Trattoria' || f.frente === 'Ambas'));
      const cJapa = funcs.filter(f => f.setor === 'Cozinha' && (f.frente === 'Japa' || f.frente === 'Ambas'));
      const cTrat = funcs.filter(f => f.setor === 'Cozinha' && (f.frente === 'Trattoria' || f.frente === 'Ambas'));
      const admins = funcs.filter(f => f.setor === 'Administrativo');

      funcs.forEach(f => {
        let vJ = 0, vT = 0;
        if (f.setor === 'Garçom') {
          if (gJapa.includes(f)) vJ = (totJapa * pGarcom) / gJapa.length;
          if (gTrat.includes(f)) vT = (totTrat * pGarcom) / gTrat.length;
        } else if (f.setor === 'Cozinha') {
          if (cJapa.includes(f)) vJ = (totJapa * pCozinha) / cJapa.length;
          if (cTrat.includes(f)) vT = (totTrat * pCozinha) / cTrat.length;
        } else if (f.setor === 'Administrativo') {
          const vA = (totCom * pAdmin) / (admins.length || 1);
          const prop = totJapa / (totCom || 1);
          vJ = vA * prop; vT = vA * (1 - prop);
        }

        if (vJ + vT > 0) {
          const item = funcMap.get(f.id)!;
          item.valoresSemanais[col.label] = (item.valoresSemanais[col.label] || 0) + (vJ + vT);
          item.totalMes += (vJ + vT);
          item.valorJapa += vJ;
          item.valorTrattoria += vT;
        }
      });
    });

    const finalResult = Array.from(funcMap.values())
      .filter(i => i.totalMes > 0.01)
      .sort((a, b) => b.totalMes - a.totalMes);

    setRateioMensal(finalResult);
    setTotalGeralMes(finalResult.reduce((s, r) => s + r.totalMes, 0));
    setIsLoading(false);
  };

  return (
    <div className=\"space-y-6\">
      <div className=\"bg-card rounded-xl p-4 shadow-card border border-border flex flex-wrap items-center justify-between gap-4\">
        <div className=\"flex items-center gap-3\">
          <Button variant=\"outline\" size=\"icon\" onClick={() => setMonthStart(subMonths(monthStart, 1))}><ChevronLeft className=\"w-4 h-4\" /></Button>
          <div className=\"text-center min-w-[160px]\">
            <p className=\"text-xs text-muted-foreground font-medium\">Mês de Referência</p>
            <p className=\"text-lg font-semibold capitalize text-primary\">{format(monthStart, \"MMMM 'de' yyyy\", { locale: ptBR })}</p>
          </div>
          <Button variant=\"outline\" size=\"icon\" onClick={() => setMonthStart(addMonths(monthStart, 1))}><ChevronRight className=\"w-4 h-4\" /></Button>
        </div>
        <div className=\"bg-primary/5 px-4 py-2 rounded-lg border border-primary/10\">
          <p className=\"text-[10px] uppercase tracking-wider text-muted-foreground font-bold\">Total Comissões no Mês</p>
          <p className=\"text-2xl font-black text-primary\">{formatCurrency(totalGeralMes)}</p>
        </div>
      </div>

      {isLoading ? (
        <div className=\"flex justify-center py-20\"><Loader2 className=\"w-10 h-10 animate-spin text-primary\" /></div>
      ) : rateioMensal.length === 0 ? (
        <div className=\"text-center py-20 bg-muted/20 rounded-xl border-2 border-dashed font-medium text-muted-foreground\">
          <AlertCircle className=\"w-10 h-10 mx-auto mb-3 opacity-20\" />
          Nenhum fechamento encontrado para este mês.
        </div>
      ) : (
        <div className=\"bg-card rounded-xl shadow-md border border-border overflow-hidden\">
          <div className=\"overflow-x-auto\">
            <Table>
              <TableHeader className=\"bg-muted/50\">
                <TableRow>
                  <TableHead className=\"w-[200px] font-bold text-foreground uppercase text-[10px]\">Colaborador</TableHead>
                  <TableHead className=\"font-bold text-foreground uppercase text-[10px]\">Setor</TableHead>
                  {colunasSemanas.map((col, i) => (
                    <TableHead key={i} className=\"text-right text-[10px] font-bold leading-tight min-w-[90px] text-primary\">
                      {col.label}
                    </TableHead>
                  ))}
                  <TableHead className=\"text-right font-bold text-japa text-[10px] uppercase\">Japa</TableHead>
                  <TableHead className=\"text-right font-bold text-trattoria text-[10px] uppercase\">Trat.</TableHead>
                  <TableHead className=\"text-right font-bold text-foreground text-[10px] uppercase bg-primary/5\">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rateioMensal.map((r) => (
                  <TableRow key={r.funcionario.id} className=\"hover:bg-muted/30 transition-colors\">
                    <TableCell className=\"font-semibold text-sm\">{r.funcionario.nome}</TableCell>
                    <TableCell>
                      <Badge variant=\"outline\" className=\"text-[9px] font-bold uppercase py-0\">
                        {r.funcionario.setor}
                      </Badge>
                    </TableCell>
                    {colunasSemanas.map((col, i) => {
                      const val = r.valoresSemanais[col.label];
                      return (
                        <TableCell key={i} className=\"text-right tabular-nums text-xs\">
                          {val ? formatCurrency(val) : <span className=\"opacity-20\">-</span>}
                        </TableCell>
                      );
                    })}
                    <TableCell className=\"text-right tabular-nums text-xs text-japa/80\">{formatCurrency(r.valorJapa)}</TableCell>
                    <TableCell className=\"text-right tabular-nums text-xs text-trattoria/80\">{formatCurrency(r.valorTrattoria)}</TableCell>
                    <TableCell className=\"text-right tabular-nums font-bold text-primary bg-primary/5\">{formatCurrency(r.totalMes)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}
