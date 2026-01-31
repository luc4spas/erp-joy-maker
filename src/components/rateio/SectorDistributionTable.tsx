import { formatCurrency } from '@/lib/processData';

interface SectorDistribution {
  setor: string;
  quantidade: number;
  valorPorColaborador: number;
  colorClass: string;
}

interface SectorDistributionTableProps {
  distributions: SectorDistribution[];
}

export function SectorDistributionTable({ distributions }: SectorDistributionTableProps) {
  return (
    <div className="bg-card rounded-xl shadow-card overflow-hidden">
      <div className="bg-primary p-3">
        <div className="grid grid-cols-3 gap-4 text-xs font-semibold text-primary-foreground">
          <span>SETOR</span>
          <span className="text-center">QTD</span>
          <span className="text-right">VALOR/COLAB.</span>
        </div>
      </div>
      <div className="divide-y divide-border">
        {distributions.map((item, index) => (
          <div 
            key={index}
            className={`grid grid-cols-3 gap-4 px-4 py-2.5 ${item.colorClass}`}
          >
            <span className="text-sm font-medium">{item.setor}</span>
            <span className="text-sm font-semibold text-center">{item.quantidade}</span>
            <span className="text-sm font-bold text-right tabular-nums">
              {formatCurrency(item.valorPorColaborador)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
