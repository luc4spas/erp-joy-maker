import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { formatCurrency } from '@/lib/processData';
import { formatDateBR } from '@/lib/dateUtils';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, ChevronLeft, ChevronRight, Calendar, Printer, DollarSign, Users } from 'lucide-react';
import { format, startOfMonth, endOfMonth, addMonths, subMonths, addDays, isBefore, isAfter } from 'date-fns';
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

export const RateioMensal = () => {
  const [monthStart, setMonthStart] = useState<Date>(() => startOfMonth(new Date()));
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [rateioMensal, setRateioMensal] = useState<RateioMensalItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalGeralMes, setTotalGeralMes] = useState(0);

  const { user } = useAuth();

  useEffect(() => {
    if (user) fetchMonthlyData();
  }, [user, monthStart]);

  const fetchMonthlyData = async () => {
    setIsLoading(true);
    
    // 1. Intervalo rígido do mês (Dia 1 ao último dia)
    const start = startOfMonth(monthStart);
    const end = endOfMonth(monthStart);

    const { data: funcData } = await supabase.from('funcionarios').select('*').eq('ativo', true);
    const { data: fechData } = await supabase.from('fechamentos')
      .select('*')
      .gte('data', format(start, 'yyyy-MM-dd'))
      .lte('data', format(end, 'yyyy-MM-dd'))
      .order('data', { ascending: true });

    const funcs = (funcData || []) as Funcionario[];
    const fechs = (fechData || []) as Fechamento[];
    setFuncionarios(funcs);

    if (fechs.length === 0 || funcs.length === 0) {
      setRateioMensal([]);
      setTotalGeralMes(0);
      setIsLoading(false);
      return;
    }

    // 2. Divisão de semanas respeitando os limites do mês selecionado
    const colunasSemanas: { inicio: Date; fim: Date }[] = [];
    let current = new Date(start);
    while (isBefore(current, end)) {
      let wEnd = addDays(current, 6);
      if (isAfter(wEnd, end)) wEnd = new Date(end);
      colunasSemanas.push({ inicio: new Date(current), fim: new Date(wEnd) });
      current = addDays(wEnd, 1);
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

    colunasSemanas.forEach(semana => {
      const fechsDaSemana = fechs.filter(f => {
        // Correção de fuso horário para garantir comparação correta
        const dataF = new Date(f.data.replace(/-/g, '\/'));
        return dataF >= semana.inicio && dataF <= semana.fim;
      });

      if (fechsDaSemana.length === 0) return;

      const tJapa = fechsDaSemana.reduce((s, f) => s + Number(f.comissao_japa), 0);
      const tTrat = fechsDaSemana.reduce((s, f) => s + Number(f.comissao_trattoria), 0);
      const tCom = tJapa + tTrat;

      const gJapa = funcs.filter(f => f.setor === 'Garçom' && (f.frente === 'Japa' || f.frente === 'Ambas'));
      const gTrat = funcs.filter(f => f.setor === 'Garçom' && (f.frente === 'Trattoria' || f.frente === 'Ambas'));
      const cJapa = funcs.filter(f => f.setor === 'Cozinha' && (f.frente === 'Japa' || f.frente === 'Ambas'));
      const cTrat = funcs.filter(f => f.setor === 'Cozinha' && (f.frente === 'Trattoria' || f.frente === 'Ambas'));
      const admins = funcs.filter(f => f.setor === 'Administrativo');

      funcs.forEach(f => {
        let vJ = 0, vT = 0;
        if (f.setor === 'Garçom') {
          if (gJapa.includes(f)) vJ = (tJapa * pGarcom) / (gJapa.length || 1);
          if (gTrat.includes(f)) vT = (tTrat * pGarcom) / (gTrat.length || 1);
        } else if (f.setor === 'Cozinha') {
          if (cJapa.includes(f)) vJ = (tJapa * pCozinha) / (cJapa.length || 1);
          if (cTrat.includes(f)) vT = (tTrat * pCozinha) / (cTrat.length || 1);
        } else if (f.setor === 'Administrativo') {
          const vA = (tCom * pAdmin) / (admins.length || 1);
          const prop = tJapa / (tCom || 1);
          vJ = vA * prop; vT = vA * (1 - prop);
        }

        if (vJ + vT > 0) {
          const item = funcMap.get(f.id)!;
          item.semanas.push({ inicio: '', fim: '', valor: vJ + vT });
          item.totalMes += (vJ + vT);
          item.valorJapa += vJ;
          item.valorTrattoria += vT;
        }
      });
    });

    const result = Array.from(funcMap.values())
      .filter(i => i.totalMes > 0.01)
      .sort((a, b) => b.totalMes - a.totalMes);

    setRateioMensal(result);
    setTotalGeralMes(result.reduce((s, r) => s + r.totalMes, 0));
    setIsLoading(false);
  };

  const mesAnoLabel = format(monthStart, "MMMM 'de' yyyy", { locale: ptBR });

  return (
    <div className="space-y-6">
      {/* Design de Header Original */}
      <div className="bg-card rounded-xl p-4 shadow-card border border-border flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={() => setMonthStart(subMonths(monthStart, 1))}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="text-center min-w-[150px]">
            <p className="text-xs text-muted-foreground font-medium uppercase">Referência</p>
            <p className="text-lg font-bold capitalize">{mesAnoLabel}</p>
          </div>
          <Button variant="outline" size="icon" onClick={() => setMonthStart(addMonths(monthStart, 1))}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-xs text-muted-foreground font-medium uppercase">Total Comissões</p>
            <p className="text-2xl font-bold text-primary">{formatCurrency(totalGeralMes)}</p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        /* Design de Tabela de Colaboradores conforme original */
        <div className="bg-card rounded-xl shadow-card border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-bold">Colaborador</TableHead>
                <TableHead className="font-bold">Setor / Frente</TableHead>
                <TableHead className="text-right text-japa font-bold">Japa</TableHead>
                <TableHead className="text-right text-trattoria font-bold">Trattoria</TableHead>
                <TableHead className="text-right font-bold text-primary">Total Mês</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rateioMensal.map((r) => (
                <TableRow key={r.funcionario.id} className="hover:bg-muted/50 transition-colors">
                  <TableCell>
                    <div className="font-bold text-sm">{r.funcionario.nome}</div>
                    <div className="text-[10px] text-muted-foreground uppercase">{r.semanas.length} períodos ativos</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-[10px] font-bold ${
                      r.funcionario.frente === 'Japa' ? 'border-japa text-japa' :
                      r.funcionario.frente === 'Trattoria' ? 'border-trattoria text-trattoria' :
                      'border-secondary'
                    }`}>
                      {r.funcionario.setor === 'Administrativo' 
                        ? 'CAIXA/ADM' 
                        : `${r.funcionario.setor.toUpperCase()} ${r.funcionario.frente.toUpperCase()}`}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-xs text-japa-foreground font-medium">
                    {r.valorJapa > 0 ? formatCurrency(r.valorJapa) : '-'}
                  </TableCell>
                  <TableCell className="text-right text-xs text-trattoria-foreground font-medium">
                    {r.valorTrattoria > 0 ? formatCurrency(r.valorTrattoria) : '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="font-bold text-primary">{formatCurrency(r.totalMes)}</span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};
