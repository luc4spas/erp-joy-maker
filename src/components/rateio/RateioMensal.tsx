import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { formatCurrency } from '@/lib/processData';
import { formatDateBR } from '@/lib/dateUtils';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, ChevronLeft, ChevronRight, Calendar, Printer, DollarSign, Users } from 'lucide-react';
import { format, startOfMonth, endOfMonth, addMonths, subMonths, addDays, isBefore, isAfter, startOfDay } from 'date-fns';
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
    
    // Define limites estritos do mês
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

    // Geração das fatias de semanas dentro do mês (ex: 01 a 07, 08 a 14...)
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

    // Percentuais oficiais
    const pGarcom = 0.475 / 0.8;
    const pCozinha = 0.275 / 0.8;
    const pAdmin = 0.05 / 0.8;

    colunasSemanas.forEach(semana => {
      const fechsDaSemana = fechs.filter(f => {
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

        const totalSemana = vJ + vT;
        if (totalSemana > 0) {
          const item = funcMap.get(f.id)!;
          item.semanas.push({ 
            inicio: format(semana.inicio, 'dd/MM'), 
            fim: format(semana.fim, 'dd/MM'), 
            valor: totalSemana 
          });
          item.totalMes += totalSemana;
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
    <div className="space-y-6 animate-fade-in">
      {/* Header com Navegação */}
      <div className="bg-card rounded-xl p-4 shadow-card border border-border flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={() => setMonthStart(subMonths(monthStart, 1))}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="flex flex-col items-center min-w-[140px]">
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Referência</span>
            <span className="text-lg font-bold text-primary capitalize">{mesAnoLabel}</span>
          </div>
          <Button variant="outline" size="icon" onClick={() => setMonthStart(addMonths(monthStart, 1))}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-[10px] uppercase font-bold text-muted-foreground">Total do Mês</p>
            <p className="text-2xl font-black text-primary">{formatCurrency(totalGeralMes)}</p>
          </div>
          <Button variant="outline" size="icon" className="rounded-full">
            <Printer className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <p className="text-muted-foreground animate-pulse">Calculando rateio mensal...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rateioMensal.map((r) => (
            <div key={r.funcionario.id} className="bg-card rounded-xl p-5 shadow-card border border-border hover:border-primary/30 transition-all group">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-bold text-foreground group-hover:text-primary transition-colors">{r.funcionario.nome}</h3>
                  <Badge variant="secondary" className={`mt-1 text-[9px] font-bold ${
                    r.funcionario.frente === 'Japa' ? 'bg-japa-light text-japa-foreground' :
                    r.funcionario.frente === 'Trattoria' ? 'bg-trattoria-light text-trattoria-foreground' :
                    'bg-secondary'
                  }`}>
                    {r.funcionario.setor === 'Administrativo' 
                      ? 'CAIXA/ADM' 
                      : `${r.funcionario.setor.toUpperCase()} ${r.funcionario.frente.toUpperCase()}`}
                  </Badge>
                </div>
                <p className="text-xl font-black text-primary">{formatCurrency(r.totalMes)}</p>
              </div>

              <div className="grid grid-cols-2 gap-2 mb-4">
                <div className="bg-japa-light/30 rounded-lg p-2 border border-japa/10">
                  <p className="text-[9px] uppercase font-bold text-japa-foreground/60">Japa</p>
                  <p className="text-xs font-bold text-japa-foreground">{formatCurrency(r.valorJapa)}</p>
                </div>
                <div className="bg-trattoria-light/30 rounded-lg p-2 border border-trattoria/10">
                  <p className="text-[9px] uppercase font-bold text-trattoria-foreground/60">Trattoria</p>
                  <p className="text-xs font-bold text-trattoria-foreground">{formatCurrency(r.valorTrattoria)}</p>
                </div>
              </div>

              <div className="space-y-1.5">
                <p className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> Detalhamento Semanal
                </p>
                {r.semanas.map((s, idx) => (
                  <div key={idx} className="flex justify-between text-xs py-1 border-b border-border/50 last:border-0">
                    <span className="text-muted-foreground">{s.inicio} a {s.fim}</span>
                    <span className="font-medium">{formatCurrency(s.valor)}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
