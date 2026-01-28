import { DashboardData, formatCurrency } from '@/lib/processData';
import { formatDateBR, formatDateLongBR } from '@/lib/dateUtils';
import { SummaryCard } from './SummaryCard';
import { PaymentTable } from './PaymentTable';
import { WhatsAppButton } from './WhatsAppButton';
import { SaveHistoryButton } from './SaveHistoryButton';
import { ArrowRight, TrendingUp, Users, Calendar } from 'lucide-react';

interface DashboardProps {
  data: DashboardData;
  onReset: () => void;
}

export function Dashboard({ data, onReset }: DashboardProps) {
  const totalGeral = data.trattoria.totalGeral + data.japa.totalGeral;
  const totalItens = data.trattoria.totalValor + data.japa.totalValor;
  const totalTaxa = data.trattoria.totalAcrescimo + data.japa.totalAcrescimo;
  const totalComissao = data.trattoria.comissaoGarcom + data.japa.comissaoGarcom;

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
      <div className="grid md:grid-cols-2 gap-6">
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
      </div>

      {/* Payment Details Table */}
      <PaymentTable trattoria={data.trattoria} japa={data.japa} />
    </div>
  );
}
