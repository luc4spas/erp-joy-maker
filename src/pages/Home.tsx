import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { formatCurrency, RestaurantSummary, PaymentMethodData } from '@/lib/processData';
import { formatDateBR } from '@/lib/dateUtils';
import { AppLayout } from '@/components/AppLayout';
import { DateRangeFilter } from '@/components/DateRangeFilter';
import { HomeCharts } from '@/components/HomeCharts';
import { SummaryCard } from '@/components/SummaryCard';
import { ConsolidatedPaymentTable } from '@/components/ConsolidatedPaymentTable';
import { Loader2, TrendingUp, Users, Calendar, Receipt } from 'lucide-react';
import { startOfMonth, endOfMonth, format } from 'date-fns';

interface Fechamento {
  id: string;
  data: string;
  japa_total: number;
  japa_taxa: number;
  japa_valor_itens: number;
  trattoria_total: number;
  trattoria_taxa: number;
  trattoria_valor_itens: number;
  hippocampus_total: number;
  hippocampus_taxa: number;
  hippocampus_valor_itens: number;
  total_geral: number;
  comissao_japa: number;
  comissao_trattoria: number;
  comissao_hippocampus: number;
  pagamentos_japa: Record<string, number> | null;
  pagamentos_trattoria: Record<string, number> | null;
  pagamentos_hippocampus: Record<string, number> | null;
}

interface Despesa {
  id: string;
  data: string;
  descricao: string;
  valor: number;
  categoria: string;
}

interface SummaryData {
  faturamentoTotal: number;
  taxaServicoTotal: number;
  comissaoTotal: number;
  despesasTotal: number;
  saldoLiquido: number;
  trattoria: RestaurantSummary;
  japa: RestaurantSummary;
  hippocampus: RestaurantSummary;
  hasHippocampus: boolean;
  dailySales: { date: string; total: number }[];
  recordCount: number;
}

function aggregatePayments(
  fechamentos: Fechamento[],
  key: 'pagamentos_japa' | 'pagamentos_trattoria' | 'pagamentos_hippocampus'
): Record<string, PaymentMethodData> {
  const result: Record<string, PaymentMethodData> = {};
  fechamentos.forEach(f => {
    const payments = f[key];
    if (payments) {
      Object.entries(payments).forEach(([method, value]) => {
        if (!result[method]) result[method] = { valor: 0, acrescimo: 0, frValor: 0 };
        result[method].frValor += Number(value) || 0;
      });
    }
  });
  return result;
}

