import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/processData';
import { TrendingUp } from 'lucide-react';

interface SectorTotal {
  label: string;
  value: number;
  colorClass: string;
}

interface SectorTotalsSummaryProps {
  totals: SectorTotal[];
}

export function SectorTotalsSummary({ totals }: SectorTotalsSummaryProps) {
  const totalGeral = totals.reduce((sum, t) => sum + t.value, 0);

  return (
    <div className="p-6 rounded-2xl shadow-card bg-commission-light animate-slide-up">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-xl bg-commission/10 flex items-center justify-center">
          <span className="text-2xl">📊</span>
        </div>
        <div>
          <h3 className="text-xl font-bold text-commission-foreground">
            Totalização por Setor
          </h3>
          <p className="text-sm text-muted-foreground">
            Distribuição total: {formatCurrency(totalGeral)}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {totals.map((item, index) => {
          const isJapa = item.label.includes('JAPA');
          const isTrattoria = item.label.includes('TRATTORIA');
          const isAdmin = item.label.includes('CAIXA');
          
          return (
            <div 
              key={index}
              className={cn(
                "flex items-center justify-between p-4 rounded-xl",
                isJapa ? "bg-japa-light" : isTrattoria ? "bg-trattoria-light" : "bg-card/60"
              )}
            >
              <span className={cn(
                "text-sm font-medium",
                isJapa ? "text-japa-foreground" : isTrattoria ? "text-trattoria-foreground" : "text-foreground"
              )}>
                {item.label}
              </span>
              <span className={cn(
                "text-lg font-bold tabular-nums",
                isJapa ? "text-japa" : isTrattoria ? "text-trattoria" : "text-foreground"
              )}>
                {formatCurrency(item.value)}
              </span>
            </div>
          );
        })}

        {/* Total Geral */}
        <div className="flex items-center justify-between p-4 rounded-xl bg-commission/10 mt-4">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-5 h-5 text-commission" />
            <span className="text-sm font-semibold text-commission-foreground">Total Distribuído</span>
          </div>
          <span className="text-xl font-bold text-commission">{formatCurrency(totalGeral)}</span>
        </div>
      </div>
    </div>
  );
}
