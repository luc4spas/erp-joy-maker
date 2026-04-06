import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { formatCurrency } from '@/lib/processData';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
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

export const RateioMensal = () => {
  const [monthStart, setMonthStart] = useState<Date>(() => startOfMonth(new Date()));
  const [rateioMensal, setRateioMensal] = useState<RateioMensalItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalGeralMes, setTotalGeralMes] = useState(0);

  const { user } = useAuth();

  useEffect(() => {
    if (user) fetchMonthlyData();
  }, [user, monthStart]);

  const fetchMonthlyData = async () => {
    setIsLoading(true);

    const start = startOfMonth(monthStart);
    const end = endOfMonth(monthStart);

    const { data: funcData } = await supabase.from('funcionarios').select('*').eq('ativo', true);
    const { data: fechData } = await supabase.from('fechamentos')
      .select('*')
      .gte('data', format(start, 'yyyy-MM-dd'))
      .lte('data', format(end, 'yyyy-MM-dd'));

    const funcs = funcData || [];
    const fechs = fechData || [];

    if (!funcs.length || !fechs.length) {
      setRateioMensal([]);
      setTotalGeralMes(0);
      setIsLoading(false);
      return;
    }

    // 🔥 SOMA TOTAL DO MÊS (SEM SEMANAS)
    const totalJapa = fechs.reduce((s, f) => s + Number(f.comissao_japa), 0);
    const totalTrat = fechs.reduce((s, f) => s + Number(f.comissao_trattoria), 0);
    const totalComissao = totalJapa + totalTrat;

    const pGarcom = 0.475 / 0.8;
    const pCozinha = 0.275 / 0.8;
    const pAdmin = 0.05 / 0.8;

    const gJapa = funcs.filter(f => f.setor === 'Garçom' && (f.frente === 'Japa' || f.frente === 'Ambas'));
    const gTrat = funcs.filter(f => f.setor === 'Garçom' && (f.frente === 'Trattoria' || f.frente === 'Ambas'));
    const cJapa = funcs.filter(f => f.setor === 'Cozinha' && (f.frente === 'Japa' || f.frente === 'Ambas'));
    const cTrat = funcs.filter(f => f.setor === 'Cozinha' && (f.frente === 'Trattoria' || f.frente === 'Ambas'));
    const admins = funcs.filter(f => f.setor === 'Administrativo');

    const resultado: RateioMensalItem[] = [];

    funcs.forEach(f => {
      let vJ = 0;
      let vT = 0;

      if (f.setor === 'Garçom') {
        if (gJapa.includes(f)) vJ = (totalJapa * pGarcom) / (gJapa.length || 1);
        if (gTrat.includes(f)) vT = (totalTrat * pGarcom) / (gTrat.length || 1);
      }

      if (f.setor === 'Cozinha') {
        if (cJapa.includes(f)) vJ = (totalJapa * pCozinha) / (cJapa.length || 1);
        if (cTrat.includes(f)) vT = (totalTrat * pCozinha) / (cTrat.length || 1);
      }

      if (f.setor === 'Administrativo') {
        const vA = (totalComissao * pAdmin) / (admins.length || 1);
        const proporcao = totalJapa / (totalComissao || 1);
        vJ = vA * proporcao;
        vT = vA * (1 - proporcao);
      }

      const total = vJ + vT;

      if (total > 0.01) {
        resultado.push({
          funcionario: f,
          semanas: [{ inicio: '', fim: '', valor: total }], // mantém UI intacta
          totalMes: total,
          valorJapa: vJ,
          valorTrattoria: vT
        });
      }
    });

    resultado.sort((a, b) => b.totalMes - a.totalMes);

    setRateioMensal(resultado);
    setTotalGeralMes(resultado.reduce((s, r) => s + r.totalMes, 0));
    setIsLoading(false);
  };

  const mesAnoLabel = format(monthStart, "MMMM 'de' yyyy", { locale: ptBR });

  return (
    <div className="space-y-6">
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

        <div className="text-right">
          <p className="text-xs text-muted-foreground font-medium uppercase">Total Comissões</p>
          <p className="text-2xl font-bold text-primary">{formatCurrency(totalGeralMes)}</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="bg-card rounded-xl shadow-card border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Colaborador</TableHead>
                <TableHead>Setor / Frente</TableHead>
                <TableHead className="text-right text-japa">Japa</TableHead>
                <TableHead className="text-right text-trattoria">Trattoria</TableHead>
                <TableHead className="text-right text-primary">Total Mês</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {rateioMensal.map((r) => (
                <TableRow key={r.funcionario.id}>
                  <TableCell>
                    <div className="font-bold text-sm">{r.funcionario.nome}</div>
                    <div className="text-[10px] text-muted-foreground uppercase">
                      {r.semanas.length} período ativo
                    </div>
                  </TableCell>

                  <TableCell>
                    <Badge variant="outline">
                      {r.funcionario.setor === 'Administrativo'
                        ? 'CAIXA/ADM'
                        : `${r.funcionario.setor} ${r.funcionario.frente}`}
                    </Badge>
                  </TableCell>

                  <TableCell className="text-right">
                    {r.valorJapa > 0 ? formatCurrency(r.valorJapa) : '-'}
                  </TableCell>

                  <TableCell className="text-right">
                    {r.valorTrattoria > 0 ? formatCurrency(r.valorTrattoria) : '-'}
                  </TableCell>

                  <TableCell className="text-right font-bold text-primary">
                    {formatCurrency(r.totalMes)}
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
