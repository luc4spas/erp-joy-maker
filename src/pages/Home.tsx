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
  total_geral: number;
  comissao_japa: number;
  comissao_trattoria: number;
  pagamentos_japa: Record<string, number> | null;
  pagamentos_trattoria: Record<string, number> | null;
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
  dailySales: { date: string; total: number }[];
  recordCount: number;
}

function aggregatePayments(
  fechamentos: Fechamento[],
  key: 'pagamentos_japa' | 'pagamentos_trattoria'
): Record<string, PaymentMethodData> {
  const result: Record<string, PaymentMethodData> = {};

  fechamentos.forEach(f => {
    const payments = f[key];
    if (payments) {
      Object.entries(payments).forEach(([method, value]) => {
        if (!result[method]) {
          result[method] = { valor: 0, acrescimo: 0, frValor: 0 };
        }
        result[method].frValor += Number(value) || 0;
      });
    }
  });

  return result;
}

const Home = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [summary, setSummary] = useState<SummaryData>({
    faturamentoTotal: 0,
    taxaServicoTotal: 0,
    comissaoTotal: 0,
    despesasTotal: 0,
    saldoLiquido: 0,
    trattoria: {
      restaurante: 'TRATTORIA',
      totalValor: 0,
      totalAcrescimo: 0,
      totalGeral: 0,
      comissaoGarcom: 0,
      porFormaPagamento: {},
    },
    japa: {
      restaurante: 'JAPA',
      totalValor: 0,
      totalAcrescimo: 0,
      totalGeral: 0,
      comissaoGarcom: 0,
      porFormaPagamento: {},
    },
    dailySales: [],
    recordCount: 0,
  });
  const [startDate, setStartDate] = useState<Date>(startOfMonth(new Date()));
  const [endDate, setEndDate] = useState<Date>(endOfMonth(new Date()));
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchSummary();
    }
  }, [user, startDate, endDate]);

  const fetchSummary = async () => {
    setIsLoading(true);
    try {
      const startStr = format(startDate, 'yyyy-MM-dd');
      const endStr = format(endDate, 'yyyy-MM-dd');

      // Fetch fechamentos
      const { data: fechamentosData, error: fechError } = await supabase
        .from('fechamentos')
        .select('*')
        .gte('data', startStr)
        .lte('data', endStr)
        .order('data', { ascending: true });

      if (fechError) throw fechError;

      // Fetch despesas
      const { data: despesasData, error: despError } = await supabase
        .from('despesas')
        .select('*')
        .gte('data', startStr)
        .lte('data', endStr);

      if (despError) throw despError;

      const fechamentos = (fechamentosData || []) as Fechamento[];
      const despesas = (despesasData || []) as Despesa[];

      // Calculate totals
      const faturamentoTotal = fechamentos.reduce((sum, f) => sum + Number(f.total_geral), 0);
      const taxaServicoTotal = fechamentos.reduce((sum, f) => sum + Number(f.japa_taxa) + Number(f.trattoria_taxa), 0);
      const comissaoTotal = fechamentos.reduce((sum, f) => sum + Number(f.comissao_japa) + Number(f.comissao_trattoria), 0);
      const despesasTotal = despesas.reduce((sum, d) => sum + Number(d.valor), 0);
      const saldoLiquido = faturamentoTotal - despesasTotal;

      // Trattoria summary
      const trattoriaTotalValor = fechamentos.reduce((sum, f) => sum + Number(f.trattoria_valor_itens), 0);
      const trattoriaTotalAcrescimo = fechamentos.reduce((sum, f) => sum + Number(f.trattoria_taxa), 0);
      const trattoriaTotalGeral = fechamentos.reduce((sum, f) => sum + Number(f.trattoria_total), 0);
      const trattoriaComissao = fechamentos.reduce((sum, f) => sum + Number(f.comissao_trattoria), 0);
      const trattoriaPagamentos = aggregatePayments(fechamentos, 'pagamentos_trattoria');

      // Japa summary
      const japaTotalValor = fechamentos.reduce((sum, f) => sum + Number(f.japa_valor_itens), 0);
      const japaTotalAcrescimo = fechamentos.reduce((sum, f) => sum + Number(f.japa_taxa), 0);
      const japaTotalGeral = fechamentos.reduce((sum, f) => sum + Number(f.japa_total), 0);
      const japaComissao = fechamentos.reduce((sum, f) => sum + Number(f.comissao_japa), 0);
      const japaPagamentos = aggregatePayments(fechamentos, 'pagamentos_japa');

      const dailySales = fechamentos.map(f => ({
        date: f.data,
        total: Number(f.total_geral),
      }));

      setSummary({
        faturamentoTotal,
        taxaServicoTotal,
        comissaoTotal,
        despesasTotal,
        saldoLiquido,
        trattoria: {
          restaurante: 'TRATTORIA',
          totalValor: trattoriaTotalValor,
          totalAcrescimo: trattoriaTotalAcrescimo,
          totalGeral: trattoriaTotalGeral,
          comissaoGarcom: trattoriaComissao,
          porFormaPagamento: trattoriaPagamentos,
        },
        japa: {
          restaurante: 'JAPA',
          totalValor: japaTotalValor,
          totalAcrescimo: japaTotalAcrescimo,
          totalGeral: japaTotalGeral,
          comissaoGarcom: japaComissao,
          porFormaPagamento: japaPagamentos,
        },
        dailySales,
        recordCount: fechamentos.length,
      });
    } catch (error) {
      console.error('Error fetching summary:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilter = (start: Date, end: Date) => {
    setStartDate(start);
    setEndDate(end);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const restaurantShare = [
    { name: 'Trattoria', value: summary.trattoria.totalGeral },
    { name: 'Japa', value: summary.japa.totalGeral },
  ];

  return (
    <AppLayout title="Visão Geral" subtitle="Dashboard consolidado do período">
      <div className="space-y-6 animate-fade-in">
        {/* Date Filter */}
        <DateRangeFilter
          onFilter={handleFilter}
          initialStartDate={startDate}
          initialEndDate={endDate}
        />

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Period Info */}
            <div className="bg-card rounded-xl p-4 shadow-card border border-border flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                <Calendar className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Período Selecionado</p>
                <p className="text-lg font-semibold text-foreground">
                  {formatDateBR(format(startDate, 'yyyy-MM-dd'))} a {formatDateBR(format(endDate, 'yyyy-MM-dd'))}
                </p>
                <p className="text-xs text-muted-foreground">{summary.recordCount} fechamentos no período</p>
              </div>
            </div>

            {/* Total Consolidado Card */}
            <div className="bg-gradient-to-r from-primary to-primary/80 rounded-2xl p-6 text-primary-foreground shadow-card">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-xl bg-primary-foreground/10 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-primary-foreground/70">Faturamento Total Acumulado</p>
                  <p className="text-3xl font-bold">{formatCurrency(summary.faturamentoTotal)}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-primary-foreground/20">
                <div>
                  <p className="text-xs text-primary-foreground/60">Total Itens</p>
                  <p className="text-lg font-semibold">
                    {formatCurrency(summary.trattoria.totalValor + summary.japa.totalValor)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-primary-foreground/60">Total Taxa Serviço (10%)</p>
                  <p className="text-lg font-semibold">{formatCurrency(summary.taxaServicoTotal)}</p>
                </div>
                <div>
                  <p className="text-xs text-primary-foreground/60 flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    Comissão Total (8%)
                  </p>
                  <p className="text-lg font-semibold">{formatCurrency(summary.comissaoTotal)}</p>
                </div>
                <div>
                  <p className="text-xs text-primary-foreground/60 flex items-center gap-1">
                    <Receipt className="w-3 h-3" />
                    Despesas
                  </p>
                  <p className="text-lg font-semibold">{formatCurrency(summary.despesasTotal)}</p>
                </div>
              </div>
            </div>

            {/* Saldo Líquido Card */}
            <div className="bg-card rounded-xl p-4 shadow-card border border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-success-light flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-success" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Saldo Líquido (Faturamento - Despesas)</p>
                  <p className="text-2xl font-bold text-foreground">{formatCurrency(summary.saldoLiquido)}</p>
                </div>
              </div>
            </div>

            {/* Restaurant Cards */}
            <div className="grid md:grid-cols-2 gap-6">
              <SummaryCard
                restaurante="TRATTORIA"
                totalValor={summary.trattoria.totalValor}
                totalAcrescimo={summary.trattoria.totalAcrescimo}
                totalGeral={summary.trattoria.totalGeral}
                comissaoGarcom={summary.trattoria.comissaoGarcom}
              />
              <SummaryCard
                restaurante="JAPA"
                totalValor={summary.japa.totalValor}
                totalAcrescimo={summary.japa.totalAcrescimo}
                totalGeral={summary.japa.totalGeral}
                comissaoGarcom={summary.japa.comissaoGarcom}
              />
            </div>

            {/* Consolidated Payment Table */}
            <ConsolidatedPaymentTable
              trattoria={summary.trattoria}
              japa={summary.japa}
              title="Consolidado de Pagamentos"
              subtitle="Soma acumulada por método de recebimento no período"
            />

            {/* Charts */}
            <HomeCharts
              dailySales={summary.dailySales}
              restaurantShare={restaurantShare}
            />
          </>
        )}
      </div>
    </AppLayout>
  );
};

export default Home;
