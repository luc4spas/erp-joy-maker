import { formatCurrency } from '@/lib/processData';

interface SectorTotal {
  label: string;
  value: number;
  colorClass: string;
}

interface SectorTotalsSummaryProps {
  totals: SectorTotal[];
}

export function SectorTotalsSummary({ totals }: SectorTotalsSummaryProps) {
  return (
    <div className="bg-card rounded-xl shadow-card overflow-hidden">
      <div className="bg-primary p-3">
        <h3 className="text-sm font-semibold text-primary-foreground text-center">
          TOTALIZAÇÃO POR SETOR
        </h3>
      </div>
      <div className="divide-y divide-border">
        {totals.map((item, index) => (
          <div 
            key={index} 
            className={`flex items-center justify-between px-4 py-2.5 ${item.colorClass}`}
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
