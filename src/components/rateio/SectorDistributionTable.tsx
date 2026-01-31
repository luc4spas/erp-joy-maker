import { formatCurrency } from '@/lib/processData';
import { Users } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

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
    <div className="bg-card rounded-xl shadow-card border border-border overflow-hidden">
      <div className="p-4 border-b border-border flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
          <Users className="w-5 h-5 text-primary" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Distribuição por Setor</p>
          <p className="text-lg font-semibold text-foreground">{totalColaboradores} colaboradores</p>
        </div>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-xs">Setor</TableHead>
            <TableHead className="text-xs text-center">Qtd</TableHead>
            <TableHead className="text-xs text-right">Valor/Colab.</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {distributions.map((item, index) => (
            <TableRow key={index} className={item.colorClass}>
              <TableCell className="text-sm font-medium py-2">{item.setor}</TableCell>
              <TableCell className="text-sm text-center py-2">{item.quantidade}</TableCell>
              <TableCell className="text-sm font-bold text-right tabular-nums py-2">
                {formatCurrency(item.valorPorColaborador)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
