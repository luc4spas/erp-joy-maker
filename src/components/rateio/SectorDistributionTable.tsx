import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/processData';
import { Users } from 'lucide-react';

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
  const totalColaboradores = distributions.reduce((sum, d) => sum + d.quantidade, 0);

  return (
    <div className="p-6 rounded-2xl shadow-card bg-secondary animate-slide-up">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
          <span className="text-2xl">👥</span>
        </div>
        <div>
          <h3 className="text-xl font-bold text-foreground">
            Distribuição por Setor
          </h3>
          <p className="text-sm text-muted-foreground">
            {totalColaboradores} colaboradores ativos
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {distributions.map((item, index) => {
          const isJapa = item.setor.includes('JAPA');
          const isTrattoria = item.setor.includes('TRATTORIA');
          
          return (
            <div 
              key={index}
              className={cn(
                "p-4 rounded-xl",
                isJapa ? "bg-japa-light" : isTrattoria ? "bg-trattoria-light" : "bg-card/60"
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={cn(
                  "text-sm font-medium",
                  isJapa ? "text-japa-foreground" : isTrattoria ? "text-trattoria-foreground" : "text-foreground"
                )}>
                  {item.setor}
                </span>
                <span className={cn(
                  "text-lg font-bold tabular-nums",
                  isJapa ? "text-japa" : isTrattoria ? "text-trattoria" : "text-foreground"
                )}>
                  {formatCurrency(item.valorPorColaborador)}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Users className="w-3 h-3" />
                <span>{item.quantidade} {item.quantidade === 1 ? 'colaborador' : 'colaboradores'}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
