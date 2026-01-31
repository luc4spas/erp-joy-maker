import { formatCurrency } from '@/lib/processData';

interface CommissionInputSummaryProps {
  comissaoJapa: number;
  comissaoTrattoria: number;
}

export function CommissionInputSummary({ comissaoJapa, comissaoTrattoria }: CommissionInputSummaryProps) {
  return (
    <div className="bg-card rounded-xl shadow-card overflow-hidden">
      <div className="bg-primary p-3">
        <h3 className="text-sm font-semibold text-primary-foreground text-center">
          TOTAL DE COMISSÃO DO PERÍODO
        </h3>
      </div>
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between bg-japa-light rounded-lg px-4 py-3">
          <span className="text-sm font-medium text-japa-foreground">Comissão Japa</span>
          <span className="text-lg font-bold text-japa tabular-nums">
            {formatCurrency(comissaoJapa)}
          </span>
        </div>
        <div className="flex items-center justify-between bg-trattoria-light rounded-lg px-4 py-3">
          <span className="text-sm font-medium text-trattoria-foreground">Comissão Trattoria</span>
          <span className="text-lg font-bold text-trattoria tabular-nums">
            {formatCurrency(comissaoTrattoria)}
          </span>
        </div>
      </div>
    </div>
  );
}
