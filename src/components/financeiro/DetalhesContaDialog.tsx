import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/usePermissions';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Loader2, Paperclip } from 'lucide-react';
import { format } from 'date-fns';
import { formatCurrency } from '@/lib/processData';
import { AnexoUpload } from '@/components/contas-pagar/AnexoUpload';

interface ContaResumo {
  id: string;
  numero_documento: string | null;
  valor_total: number;
  fornecedor_nome?: string | null;
  empresa_nome?: string | null;
  categoria?: string | null;
  nota_fiscal_url: string | null;
  boleto_url: string | null;
}

interface Parcela {
  id: string;
  numero_parcela: number;
  valor_original: number;
  valor_pago: number | null;
  data_vencimento: string;
  data_pagamento: string | null;
  status: 'pendente' | 'pago' | 'atrasado';
  anexo_url: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  contaId: string | null;
  onChanged?: () => void;
}

const statusBadge = (status: string) => {
  const variants: Record<string, string> = {
    pendente: 'bg-yellow-100 text-yellow-800',
    pago: 'bg-green-100 text-green-800',
    atrasado: 'bg-red-100 text-red-800',
  };
  const labels: Record<string, string> = { pendente: 'Pendente', pago: 'Pago', atrasado: 'Atrasado' };
  return <Badge className={variants[status] || ''}>{labels[status] || status}</Badge>;
};

