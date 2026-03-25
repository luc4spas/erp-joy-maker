import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/processData';
import { TrendingUp, Receipt, Percent, Users } from 'lucide-react';

interface SummaryCardProps {
  restaurante: 'TRATTORIA' | 'JAPA' | 'HIPPOCAMPUS';
  totalValor: number;
  totalAcrescimo: number;
  totalGeral: number;
  comissaoGarcom: number;
}

const config = {
  TRATTORIA: { emoji: '🍝', label: 'Mesas 1-299', bgLight: 'bg-trattoria-light', bgAccent: 'bg-trattoria/10', textMain: 'text-trattoria', textFg: 'text-trattoria-foreground' },
  JAPA: { emoji: '🍣', label: 'Mesas 300+', bgLight: 'bg-japa-light', bgAccent: 'bg-japa/10', textMain: 'text-japa', textFg: 'text-japa-foreground' },
  HIPPOCAMPUS: { emoji: '🐴', label: 'Domingo 11:30-18:00', bgLight: 'bg-hippocampus-light', bgAccent: 'bg-hippocampus/10', textMain: 'text-hippocampus', textFg: 'text-hippocampus-foreground' },
};

export function SummaryCard({ restaurante, totalValor, totalAcrescimo, totalGeral, comissaoGarcom }: SummaryCardProps) {
  const c = config[restaurante];

  return (
    <div className={cn("p-6 rounded-2xl shadow-card hover:shadow-card-hover transition-all duration-300 animate-slide-up", c.bgLight)}>
      <div className="flex items-center gap-3 mb-6">
        <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", c.bgAccent)}>
          <span className="text-2xl">{c.emoji}</span>
        </div>
        <div>
          <h3 className={cn("text-xl font-bold", c.textFg)}>{restaurante}</h3>
          <p className="text-sm text-muted-foreground">{c.label}</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 bg-card/60 rounded-xl">
          <div className="flex items-center gap-3">
            <Receipt className={cn("w-5 h-5", c.textMain)} />
            <span className="text-sm font-medium text-muted-foreground">Total Itens</span>
          </div>
          <span className="text-lg font-bold text-foreground">{formatCurrency(totalValor)}</span>
        </div>

        <div className="flex items-center justify-between p-4 bg-card/60 rounded-xl">
          <div className="flex items-center gap-3">
            <Percent className={cn("w-5 h-5", c.textMain)} />
            <span className="text-sm font-medium text-muted-foreground">Taxa de Serviço</span>
          </div>
          <span className="text-lg font-bold text-foreground">{formatCurrency(totalAcrescimo)}</span>
        </div>

        <div className="flex items-center justify-between p-4 bg-commission-light rounded-xl">
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-commission" />
            <span className="text-sm font-medium text-commission-foreground">Comissão Garçom (8%)</span>
          </div>
          <span className="text-lg font-bold text-commission-foreground">{formatCurrency(comissaoGarcom)}</span>
        </div>

        <div className={cn("flex items-center justify-between p-4 rounded-xl", c.bgAccent)}>
          <div className="flex items-center gap-3">
            <TrendingUp className={cn("w-5 h-5", c.textMain)} />
            <span className={cn("text-sm font-semibold", c.textFg)}>Total Geral</span>
          </div>
          <span className={cn("text-xl font-bold", c.textMain)}>{formatCurrency(totalGeral)}</span>
        </div>
      </div>
    </div>
  );
}
