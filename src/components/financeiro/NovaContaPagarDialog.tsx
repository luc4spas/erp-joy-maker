import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Paperclip, Upload, Trash2, ExternalLink, Plus } from 'lucide-react';
import { format, addMonths, setDate } from 'date-fns';
import { NovoFornecedorDialog } from '@/components/contas-pagar/NovoFornecedorDialog';

const BUCKET = 'anexos';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved?: () => void;
}

interface ParcelaPreview {
  numero: number;
  valor: number;
  data_vencimento: string;
}

export function NovaContaPagarDialog({ open, onOpenChange, onSaved }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [empresas, setEmpresas] = useState<{ id: string; nome: string }[]>([]);
  const [fornecedores, setFornecedores] = useState<{ id: string; nome: string }[]>([]);
  const [fornecedorDialogOpen, setFornecedorDialogOpen] = useState(false);

  const [form, setForm] = useState({
    empresa_id: '',
    fornecedor_id: '',
    numero_documento: '',
    valor_total: '',
    num_parcelas: '1',
    dia_vencimento: '',
    categoria: '',
    centro_custo: '',
  });

  // Anexos opcionais (selecionados antes de salvar)
  const [notaFiscalFile, setNotaFiscalFile] = useState<File | null>(null);
  const [boletoFile, setBoletoFile] = useState<File | null>(null);

  const [parcelas, setParcelas] = useState<ParcelaPreview[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    void (async () => {
      const [{ data: emps }, { data: forns }] = await Promise.all([
        supabase.from('empresas').select('id, nome').eq('ativo', true).order('nome'),
        supabase.from('fornecedores').select('id, nome').eq('ativo', true).order('nome'),
      ]);
      setEmpresas(emps || []);
      setFornecedores(forns || []);
    })();
  }, [open]);

  const fetchFornecedores = async () => {
    const { data } = await supabase.from('fornecedores').select('id, nome').eq('ativo', true).order('nome');
    setFornecedores(data || []);
  };

  const generate = () => {
    const valorTotal = parseFloat(form.valor_total.replace(/[^\d.,]/g, '').replace(',', '.'));
    const n = parseInt(form.num_parcelas);
    const diaVenc = parseInt(form.dia_vencimento) || 1;
    if (!valorTotal || !n || !form.empresa_id || !form.fornecedor_id) {
      toast({ title: 'Preencha empresa, fornecedor, valor e parcelas.', variant: 'destructive' });
      return;
    }
    const valorParcela = Math.floor((valorTotal / n) * 100) / 100;
    const resto = Math.round((valorTotal - valorParcela * n) * 100) / 100;
    const out = Array.from({ length: n }, (_, i) => {
      const d = setDate(addMonths(new Date(), i + 1), Math.min(diaVenc, 28));
      return {
        numero: i + 1,
        valor: i === 0 ? valorParcela + resto : valorParcela,
        data_vencimento: format(d, 'yyyy-MM-dd'),
      };
    });
    setParcelas(out);
  };

  const updateParcela = (i: number, field: 'valor' | 'data_vencimento', value: string) => {
    setParcelas((prev) => {
      const copy = [...prev];
      if (field === 'valor') copy[i] = { ...copy[i], valor: parseFloat(value) || 0 };
      else copy[i] = { ...copy[i], data_vencimento: value };
      return copy;
    });
  };

  const uploadAnexo = async (file: File, contaId: string, kind: 'nota-fiscal' | 'boleto'): Promise<string | null> => {
    const ext = file.name.split('.').pop() || 'bin';
    const path = `contas-pagar/${kind}/${contaId}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
      upsert: true,
      contentType: file.type,
    });
    if (error) {
      toast({ title: `Erro no upload (${kind})`, description: error.message, variant: 'destructive' });
      return null;
    }
    return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  };

  const handleSave = async () => {
    if (!user) return;
    if (parcelas.length === 0) {
      toast({ title: 'Gere as parcelas antes de salvar.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const valorTotal = parseFloat(form.valor_total.replace(/[^\d.,]/g, '').replace(',', '.'));
      const { data: conta, error } = await supabase.from('contas_pagar').insert({
        user_id: user.id,
        empresa_id: form.empresa_id,
        fornecedor_id: form.fornecedor_id,
        numero_documento: form.numero_documento || null,
        valor_total: valorTotal,
        num_parcelas: parseInt(form.num_parcelas),
        dia_vencimento: parseInt(form.dia_vencimento) || null,
        categoria: form.categoria || null,
        centro_custo: form.centro_custo || null,
      }).select().single();
      if (error) throw error;

      // Upload anexos opcionais
      const updates: Record<string, string> = {};
      if (notaFiscalFile) {
        const url = await uploadAnexo(notaFiscalFile, conta.id, 'nota-fiscal');
        if (url) updates.nota_fiscal_url = url;
      }
      if (boletoFile) {
        const url = await uploadAnexo(boletoFile, conta.id, 'boleto');
        if (url) updates.boleto_url = url;
      }
      if (Object.keys(updates).length > 0) {
        await supabase.from('contas_pagar').update(updates).eq('id', conta.id);
      }

      const inserts = parcelas.map((p) => ({
        conta_pagar_id: conta.id,
        user_id: user.id,
        numero_parcela: p.numero,
        valor_original: p.valor,
        data_vencimento: p.data_vencimento,
        status: 'pendente' as const,
      }));
      await supabase.from('parcelas_pagar').insert(inserts);

      toast({ title: 'Título gerado!' });
      reset();
      onOpenChange(false);
      onSaved?.();
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const reset = () => {
    setForm({
      empresa_id: '', fornecedor_id: '', numero_documento: '', valor_total: '',
      num_parcelas: '1', dia_vencimento: '', categoria: '', centro_custo: '',
    });
    setParcelas([]);
    setNotaFiscalFile(null);
    setBoletoFile(null);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova Conta a Pagar</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 py-2">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>Empresa *</Label>
                <Select value={form.empresa_id} onValueChange={(v) => setForm({ ...form, empresa_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione a empresa" /></SelectTrigger>
                  <SelectContent>
                    {empresas.map((e) => <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Fornecedor *</Label>
                <div className="flex gap-2">
                  <Select value={form.fornecedor_id} onValueChange={(v) => setForm({ ...form, fornecedor_id: v })}>
                    <SelectTrigger className="flex-1"><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {fornecedores.map((f) => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button type="button" variant="outline" size="icon" onClick={() => setFornecedorDialogOpen(true)} title="Novo fornecedor">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div>
                <Label>Nº Documento / NF</Label>
                <Input value={form.numero_documento} onChange={(e) => setForm({ ...form, numero_documento: e.target.value })} placeholder="NF-001234" />
              </div>
              <div>
                <Label>Valor Total *</Label>
                <Input value={form.valor_total} onChange={(e) => setForm({ ...form, valor_total: e.target.value })} placeholder="0,00" />
              </div>
              <div>
                <Label>Qtd Parcelas *</Label>
                <Input type="number" min="1" value={form.num_parcelas} onChange={(e) => setForm({ ...form, num_parcelas: e.target.value })} />
              </div>
              <div>
                <Label>Dia do Vencimento</Label>
                <Input type="number" min="1" max="28" value={form.dia_vencimento} onChange={(e) => setForm({ ...form, dia_vencimento: e.target.value })} />
              </div>
              <div>
                <Label>Categoria</Label>
                <Input value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} />
              </div>
              <div>
                <Label>Centro de Custo</Label>
                <Input value={form.centro_custo} onChange={(e) => setForm({ ...form, centro_custo: e.target.value })} />
              </div>
            </div>

            {/* Anexos opcionais */}
            <Card className="bg-muted/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Paperclip className="w-4 h-4" /> Anexos (opcional)
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-2">
                <FilePicker label="Nota Fiscal" file={notaFiscalFile} onFile={setNotaFiscalFile} />
                <FilePicker label="Boleto" file={boletoFile} onFile={setBoletoFile} />
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button type="button" variant="secondary" onClick={generate}>Gerar Parcelas</Button>
            </div>

            {parcelas.length > 0 && (
              <Card>
                <CardHeader className="pb-3"><CardTitle className="text-sm">Parcelas geradas</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {parcelas.map((p, i) => (
                    <div key={p.numero} className="grid grid-cols-[40px_1fr_1fr] gap-2 items-center">
                      <span className="text-xs text-muted-foreground">#{p.numero}</span>
                      <Input type="date" value={p.data_vencimento} onChange={(e) => updateParcela(i, 'data_vencimento', e.target.value)} />
                      <Input type="number" step="0.01" value={p.valor} onChange={(e) => updateParcela(i, 'valor', e.target.value)} />
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button onClick={handleSave} disabled={saving || parcelas.length === 0}>
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Salvar Título
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <NovoFornecedorDialog open={fornecedorDialogOpen} onOpenChange={setFornecedorDialogOpen} onSaved={() => { fetchFornecedores(); setFornecedorDialogOpen(false); }} />
    </>
  );
}

function FilePicker({
  label,
  file,
  onFile,
}: {
  label: string;
  file: File | null;
  onFile: (f: File | null) => void;
}) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      {file ? (
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs flex-1 truncate" title={file.name}>{file.name}</span>
          <Button type="button" variant="ghost" size="sm" onClick={() => onFile(null)}>
            <Trash2 className="w-4 h-4 text-destructive" />
          </Button>
        </div>
      ) : (
        <label className="flex items-center gap-2 cursor-pointer mt-1 border border-dashed rounded-md px-3 py-2 hover:bg-muted/50 transition">
          <Upload className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Selecionar arquivo</span>
          <input
            type="file"
            accept="application/pdf,image/*"
            className="hidden"
            onChange={(e) => onFile(e.target.files?.[0] || null)}
          />
        </label>
      )}
    </div>
  );
}