export function DetalhesContaDialog({ open, onOpenChange, contaId, onChanged }: Props) {
  const { toast } = useToast();
  const { hasPermission } = usePermissions();
  const canEdit = hasPermission('contas_pagar', 'edit');

  const [conta, setConta] = useState<ContaResumo | null>(null);
  const [parcelas, setParcelas] = useState<Parcela[]>([]);
  const [loading, setLoading] = useState(false);
  const [paymentDate, setPaymentDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));

  useEffect(() => {
    if (open && contaId) void load(contaId);
    if (!open) { setConta(null); setParcelas([]); }
  }, [open, contaId]);

  const load = async (id: string) => {
    setLoading(true);
    try {
      const [{ data: c }, { data: ps }] = await Promise.all([
        supabase
          .from('contas_pagar')
          .select('id, numero_documento, valor_total, categoria, nota_fiscal_url, boleto_url, fornecedores(nome), empresas(nome)')
          .eq('id', id)
          .single(),
        supabase
          .from('parcelas_pagar')
          .select('*')
          .eq('conta_pagar_id', id)
          .order('numero_parcela'),
      ]);
      if (c) {
        const cc: any = c;
        setConta({
          id: cc.id,
          numero_documento: cc.numero_documento,
          valor_total: cc.valor_total,
          categoria: cc.categoria,
          nota_fiscal_url: cc.nota_fiscal_url,
          boleto_url: cc.boleto_url,
          fornecedor_nome: cc.fornecedores?.nome,
          empresa_nome: cc.empresas?.nome,
        });
      }
      setParcelas((ps as any) || []);
    } finally {
      setLoading(false);
    }
  };

  const updateContaAnexo = async (field: 'nota_fiscal_url' | 'boleto_url', url: string | null) => {
    if (!conta) return;
    const { error } = await supabase.from('contas_pagar').update({ [field]: url }).eq('id', conta.id);
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
      return;
    }
    setConta({ ...conta, [field]: url });
    onChanged?.();
  };

  const updateParcelaAnexo = async (parcelaId: string, url: string | null) => {
    const { error } = await supabase.from('parcelas_pagar').update({ anexo_url: url }).eq('id', parcelaId);
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
      return;
    }
    setParcelas((prev) => prev.map((p) => (p.id === parcelaId ? { ...p, anexo_url: url } : p)));
    onChanged?.();
  };

  const updateParcelaStatus = async (
    parcelaId: string,
    status: 'pendente' | 'pago' | 'atrasado',
    valorPago?: number,
  ) => {
    const updateData: any = { status };
    if (status === 'pago') {
      updateData.data_pagamento = paymentDate;
      if (valorPago !== undefined) updateData.valor_pago = valorPago;
    } else {
      updateData.data_pagamento = null;
      updateData.valor_pago = 0;
    }
    const { error } = await supabase.from('parcelas_pagar').update(updateData).eq('id', parcelaId);
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
      return;
    }
    if (contaId) await load(contaId);
    toast({ title: 'Parcela atualizada!' });
    onChanged?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detalhamento de Pagamentos</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="animate-spin" /></div>
        ) : conta ? (
          <>
            <Card className="mb-4">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Informações do Título</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2 md:grid-cols-2 text-sm">
                <div><span className="text-muted-foreground">Fornecedor:</span> <span className="font-medium">{conta.fornecedor_nome || '-'}</span></div>
                <div><span className="text-muted-foreground">Empresa:</span> <span className="font-medium">{conta.empresa_nome || '-'}</span></div>
                <div><span className="text-muted-foreground">Documento:</span> <span className="font-medium">{conta.numero_documento || '-'}</span></div>
                <div><span className="text-muted-foreground">Categoria:</span> <span className="font-medium">{conta.categoria || '-'}</span></div>
                <div className="md:col-span-2"><span className="text-muted-foreground">Valor total:</span> <span className="font-semibold">{formatCurrency(conta.valor_total)}</span></div>
              </CardContent>
            </Card>

            <Card className="mb-4">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Paperclip className="w-4 h-4" /> Anexos do Título
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <AnexoUpload
                  label="Nota Fiscal"
                  kind="nota-fiscal"
                  ownerId={conta.id}
                  currentUrl={conta.nota_fiscal_url}
                  onChange={(url) => updateContaAnexo('nota_fiscal_url', url)}
                />
                <AnexoUpload
                  label="Boleto"
                  kind="boleto"
                  ownerId={conta.id}
                  currentUrl={conta.boleto_url}
                  onChange={(url) => updateContaAnexo('boleto_url', url)}
                />
              </CardContent>
            </Card>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">#</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data Pagto</TableHead>
                    <TableHead className="text-center">Comprovante</TableHead>
                    {canEdit && <TableHead className="text-center w-[300px]">Baixa de Pagamento</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parcelas.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>{p.numero_parcela}</TableCell>
                      <TableCell>{format(new Date(p.data_vencimento + 'T12:00:00'), 'dd/MM/yyyy')}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(p.valor_original)}</TableCell>
                      <TableCell>{statusBadge(p.status)}</TableCell>
                      <TableCell>{p.data_pagamento ? format(new Date(p.data_pagamento + 'T12:00:00'), 'dd/MM/yyyy') : '-'}</TableCell>
                      <TableCell>
                        <div className="flex justify-center">
                          <AnexoUpload
                            label="Comprovante"
                            kind="comprovante"
                            ownerId={p.id}
                            currentUrl={p.anexo_url}
                            onChange={(url) => updateParcelaAnexo(p.id, url)}
                            compact
                          />
                        </div>
                      </TableCell>
                      {canEdit && (
                        <TableCell>
                          <div className="flex items-center justify-center gap-2">
                            {p.status !== 'pago' ? (
                              <div className="flex items-center gap-2">
                                <Input
                                  type="date"
                                  className="w-[140px] h-9"
                                  defaultValue={format(new Date(), 'yyyy-MM-dd')}
                                  onChange={(e) => setPaymentDate(e.target.value)}
                                />
                                <Button
                                  variant="default"
                                  size="sm"
                                  className="h-9 bg-green-600 hover:bg-green-700 whitespace-nowrap"
                                  onClick={() => updateParcelaStatus(p.id, 'pago', p.valor_original)}
                                >
                                  Pagar
                                </Button>
                              </div>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-9 w-full max-w-[100px]"
                                onClick={() => updateParcelaStatus(p.id, 'pendente')}
                              >
                                Estornar
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        ) : (
          <div className="text-center text-muted-foreground py-8">Nenhum dado.</div>
        )}
      </DialogContent>
    </Dialog>
  );
}