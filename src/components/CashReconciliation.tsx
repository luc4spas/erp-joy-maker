import { formatCurrency } from '@/lib/processData';
import { Banknote, ArrowDown, ArrowUp, Wallet } from 'lucide-react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';

interface Despesa {
  id: string;
  descricao: string;
  valor: number;
  categoria: string;
}

interface CashReconciliationProps {
  totalDinheiro: number;
  despesas: Despesa[];
}

export function CashReconciliation({ totalDinheiro, despesas }: CashReconciliationProps) {
  const totalDespesas = despesas.reduce((sum, d) => sum + Number(d.valor), 0);
  const valorASerLevado = totalDinheiro - totalDespesas;

  return (
    <div className="space-y-4 animate-slide-up">
      <div className="bg-card rounded-2xl shadow-card overflow-hidden">
        <div className="p-6 border-b border-border">
          <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Wallet className="w-5 h-5" />
            Conferência de Malote
          </h3>
          <p className="text-sm text-muted-foreground mt-1">Conciliação de valores em espécie</p>
        </div>

        <div className="p-6 space-y-4">
          {/* Entradas */}
          <div className="flex items-center justify-between p-4 bg-secondary/50 rounded-xl">
            <div className="flex items-center gap-3">
              <ArrowDown className="w-5 h-5 text-foreground" />
              <span className="text-sm font-medium text-muted-foreground">Entradas em Espécie (Dinheiro PDV)</span>
            </div>
            <span className="text-lg font-bold text-foreground">{formatCurrency(totalDinheiro)}</span>
          </div>

          {/* Saídas */}
          <div className="flex items-center justify-between p-4 bg-secondary/50 rounded-xl">
            <div className="flex items-center gap-3">
              <ArrowUp className="w-5 h-5 text-destructive" />
              <span className="text-sm font-medium text-muted-foreground">Despesas em Espécie</span>
            </div>
            <span className="text-lg font-bold text-destructive">{formatCurrency(totalDespesas)}</span>
          </div>

          {/* Valor a Ser Levado */}
          <div className="flex items-center justify-between p-5 rounded-xl border-2 border-dashed bg-malote-light" style={{ borderColor: 'hsl(var(--malote))' }}>
            <div className="flex items-center gap-3">
              <Banknote className="w-6 h-6 text-malote" />
              <span className="text-base font-bold text-malote-foreground">VALOR A SER LEVADO</span>
            </div>
            <span className="text-2xl font-black text-malote">{formatCurrency(valorASerLevado)}</span>
          </div>
        </div>
      </div>

      {/* Resumo de Saídas */}
      {despesas.length > 0 && (
        <div className="bg-card rounded-2xl shadow-card overflow-hidden">
          <div className="p-6 border-b border-border">
            <h3 className="text-lg font-bold text-foreground">Resumo de Saídas em Espécie</h3>
            <p className="text-sm text-muted-foreground mt-1">Despesas do dia que compõem a subtração</p>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-secondary/50">
                  <TableHead className="font-semibold">Descrição</TableHead>
                  <TableHead className="font-semibold">Categoria</TableHead>
                  <TableHead className="text-right font-semibold">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {despesas.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell>{d.descricao}</TableCell>
                    <TableCell>{d.categoria}</TableCell>
                    <TableCell className="text-right text-destructive font-medium">{formatCurrency(d.valor)}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-secondary/50 font-semibold">
                  <TableCell colSpan={2}>TOTAL SAÍDAS</TableCell>
                  <TableCell className="text-right text-destructive">{formatCurrency(totalDespesas)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}
