import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { DashboardData, formatCurrency } from '@/lib/processData';
import { formatDateBR, formatDateLongBR } from '@/lib/dateUtils';
import { SummaryCard } from './SummaryCard';
import { PaymentTable } from './PaymentTable';
import { WhatsAppButton } from './WhatsAppButton';
import { SaveHistoryButton } from './SaveHistoryButton';
import { CashReconciliation } from './CashReconciliation';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, TrendingUp, Users, Calendar, AlertTriangle } from 'lucide-react';

interface DashboardProps {
  data: DashboardData;
  onReset: () => void;
}

interface Despesa {
  id: string;
  descricao: string;
  valor: number;
  categoria: string;
}

export function Dashboard({ data, onReset }: DashboardProps) {
  const { user } = useAuth();
  const [despesas, setDespesas] = useState<Despesa[]>([]);

  const totalGeral = data.trattoria.totalGeral + data.japa.totalGeral + data.hippocampus.totalGeral;
  const totalItens = data.trattoria.totalValor + data.japa.totalValor + data.hippocampus.totalValor;
  const totalTaxa = data.trattoria.totalAcrescimo + data.japa.totalAcrescimo + data.hippocampus.totalAcrescimo;
  const totalComissao = data.trattoria.comissaoGarcom + data.japa.comissaoGarcom + data.hippocampus.comissaoGarcom;

  // Fetch despesas for the report date
  useEffect(() => {
    if (user && data.dataRelatorio) {
      supabase
        .from('despesas')
        .select('id, descricao, valor, categoria')
        .eq('data', data.dataRelatorio)
        .then(({ data: d }) => {
          if (d) setDespesas(d as Despesa[]);
        });
    }
  }, [user, data.dataRelatorio]);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Resumo do Fechamento</h2>
          <p className="text-muted-foreground mt-1">{data.rows.length} transações processadas</p>
        </div>
        <button
          onClick={onReset}
          className="px-4 py-2 text-sm font-medium text-primary bg-secondary hover:bg-secondary/80 rounded-lg transition-colors flex items-center gap-2"
        >
          Novo Upload
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Hippocampus Alert */}
      {data.hasHippocampus && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-hippocampus-light border-2" style={{ borderColor: 'hsl(var(--hippocampus))' }}>
          <AlertTriangle className="w-5 h-5 text-hippocampus shrink-0" />
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className="bg-hippocampus text-white border-0">🐴 Hippocampus Detectado</Badge>
            <span className="text-sm text-hippocampus-foreground font-medium">
              Vendas de domingo entre 11:30 e 18:00 foram atribuídas à unidade Hippocampus.
            </span>
          </div>
        </div>
      )}

      {/* Report Date Card */}
      <div className="bg-card rounded-xl p-4 shadow-card border border-border flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
          <Calendar className="w-5 h-5 text-primary" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Data do Relatório</p>
          <p className="text-lg font-semibold text-foreground">{formatDateLongBR(data.dataRelatorio)}</p>
          {data.dataRelatorio && (
            <p className="text-xs text-muted-foreground">{formatDateBR(data.dataRelatorio)}</p>
          )}
        </div>
      </div>

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
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3">
        <SaveHistoryButton data={data} />
        <WhatsAppButton data={data} />
      </div>

      {/* Restaurant Cards */}
      <div className={`grid gap-6 ${data.hasHippocampus ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
        <SummaryCard
          restaurante="TRATTORIA"
          totalValor={data.trattoria.totalValor}
          totalAcrescimo={data.trattoria.totalAcrescimo}
          totalGeral={data.trattoria.totalGeral}
          comissaoGarcom={data.trattoria.comissaoGarcom}
        />
        <SummaryCard
          restaurante="JAPA"
          totalValor={data.japa.totalValor}
          totalAcrescimo={data.japa.totalAcrescimo}
          totalGeral={data.japa.totalGeral}
          comissaoGarcom={data.japa.comissaoGarcom}
        />
        {data.hasHippocampus && (
          <SummaryCard
            restaurante="HIPPOCAMPUS"
            totalValor={data.hippocampus.totalValor}
            totalAcrescimo={data.hippocampus.totalAcrescimo}
            totalGeral={data.hippocampus.totalGeral}
            comissaoGarcom={data.hippocampus.comissaoGarcom}
          />
        )}
      </div>

      {/* Payment Details Table */}
      <PaymentTable
        trattoria={data.trattoria}
        japa={data.japa}
        hippocampus={data.hasHippocampus ? data.hippocampus : undefined}
      />

      {/* Cash Reconciliation */}
      <CashReconciliation
        totalDinheiro={data.totalDinheiro}
        despesas={despesas}
      />
    </div>
  );
}
