import { formatCurrency, RestaurantSummary } from '@/lib/processData';
import { cn } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface PaymentTableProps {
  trattoria: RestaurantSummary;
  japa: RestaurantSummary;
}

export function PaymentTable({ trattoria, japa }: PaymentTableProps) {
  // Get all unique payment methods (TROCO já foi removido no processData)
  const allMethods = new Set([
    ...Object.keys(trattoria.porFormaPagamento),
    ...Object.keys(japa.porFormaPagamento),
  ]);

  const sortedMethods = Array.from(allMethods).sort();

  const getMethodData = (summary: RestaurantSummary, method: string) => {
    return summary.porFormaPagamento[method] || { valor: 0, acrescimo: 0, frValor: 0 };
  };

  return (
    <div className="bg-card rounded-2xl shadow-card overflow-hidden animate-slide-up">
      <div className="p-6 border-b border-border">
        <h3 className="text-xl font-bold text-foreground">Detalhamento por Forma de Pagamento</h3>
        <p className="text-sm text-muted-foreground mt-1">Comparativo entre os restaurantes</p>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-secondary/50">
              <TableHead className="font-semibold">Forma de Pagamento</TableHead>
              <TableHead className="text-right font-semibold">
                <span className="inline-flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-trattoria" />
                  TRATTORIA
                </span>
              </TableHead>
              <TableHead className="text-right font-semibold">
                <span className="inline-flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-japa" />
                  JAPA
                </span>
              </TableHead>
              <TableHead className="text-right font-semibold">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedMethods.map((method) => {
              const trattoriaData = getMethodData(trattoria, method);
              const japaData = getMethodData(japa, method);
              const total = trattoriaData.frValor + japaData.frValor;

              return (
                <TableRow key={method} className="hover:bg-secondary/30 transition-colors">
                  <TableCell className="font-medium">{method}</TableCell>
                  <TableCell className={cn(
                    "text-right",
                    trattoriaData.frValor > 0 ? "text-trattoria-foreground" : "text-muted-foreground"
                  )}>
                    {formatCurrency(trattoriaData.frValor)}
                  </TableCell>
                  <TableCell className={cn(
                    "text-right",
                    japaData.frValor > 0 ? "text-japa-foreground" : "text-muted-foreground"
                  )}>
                    {formatCurrency(japaData.frValor)}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatCurrency(total)}
                  </TableCell>
                </TableRow>
              );
            })}

            {/* Totals Row */}
            <TableRow className="bg-secondary/50 font-semibold">
              <TableCell>TOTAL</TableCell>
              <TableCell className="text-right text-trattoria-foreground">
                {formatCurrency(trattoria.totalGeral)}
              </TableCell>
              <TableCell className="text-right text-japa-foreground">
                {formatCurrency(japa.totalGeral)}
              </TableCell>
              <TableCell className="text-right">
                {formatCurrency(trattoria.totalGeral + japa.totalGeral)}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
