import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/processData';
import { TrendingUp, Receipt, Percent, Users } from 'lucide-react';

interface SummaryCardProps {
  restaurante: 'TRATTORIA' | 'JAPA';
  totalValor: number;
  totalAcrescimo: number;
  totalGeral: number;
  comissaoGarcom: number;
}

export function SummaryCard({ restaurante, totalValor, totalAcrescimo, totalGeral, comissaoGarcom }: SummaryCardProps) {
  const isTrattoria = restaurante === 'TRATTORIA';

  return (
    <div className={cn(
      "p-6 rounded-2xl shadow-card hover:shadow-card-hover transition-all duration-300 animate-slide-up",
      isTrattoria ? "bg-trattoria-light" : "bg-japa-light"
    )}>
      <div className="flex items-center gap-3 mb-6">
        <div className={cn(
          "w-12 h-12 rounded-xl flex items-center justify-center",
          isTrattoria ? "bg-trattoria/10" : "bg-japa/10"
        )}>
          <span className="text-2xl">{isTrattoria ? '🍝' : '🍣'}</span>
        </div>
        <div>
          <h3 className={cn(
            "text-xl font-bold",
            isTrattoria ? "text-trattoria-foreground" : "text-japa-foreground"
          )}>
            {restaurante}
          </h3>
          <p className="text-sm text-muted-foreground">
            {isTrattoria ? 'Mesas 1-299' : 'Mesas 300+'}
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 bg-card/60 rounded-xl">
          <div className="flex items-center gap-3">
            <Receipt className={cn(
              "w-5 h-5",
              isTrattoria ? "text-trattoria" : "text-japa"
            )} />
            <span className="text-sm font-medium text-muted-foreground">Total Itens</span>
          </div>
          <span className="text-lg font-bold text-foreground">{formatCurrency(totalValor)}</span>
        </div>

        <div className="flex items-center justify-between p-4 bg-card/60 rounded-xl">
          <div className="flex items-center gap-3">
            <Percent className={cn(
              "w-5 h-5",
              isTrattoria ? "text-trattoria" : "text-japa"
            )} />
            <span className="text-sm font-medium text-muted-foreground">Taxa de Serviço</span>
          </div>
          <span className="text-lg font-bold text-foreground">{formatCurrency(totalAcrescimo)}</span>
        </div>

        {/* Comissão Garçom 8% */}
        <div className="flex items-center justify-between p-4 bg-commission-light rounded-xl">
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-commission" />
            <span className="text-sm font-medium text-commission-foreground">Comissão Garçom (8%)</span>
          </div>
          <span className="text-lg font-bold text-commission-foreground">{formatCurrency(comissaoGarcom)}</span>
        </div>

        <div className={cn(
          "flex items-center justify-between p-4 rounded-xl",
          isTrattoria ? "bg-trattoria/10" : "bg-japa/10"
        )}>
          <div className="flex items-center gap-3">
            <TrendingUp className={cn(
              "w-5 h-5",
              isTrattoria ? "text-trattoria" : "text-japa"
            )} />
            <span className={cn(
              "text-sm font-semibold",
              isTrattoria ? "text-trattoria-foreground" : "text-japa-foreground"
            )}>Total Geral</span>
          </div>
          <span className={cn(
            "text-xl font-bold",
            isTrattoria ? "text-trattoria" : "text-japa"
          )}>{formatCurrency(totalGeral)}</span>
        </div>
      </div>
    </div>
  );
}
