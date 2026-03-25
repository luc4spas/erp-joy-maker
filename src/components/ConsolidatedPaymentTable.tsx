import { formatCurrency, RestaurantSummary, PaymentMethodData } from '@/lib/processData';
import { cn } from '@/lib/utils';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';

interface ConsolidatedPaymentTableProps {
  trattoria: RestaurantSummary;
  japa: RestaurantSummary;
  hippocampus?: RestaurantSummary;
  title?: string;
  subtitle?: string;
}

export function ConsolidatedPaymentTable({
  trattoria, japa, hippocampus,
  title = "Consolidado de Pagamentos",
  subtitle = "Soma acumulada por método de recebimento"
}: ConsolidatedPaymentTableProps) {
  const summaries = [trattoria, japa];
  const showHippo = hippocampus && hippocampus.totalGeral > 0;
  if (showHippo) summaries.push(hippocampus);

  const allMethods = new Set<string>();
  summaries.forEach(s => Object.keys(s.porFormaPagamento).forEach(m => allMethods.add(m)));
  const sortedMethods = Array.from(allMethods).sort();

  const getVal = (s: RestaurantSummary, method: string) =>
    s.porFormaPagamento[method]?.frValor || 0;

  if (sortedMethods.length === 0) {
    return (
      <div className="bg-card rounded-2xl shadow-card p-6 text-center">
        <p className="text-muted-foreground">Nenhum dado de pagamento disponível</p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-2xl shadow-card overflow-hidden animate-slide-up">
      <div className="p-6 border-b border-border">
        <h3 className="text-xl font-bold text-foreground">{title}</h3>
        <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-secondary/50">
              <TableHead className="font-semibold">Forma de Pagamento</TableHead>
              <TableHead className="text-right font-semibold">
                <span className="inline-flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-trattoria" />TRATTORIA
                </span>
              </TableHead>
              <TableHead className="text-right font-semibold">
                <span className="inline-flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-japa" />JAPA
                </span>
              </TableHead>
              {showHippo && (
                <TableHead className="text-right font-semibold">
                  <span className="inline-flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-hippocampus" />HIPPOCAMPUS
                  </span>
                </TableHead>
              )}
              <TableHead className="text-right font-semibold">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedMethods.map((method) => {
              const tVal = getVal(trattoria, method);
              const jVal = getVal(japa, method);
              const hVal = showHippo ? getVal(hippocampus!, method) : 0;
              const total = tVal + jVal + hVal;

              return (
                <TableRow key={method} className="hover:bg-secondary/30 transition-colors">
                  <TableCell className="font-medium">{method}</TableCell>
                  <TableCell className={cn("text-right", tVal !== 0 ? "text-trattoria-foreground" : "text-muted-foreground")}>{formatCurrency(tVal)}</TableCell>
                  <TableCell className={cn("text-right", jVal !== 0 ? "text-japa-foreground" : "text-muted-foreground")}>{formatCurrency(jVal)}</TableCell>
                  {showHippo && (
                    <TableCell className={cn("text-right", hVal !== 0 ? "text-hippocampus-foreground" : "text-muted-foreground")}>{formatCurrency(hVal)}</TableCell>
                  )}
                  <TableCell className="text-right font-semibold">{formatCurrency(total)}</TableCell>
                </TableRow>
              );
            })}
            <TableRow className="bg-secondary/50 font-semibold">
              <TableCell>TOTAL</TableCell>
              <TableCell className="text-right text-trattoria-foreground">{formatCurrency(trattoria.totalGeral)}</TableCell>
              <TableCell className="text-right text-japa-foreground">{formatCurrency(japa.totalGeral)}</TableCell>
              {showHippo && (
                <TableCell className="text-right text-hippocampus-foreground">{formatCurrency(hippocampus!.totalGeral)}</TableCell>
              )}
              <TableCell className="text-right">
                {formatCurrency(trattoria.totalGeral + japa.totalGeral + (showHippo ? hippocampus!.totalGeral : 0))}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
