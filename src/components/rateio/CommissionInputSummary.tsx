import { formatCurrency } from '@/lib/processData';
import { DollarSign } from 'lucide-react';

interface CommissionInputSummaryProps {
  comissaoJapa: number;
  comissaoTrattoria: number;
  totalTaxaServico: number;
}

export function CommissionInputSummary({ comissaoJapa, comissaoTrattoria, totalTaxaServico }: CommissionInputSummaryProps) {
  const totalColaboradores = comissaoJapa + comissaoTrattoria;

  return (
    <div className="bg-gradient-to-r from-primary to-primary/80 rounded-2xl p-6 text-primary-foreground shadow-card">
      <div className="flex items-center gap-4 mb-4">
        <div className="w-12 h-12 rounded-xl bg-primary-foreground/10 flex items-center justify-center">
          <DollarSign className="w-6 h-6" />
        </div>
        <div>
          <p className="text-sm font-medium text-primary-foreground/70">Taxa de Serviço Total (10%)</p>
          <p className="text-3xl font-bold">{formatCurrency(totalTaxaServico)}</p>
        </div>
      </div>

      <div className="space-y-3 pt-4 border-t border-primary-foreground/20">
        <div className="flex justify-between items-center">
          <p className="text-sm text-primary-foreground/70">Comissão Colaboradores (8%)</p>
          <p className="text-lg font-semibold">{formatCurrency(totalColaboradores)}</p>
        </div>
        
        <div className="grid grid-cols-2 gap-4 pt-2">
          <div>
            <p className="text-xs text-primary-foreground/60">Japa</p>
            <p className="text-base font-semibold">{formatCurrency(comissaoJapa)}</p>
          </div>
          <div>
            <p className="text-xs text-primary-foreground/60">Trattoria</p>
            <p className="text-base font-semibold">{formatCurrency(comissaoTrattoria)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
