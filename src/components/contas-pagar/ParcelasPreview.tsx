import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Loader2, Save } from 'lucide-react';
import { formatCurrency } from '@/lib/processData';

interface ParcelaPreview {
  numero: number;
  valor: number;
  data_vencimento: string;
}

interface Props {
  parcelas: ParcelaPreview[];
  onUpdateParcela: (index: number, field: 'valor' | 'data_vencimento', value: string) => void;
  onSave: () => void;
  onBack: () => void;
  saving: boolean;
}

export function ParcelasPreview({ parcelas, onUpdateParcela, onSave, onBack, saving }: Props) {
  const total = parcelas.reduce((sum, p) => sum + p.valor, 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Preview das Parcelas</CardTitle>
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">#</TableHead>
                <TableHead>Data Vencimento</TableHead>
                <TableHead>Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {parcelas.map((p, i) => (
                <TableRow key={i}>
                  <TableCell className="font-semibold">{p.numero}</TableCell>
                  <TableCell>
                    <Input
                      type="date"
                      value={p.data_vencimento}
                      onChange={e => onUpdateParcela(i, 'data_vencimento', e.target.value)}
                      className="w-[180px]"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      step="0.01"
                      value={p.valor}
                      onChange={e => onUpdateParcela(i, 'valor', e.target.value)}
                      className="w-[150px]"
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="mt-4 flex items-center justify-between border-t pt-4">
          <div className="text-lg font-bold">
            Total: {formatCurrency(total)}
          </div>
          <Button onClick={onSave} disabled={saving} size="lg">
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Salvar Título
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
