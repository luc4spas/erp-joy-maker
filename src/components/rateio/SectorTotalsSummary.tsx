import { formatCurrency } from '@/lib/processData';
import { PieChart } from 'lucide-react';

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
    <div className="bg-card rounded-xl shadow-card border border-border overflow-hidden">
      <div className="p-4 border-b border-border flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
          <PieChart className="w-5 h-5 text-primary" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Totalização por Setor</p>
          <p className="text-lg font-semibold text-foreground">{formatCurrency(totalGeral)}</p>
        </div>
      </div>
      <div className="divide-y divide-border">
        {totals.map((item, index) => (
          <div 
            key={index} 
            className={`flex items-center justify-between px-4 py-3 ${item.colorClass}`}
          >
            <span className="text-sm font-medium">{item.label}</span>
            <span className="text-sm font-bold tabular-nums">
              {formatCurrency(item.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