const Home = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [summary, setSummary] = useState<SummaryData>({
    faturamentoTotal: 0, taxaServicoTotal: 0, comissaoTotal: 0, despesasTotal: 0, saldoLiquido: 0,
    trattoria: { restaurante: 'TRATTORIA', totalValor: 0, totalAcrescimo: 0, totalGeral: 0, comissaoGarcom: 0, porFormaPagamento: {} },
    japa: { restaurante: 'JAPA', totalValor: 0, totalAcrescimo: 0, totalGeral: 0, comissaoGarcom: 0, porFormaPagamento: {} },
    hippocampus: { restaurante: 'HIPPOCAMPUS', totalValor: 0, totalAcrescimo: 0, totalGeral: 0, comissaoGarcom: 0, porFormaPagamento: {} },
    hasHippocampus: false,
    dailySales: [], recordCount: 0,
  });
  const [startDate, setStartDate] = useState<Date>(startOfMonth(new Date()));
  const [endDate, setEndDate] = useState<Date>(endOfMonth(new Date()));
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();

  useEffect(() => { if (!authLoading && !user) navigate('/auth'); }, [user, authLoading, navigate]);
  useEffect(() => { if (user) fetchSummary(); }, [user, startDate, endDate]);

  const fetchSummary = async () => {
    setIsLoading(true);
    try {
      const startStr = format(startDate, 'yyyy-MM-dd');
      const endStr = format(endDate, 'yyyy-MM-dd');

      const [{ data: fechamentosData, error: fechError }, { data: despesasData, error: despError }] = await Promise.all([
        supabase.from('fechamentos').select('*').gte('data', startStr).lte('data', endStr).order('data', { ascending: true }),
        supabase.from('despesas').select('*').gte('data', startStr).lte('data', endStr),
      ]);

      if (fechError) throw fechError;
      if (despError) throw despError;

      const fechamentos = (fechamentosData || []) as unknown as Fechamento[];
      const despesas = (despesasData || []) as Despesa[];

      const faturamentoTotal = fechamentos.reduce((sum, f) => sum + Number(f.total_geral), 0);
      const taxaServicoTotal = fechamentos.reduce((sum, f) => sum + Number(f.japa_taxa) + Number(f.trattoria_taxa) + Number(f.hippocampus_taxa || 0), 0);
      const comissaoTotal = fechamentos.reduce((sum, f) => sum + Number(f.comissao_japa) + Number(f.comissao_trattoria) + Number(f.comissao_hippocampus || 0), 0);
      const despesasTotal = despesas.reduce((sum, d) => sum + Number(d.valor), 0);

      const makeRestSummary = (
        restaurante: 'TRATTORIA' | 'JAPA' | 'HIPPOCAMPUS',
        totalKey: 'trattoria_total' | 'japa_total' | 'hippocampus_total',
        valorKey: 'trattoria_valor_itens' | 'japa_valor_itens' | 'hippocampus_valor_itens',
        taxaKey: 'trattoria_taxa' | 'japa_taxa' | 'hippocampus_taxa',
        comissaoKey: 'comissao_trattoria' | 'comissao_japa' | 'comissao_hippocampus',
        pagKey: 'pagamentos_trattoria' | 'pagamentos_japa' | 'pagamentos_hippocampus',
      ): RestaurantSummary => ({
        restaurante,
        totalValor: fechamentos.reduce((s, f) => s + Number((f as any)[valorKey] || 0), 0),
        totalAcrescimo: fechamentos.reduce((s, f) => s + Number((f as any)[taxaKey] || 0), 0),
        totalGeral: fechamentos.reduce((s, f) => s + Number((f as any)[totalKey] || 0), 0),
        comissaoGarcom: fechamentos.reduce((s, f) => s + Number((f as any)[comissaoKey] || 0), 0),
        porFormaPagamento: aggregatePayments(fechamentos, pagKey),
      });

      const trattoria = makeRestSummary('TRATTORIA', 'trattoria_total', 'trattoria_valor_itens', 'trattoria_taxa', 'comissao_trattoria', 'pagamentos_trattoria');
      const japa = makeRestSummary('JAPA', 'japa_total', 'japa_valor_itens', 'japa_taxa', 'comissao_japa', 'pagamentos_japa');
      const hippocampus = makeRestSummary('HIPPOCAMPUS', 'hippocampus_total', 'hippocampus_valor_itens', 'hippocampus_taxa', 'comissao_hippocampus', 'pagamentos_hippocampus');
      const hasHippocampus = hippocampus.totalGeral > 0;

      setSummary({
        faturamentoTotal, taxaServicoTotal, comissaoTotal, despesasTotal,
        saldoLiquido: faturamentoTotal - despesasTotal,
        trattoria, japa, hippocampus, hasHippocampus,
        dailySales: fechamentos.map(f => ({ date: f.data, total: Number(f.total_geral) })),
        recordCount: fechamentos.length,
      });
    } catch (error) {
      console.error('Error fetching summary:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading) return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!user) return null;

  const restaurantShare = [
    { name: 'Trattoria', value: summary.trattoria.totalGeral },
    { name: 'Japa', value: summary.japa.totalGeral },
    { name: 'Hippocampus', value: summary.hippocampus.totalGeral },
  ];

  return (
    <AppLayout title="Visão Geral" subtitle="Dashboard consolidado do período">
      <div className="space-y-6 animate-fade-in">
        <DateRangeFilter onFilter={(s, e) => { setStartDate(s); setEndDate(e); }} initialStartDate={startDate} initialEndDate={endDate} />

        {isLoading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : (
          <>
            <div className="bg-card rounded-xl p-4 shadow-card border border-border flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center"><Calendar className="w-5 h-5 text-primary" /></div>
              <div>
                <p className="text-xs text-muted-foreground">Período Selecionado</p>
                <p className="text-lg font-semibold text-foreground">{formatDateBR(format(startDate, 'yyyy-MM-dd'))} a {formatDateBR(format(endDate, 'yyyy-MM-dd'))}</p>
                <p className="text-xs text-muted-foreground">{summary.recordCount} fechamentos no período</p>
              </div>
            </div>

            <div className="bg-gradient-to-r from-primary to-primary/80 rounded-2xl p-6 text-primary-foreground shadow-card">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-xl bg-primary-foreground/10 flex items-center justify-center"><TrendingUp className="w-6 h-6" /></div>
                <div>
                  <p className="text-sm font-medium text-primary-foreground/70">Faturamento Total Acumulado</p>
                  <p className="text-3xl font-bold">{formatCurrency(summary.faturamentoTotal)}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-primary-foreground/20">
                <div>
                  <p className="text-xs text-primary-foreground/60">Total Itens</p>
                  <p className="text-lg font-semibold">{formatCurrency(summary.trattoria.totalValor + summary.japa.totalValor + summary.hippocampus.totalValor)}</p>
                </div>
                <div>
                  <p className="text-xs text-primary-foreground/60">Total Taxa Serviço (10%)</p>
                  <p className="text-lg font-semibold">{formatCurrency(summary.taxaServicoTotal)}</p>
                </div>
                <div>
                  <p className="text-xs text-primary-foreground/60 flex items-center gap-1"><Users className="w-3 h-3" />Comissão Total (8%)</p>
                  <p className="text-lg font-semibold">{formatCurrency(summary.comissaoTotal)}</p>
                </div>
                <div>
                  <p className="text-xs text-primary-foreground/60 flex items-center gap-1"><Receipt className="w-3 h-3" />Despesas</p>
                  <p className="text-lg font-semibold">{formatCurrency(summary.despesasTotal)}</p>
                </div>
              </div>
            </div>

            <div className="bg-card rounded-xl p-4 shadow-card border border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-success-light flex items-center justify-center"><TrendingUp className="w-5 h-5 text-success" /></div>
                <div>
                  <p className="text-xs text-muted-foreground">Saldo Líquido (Faturamento - Despesas)</p>
                  <p className="text-2xl font-bold text-foreground">{formatCurrency(summary.saldoLiquido)}</p>
                </div>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              <SummaryCard restaurante="TRATTORIA" totalValor={summary.trattoria.totalValor} totalAcrescimo={summary.trattoria.totalAcrescimo} totalGeral={summary.trattoria.totalGeral} comissaoGarcom={summary.trattoria.comissaoGarcom} />
              <SummaryCard restaurante="JAPA" totalValor={summary.japa.totalValor} totalAcrescimo={summary.japa.totalAcrescimo} totalGeral={summary.japa.totalGeral} comissaoGarcom={summary.japa.comissaoGarcom} />
              <SummaryCard restaurante="HIPPOCAMPUS" totalValor={summary.hippocampus.totalValor} totalAcrescimo={summary.hippocampus.totalAcrescimo} totalGeral={summary.hippocampus.totalGeral} comissaoGarcom={summary.hippocampus.comissaoGarcom} />
            </div>

            <ConsolidatedPaymentTable
              trattoria={summary.trattoria} japa={summary.japa}
              hippocampus={summary.hippocampus}
              title="Consolidado de Pagamentos"
              subtitle="Soma acumulada por método de recebimento no período"
            />

            <HomeCharts dailySales={summary.dailySales} restaurantShare={restaurantShare} />
          </>
        )}
      </div>
    </AppLayout>
  );
};

export default Home;
