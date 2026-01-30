import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency, DashboardData, RestaurantSummary, PaymentMethodData } from '@/lib/processData';
import { formatDateBR, formatDateLongBR } from '@/lib/dateUtils';
import { Button } from '@/components/ui/button';
import { Utensils, ArrowLeft, Loader2, TrendingUp, Users, Calendar } from 'lucide-react';
import { SummaryCard } from '@/components/SummaryCard';
import { PaymentTable } from '@/components/PaymentTable';
import { WhatsAppButton } from '@/components/WhatsAppButton';

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
  pagamentos_japa: Record<string, number>;
  pagamentos_trattoria: Record<string, number>;
  created_at: string;
}

const FechamentoDetalhes = () => {
  const [fechamento, setFechamento] = useState<Fechamento | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user && id) {
      fetchFechamento();
    }
  }, [user, id]);

  const fetchFechamento = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('fechamentos')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        toast({
          title: "Fechamento não encontrado",
          description: "O registro solicitado não existe.",
          variant: "destructive",
        });
        navigate('/historico');
        return;
      }
      setFechamento(data as Fechamento);
    } catch (error) {
      console.error('Error fetching fechamento:', error);
      toast({
        title: "Erro ao carregar",
        description: "Não foi possível carregar os detalhes do fechamento.",
        variant: "destructive",
      });
      navigate('/historico');
    } finally {
      setIsLoading(false);
    }
  };

  // Convert fechamento to DashboardData format for reusing components
  const convertToDashboardData = (f: Fechamento): DashboardData => {
    const convertPayments = (payments: Record<string, number>): Record<string, PaymentMethodData> => {
      const result: Record<string, PaymentMethodData> = {};
      Object.entries(payments || {}).forEach(([method, value]) => {
        result[method] = { valor: 0, acrescimo: 0, frValor: value };
      });
      return result;
    };

    const trattoria: RestaurantSummary = {
      restaurante: 'TRATTORIA',
      totalValor: Number(f.trattoria_valor_itens) || 0,
      totalAcrescimo: Number(f.trattoria_taxa) || 0,
      totalGeral: Number(f.trattoria_total) || 0,
      comissaoGarcom: Number(f.comissao_trattoria) || 0,
      porFormaPagamento: convertPayments(f.pagamentos_trattoria),
    };

    const japa: RestaurantSummary = {
      restaurante: 'JAPA',
      totalValor: Number(f.japa_valor_itens) || 0,
      totalAcrescimo: Number(f.japa_taxa) || 0,
      totalGeral: Number(f.japa_total) || 0,
      comissaoGarcom: Number(f.comissao_japa) || 0,
      porFormaPagamento: convertPayments(f.pagamentos_japa),
    };

    return {
      trattoria,
      japa,
      rows: [],
      dataRelatorio: f.data,
    };
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!fechamento) {
    return null;
  }

  const dashboardData = convertToDashboardData(fechamento);
  const totalGeral = Number(fechamento.total_geral);
  const totalItens = Number(fechamento.trattoria_valor_itens) + Number(fechamento.japa_valor_itens);
  const totalTaxa = Number(fechamento.trattoria_taxa) + Number(fechamento.japa_taxa);
  const totalComissao = Number(fechamento.comissao_trattoria) + Number(fechamento.comissao_japa);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                <Utensils className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">Detalhes do Fechamento</h1>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar className="w-3 h-3" />
                  {formatDateBR(fechamento.data)}
                </div>
              </div>
            </div>
            <Button variant="outline" onClick={() => navigate('/historico')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="space-y-8 animate-fade-in">
          {/* Total Card */}
          <div className="bg-gradient-to-r from-primary to-primary/80 rounded-2xl p-6 text-primary-foreground shadow-card">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-xl bg-primary-foreground/10 flex items-center justify-center">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-primary-foreground/70">Total Consolidado</p>
                <p className="text-3xl font-bold">{formatCurrency(totalGeral)}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4 border-t border-primary-foreground/20">
              <div>
                <p className="text-xs text-primary-foreground/60">Total Itens</p>
                <p className="text-lg font-semibold">{formatCurrency(totalItens)}</p>
              </div>
              <div>
                <p className="text-xs text-primary-foreground/60">Total Taxa Serviço</p>
                <p className="text-lg font-semibold">{formatCurrency(totalTaxa)}</p>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <p className="text-xs text-primary-foreground/60 flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  Comissão Total (8%)
                </p>
                <p className="text-lg font-semibold">{formatCurrency(totalComissao)}</p>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar className="w-3 h-3" />
                  {formatDateBR(fechamento.data)}
                </div>
            </div>
          </div>

          {/* Action Button */}
          <div className="flex flex-wrap gap-3">
            <WhatsAppButton data={dashboardData} date={formatDateBR(fechamento.data)} />
          </div>

          {/* Restaurant Cards */}
          <div className="grid md:grid-cols-2 gap-6">
            <SummaryCard
              restaurante="TRATTORIA"
              totalValor={dashboardData.trattoria.totalValor}
              totalAcrescimo={dashboardData.trattoria.totalAcrescimo}
              totalGeral={dashboardData.trattoria.totalGeral}
              comissaoGarcom={dashboardData.trattoria.comissaoGarcom}
            />
            <SummaryCard
              restaurante="JAPA"
              totalValor={dashboardData.japa.totalValor}
              totalAcrescimo={dashboardData.japa.totalAcrescimo}
              totalGeral={dashboardData.japa.totalGeral}
              comissaoGarcom={dashboardData.japa.comissaoGarcom}
            />
          </div>

          {/* Payment Details Table */}
          <PaymentTable trattoria={dashboardData.trattoria} japa={dashboardData.japa} />
        </div>
      </main>
    </div>
  );
};

export default FechamentoDetalhes;
