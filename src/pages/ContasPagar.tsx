import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { useToast } from '@/hooks/use-toast';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, FileText, Eye, Trash2 } from 'lucide-react';
import { format, addMonths, setDate } from 'date-fns';
import { formatCurrency } from '@/lib/processData';
import { NovoFornecedorDialog } from '@/components/contas-pagar/NovoFornecedorDialog';
import { GerarTituloForm } from '@/components/contas-pagar/GerarTituloForm';
import { ParcelasPreview } from '@/components/contas-pagar/ParcelasPreview';

interface ContaPagar {
  id: string;
  numero_documento: string | null;
  valor_total: number;
  num_parcelas: number;
  categoria: string | null;
  centro_custo: string | null;
  created_at: string;
  fornecedores: { nome: string } | null;
  empresas: { nome: string } | null;
}

interface Parcela {
  id: string;
  numero_parcela: number;
  valor_original: number;
  valor_pago: number | null;
  data_vencimento: string;
  data_pagamento: string | null;
  status: 'pendente' | 'pago' | 'atrasado';
}

export default function ContasPagar() {
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('listagem');
  const [contas, setContas] = useState<ContaPagar[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('todos');
  const [filterFornecedor, setFilterFornecedor] = useState('');
  const [parcelasDialog, setParcelasDialog] = useState(false);
  const [selectedContaParcelas, setSelectedContaParcelas] = useState<Parcela[]>([]);
  const [selectedContaId, setSelectedContaId] = useState<string>('');
  const [paymentDate, setPaymentDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));

  const canCreate = hasPermission('contas_pagar', 'create');
  const canEdit = hasPermission('contas_pagar', 'edit');
  const canDelete = hasPermission('contas_pagar', 'delete');

  const [empresas, setEmpresas] = useState<{ id: string; nome: string }[]>([]);
  const [fornecedores, setFornecedores] = useState<{ id: string; nome: string }[]>([]);
  const [fornecedorDialogOpen, setFornecedorDialogOpen] = useState(false);

  const [formData, setFormData] = useState({
    empresa_id: '', fornecedor_id: '', numero_documento: '', valor_total: '',
    num_parcelas: '1', dia_vencimento: '', categoria: '', centro_custo: '',
  });
  const [generatedParcelas, setGeneratedParcelas] = useState<{ numero: number; valor: number; data_vencimento: string }[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) { fetchContas(); fetchEmpresas(); fetchFornecedores(); }
  }, [user]);

  const fetchContas = async () => {
    setLoading(true);
    const { data } = await supabase.from('contas_pagar')
      .select('*, fornecedores(nome), empresas(nome)')
      .order('created_at', { ascending: false });
    setContas((data as any) || []);
    setLoading(false);
  };

  const fetchEmpresas = async () => {
    const { data } = await supabase.from('empresas').select('id, nome').eq('ativo', true).order('nome');
    setEmpresas(data || []);
  };

  const fetchFornecedores = async () => {
    const { data } = await supabase.from('fornecedores').select('id, nome').eq('ativo', true).order('nome');
    setFornecedores(data || []);
  };

  const handleGenerateParcelas = () => {
    const valorTotal = parseFloat(formData.valor_total.replace(/[^\d.,]/g, '').replace(',', '.'));
    const numParcelas = parseInt(formData.num_parcelas);
    const diaVenc = parseInt(formData.dia_vencimento) || 1;
    if (!valorTotal || !numParcelas || !formData.empresa_id || !formData.fornecedor_id) {
      toast({ title: 'Erro', description: 'Preencha campos obrigatórios.', variant: 'destructive' });
      return;
    }
    const valorParcela = Math.floor((valorTotal / numParcelas) * 100) / 100;
    const resto = Math.round((valorTotal - valorParcela * numParcelas) * 100) / 100;
    const parcelas = Array.from({ length: numParcelas }, (_, i) => {
      const dataVenc = setDate(addMonths(new Date(), i + 1), Math.min(diaVenc, 28));
      return { numero: i + 1, valor: i === 0 ? valorParcela + resto : valorParcela, data_vencimento: format(dataVenc, 'yyyy-MM-dd') };
    });
    setGeneratedParcelas(parcelas);
    setShowPreview(true);
  };

  const handleUpdateParcela = (index: number, field: 'valor' | 'data_vencimento', value: string) => {
    setGeneratedParcelas(prev => {
      const updated = [...prev];
      if (field === 'valor') updated[index] = { ...updated[index], valor: parseFloat(value) || 0 };
      else updated[index] = { ...updated[index], data_vencimento: value };
      return updated;
    });
  };

  const handleSaveTitulo = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const valorTotal = parseFloat(formData.valor_total.replace(/[^\d.,]/g, '').replace(',', '.'));
      const { data: conta, error } = await supabase.from('contas_pagar').insert({
        user_id: user.id, empresa_id: formData.empresa_id, fornecedor_id: formData.fornecedor_id,
        numero_documento: formData.numero_documento || null, valor_total: valorTotal,
        num_parcelas: parseInt(formData.num_parcelas), dia_vencimento: parseInt(formData.dia_vencimento) || null,
        categoria: formData.categoria || null, centro_custo: formData.centro_custo || null,
      }).select().single();
      if (error) throw error;
      const parcelasInsert = generatedParcelas.map(p => ({
        conta_pagar_id: conta.id, user_id: user.id, numero_parcela: p.numero,
        valor_original: p.valor, data_vencimento: p.data_vencimento, status: 'pendente' as const,
      }));
      await supabase.from('parcelas_pagar').insert(parcelasInsert);
      toast({ title: 'Título gerado!' });
      setFormData({ empresa_id: '', fornecedor_id: '', numero_documento: '', valor_total: '', num_parcelas: '1', dia_vencimento: '', categoria: '', centro_custo: '' });
      setGeneratedParcelas([]); setShowPreview(false); setActiveTab('listagem'); fetchContas();
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } finally { setSaving(false); }
  };

  const viewParcelas = async (contaId: string) => {
    const { data } = await supabase.from('parcelas_pagar').select('*').eq('conta_pagar_id', contaId).order('numero_parcela');
    setSelectedContaParcelas((data as any) || []);
    setSelectedContaId(contaId);
    setParcelasDialog(true);
  };

  const updateParcelaStatus = async (parcelaId: string, status: 'pendente' | 'pago' | 'atrasado', valorPago?: number) => {
    const updateData: any = { status };
    if (status === 'pago') {
      updateData.data_pagamento = paymentDate;
      if (valorPago !== undefined) updateData.valor_pago = valorPago;
    } else { updateData.data_pagamento = null; updateData.valor_pago = 0; }
    await supabase.from('parcelas_pagar').update(updateData).eq('id', parcelaId);
    viewParcelas(selectedContaId);
    toast({ title: 'Parcela atualizada!' });
  };

  const deleteConta = async (id: string) => {
    if (!confirm('Excluir esta conta e todas as parcelas?')) return;
    const { error } = await supabase.from('contas_pagar').delete().eq('id', id);
    if (error) toast({ title: 'Erro ao excluir', variant: 'destructive' });
    else { toast({ title: 'Conta excluída!' }); fetchContas(); }
  };

  const statusBadge = (status: string) => {
    const variants: Record<string, string> = { pendente: 'bg-yellow-100 text-yellow-800', pago: 'bg-green-100 text-green-800', atrasado: 'bg-red-100 text-red-800' };
    const labels: Record<string, string> = { pendente: 'Pendente', pago: 'Pago', atrasado: 'Atrasado' };
    return <Badge className={variants[status] || ''}>{labels[status] || status}</Badge>;
  };

  return (
    <AppLayout title="Contas a Pagar" subtitle="Gestão financeira">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="listagem">Listagem</TabsTrigger>
          {canCreate && <TabsTrigger value="novo">Gerar Título</TabsTrigger>}
        </TabsList>

        <TabsContent value="listagem">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row gap-4 items-start justify-between">
                <CardTitle className="text-lg flex items-center gap-2"><FileText className="w-5 h-5" /> Títulos</CardTitle>
                <div className="flex gap-2 flex-wrap">
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      <SelectItem value="pendente">Pendente</SelectItem>
                      <SelectItem value="pago">Pago</SelectItem>
                      <SelectItem value="atrasado">Atrasado</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input placeholder="Fornecedor..." value={filterFornecedor} onChange={e => setFilterFornecedor(e.target.value)} className="w-[200px]" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? <div className="flex justify-center py-12"><Loader2 className="animate-spin" /></div> : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Doc</TableHead>
                      <TableHead>Fornecedor</TableHead>
                      <TableHead>Empresa</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-center">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contas.filter(c => !filterFornecedor || (c.fornecedores?.nome || '').toLowerCase().includes(filterFornecedor.toLowerCase())).map(conta => (
                      <TableRow key={conta.id}>
                        <TableCell className="font-mono text-xs">{conta.numero_documento || '-'}</TableCell>
                        <TableCell>{conta.fornecedores?.nome}</TableCell>
                        <TableCell className="max-w-[120px] truncate">{conta.empresas?.nome}</TableCell>
                        <TableCell className="text-right font-semibold">{formatCurrency(conta.valor_total)}</TableCell>
                        <TableCell className="text-center">
                          <div className="flex justify-center gap-1">
                            <Button variant="ghost" size="sm" onClick={() => viewParcelas(conta.id)}><Eye className="w-4 h-4" /></Button>
                            {canDelete && <Button variant="ghost" size="sm" onClick={() => deleteConta(conta.id)}><Trash2 className="w-4 h-4 text-red-500" /></Button>}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {canCreate && (
          <TabsContent value="novo">
            {!showPreview ? (
              <GerarTituloForm formData={formData} setFormData={setFormData} empresas={empresas} fornecedores={fornecedores} onGenerateParcelas={handleGenerateParcelas} onAddFornecedor={() => setFornecedorDialogOpen(true)} />
            ) : (
              <ParcelasPreview parcelas={generatedParcelas} onUpdateParcela={handleUpdateParcela} onSave={handleSaveTitulo} onBack={() => setShowPreview(false)} saving={saving} />
            )}
          </TabsContent>
        )}
      </Tabs>

      <Dialog open={parcelasDialog} onOpenChange={setParcelasDialog}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Detalhamento de Pagamentos</DialogTitle></DialogHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">#</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Data Pagto</TableHead>
                {canEdit && <TableHead className="text-center w-[300px]">Baixa de Pagamento</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {selectedContaParcelas.map(p => (
                <TableRow key={p.id}>
                  <TableCell>{p.numero_parcela}</TableCell>
                  <TableCell>{format(new Date(p.data_vencimento + 'T12:00:00'), 'dd/MM/yyyy')}</TableCell>
                  <TableCell className="text-right font-medium">{formatCurrency(p.valor_original)}</TableCell>
                  <TableCell>{statusBadge(p.status)}</TableCell>
                  <TableCell>{p.data_pagamento ? format(new Date(p.data_pagamento + 'T12:00:00'), 'dd/MM/yyyy') : '-'}</TableCell>
                  {canEdit && (
                    <TableCell>
                      <div className="flex items-center justify-center gap-2">
                        {p.status !== 'pago' ? (
                          <>
                            <Input 
                              type="date" 
                              className="w-[150px] h-9" 
                              defaultValue={format(new Date(), 'yyyy-MM-dd')}
                              onChange={(e) => setPaymentDate(e.target.value)}
                            />
                            <Button 
                              variant="default" 
                              size="sm" 
                              className="h-9 bg-green-600 hover:bg-green-700"
                              onClick={() => updateParcelaStatus(p.id, 'pago', p.valor_original)}
                            >
                              Pagar
                            </Button>
                          </>
                        ) : (
                          <Button variant="outline" size="sm" onClick={() => updateParcelaStatus(p.id, 'pendente')}>Estornar</Button>
                        )}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>

      <NovoFornecedorDialog open={fornecedorDialogOpen} onOpenChange={setFornecedorDialogOpen} onSaved={() => { fetchFornecedores(); setFornecedorDialogOpen(false); }} />
    </AppLayout>
  );
}
