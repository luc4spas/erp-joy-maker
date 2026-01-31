import { formatCurrency } from '@/lib/processData';
import { DollarSign } from 'lucide-react';

interface CommissionInputSummaryProps {
  comissaoJapa: number;
  comissaoTrattoria: number;
}

export function CommissionInputSummary({ comissaoJapa, comissaoTrattoria }: CommissionInputSummaryProps) {
  const totalGeral = comissaoJapa + comissaoTrattoria;

  return (
    <div className="bg-gradient-to-r from-primary to-primary/80 rounded-2xl p-6 text-primary-foreground shadow-card">
      <div className="flex items-center gap-4 mb-4">
        <div className="w-12 h-12 rounded-xl bg-primary-foreground/10 flex items-center justify-center">
          <DollarSign className="w-6 h-6" />
        </div>
        <div>
          <p className="text-sm font-medium text-primary-foreground/70">Total de Comissão do Período</p>
          <p className="text-3xl font-bold">{formatCurrency(totalGeral)}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-primary-foreground/20">
        <div>
          <p className="text-xs text-primary-foreground/60">Comissão Japa</p>
          <p className="text-lg font-semibold">{formatCurrency(comissaoJapa)}</p>
        </div>
        <div>
          <p className="text-xs text-primary-foreground/60">Comissão Trattoria</p>
          <p className="text-lg font-semibold">{formatCurrency(comissaoTrattoria)}</p>
        </div>
      </div>
    </div>
  );
}
