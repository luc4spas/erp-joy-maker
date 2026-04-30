import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Loader2, Paperclip, Upload, Trash2 } from 'lucide-react';
import { format, addMonths, setDate } from 'date-fns';
import { GerarTituloForm } from '@/components/contas-pagar/GerarTituloForm';
import { ParcelasPreview } from '@/components/contas-pagar/ParcelasPreview';
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

const initialForm = {
  empresa_id: '',
  fornecedor_id: '',
  numero_documento: '',
  valor_total: '',
  num_parcelas: '1',
  dia_vencimento: '',
  categoria: '',
  centro_custo: '',
};

export function NovaContaPagarDialog({ open, onOpenChange, onSaved }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [empresas, setEmpresas] = useState<{ id: string; nome: string }[]>([]);
  const [fornecedores, setFornecedores] = useState<{ id: string; nome: string }[]>([]);
  const [fornecedorDialogOpen, setFornecedorDialogOpen] = useState(false);

  const [formData, setFormData] = useState(initialForm);
  const [generatedParcelas, setGeneratedParcelas] = useState<ParcelaPreview[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [saving, setSaving] = useState(false);

  // Anexos opcionais
  const [notaFiscalFile, setNotaFiscalFile] = useState<File | null>(null);
  const [boletoFile, setBoletoFile] = useState<File | null>(null);

  useEffect(() => {
    if (!open) return;
    void loadOptions();
  }, [open]);

  const loadOptions = async () => {
    const [{ data: emps }, { data: forns }] = await Promise.all([
      supabase.from('empresas').select('id, nome').eq('ativo', true).order('nome'),
      supabase.from('fornecedores').select('id, nome').eq('ativo', true).order('nome'),
    ]);
    setEmpresas(emps || []);
    setFornecedores(forns || []);
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
    const parcelas: ParcelaPreview[] = Array.from({ length: numParcelas }, (_, i) => {
      const dataVenc = setDate(addMonths(new Date(), i + 1), Math.min(diaVenc, 28));
      return {
        numero: i + 1,
        valor: i === 0 ? valorParcela + resto : valorParcela,
        data_vencimento: format(dataVenc, 'yyyy-MM-dd'),
      };
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

  const handleSaveTitulo = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const valorTotal = parseFloat(formData.valor_total.replace(/[^\d.,]/g, '').replace(',', '.'));
      const { data: conta, error } = await supabase.from('contas_pagar').insert({
        user_id: user.id,
        empresa_id: formData.empresa_id,
        fornecedor_id: formData.fornecedor_id,
        numero_documento: formData.numero_documento || null,
        valor_total: valorTotal,
        num_parcelas: parseInt(formData.num_parcelas),
        dia_vencimento: parseInt(formData.dia_vencimento) || null,
        categoria: formData.categoria || null,
        centro_custo: formData.centro_custo || null,
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

      const parcelasInsert = generatedParcelas.map(p => ({
        conta_pagar_id: conta.id,
        user_id: user.id,
        numero_parcela: p.numero,
        valor_original: p.valor,
        data_vencimento: p.data_vencimento,
        status: 'pendente' as const,
      }));
      await supabase.from('parcelas_pagar').insert(parcelasInsert);

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
    setFormData(initialForm);
    setGeneratedParcelas([]);
    setShowPreview(false);
    setNotaFiscalFile(null);
    setBoletoFile(null);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
        <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova Conta a Pagar</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-1">
            {!showPreview ? (
              <>
                <GerarTituloForm
                  formData={formData}
                  setFormData={setFormData}
                  empresas={empresas}
                  fornecedores={fornecedores}
                  onGenerateParcelas={handleGenerateParcelas}
                  onAddFornecedor={() => setFornecedorDialogOpen(true)}
                />
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
              </>
            ) : (
              <ParcelasPreview
                parcelas={generatedParcelas}
                onUpdateParcela={handleUpdateParcela}
                onSave={handleSaveTitulo}
                onBack={() => setShowPreview(false)}
                saving={saving}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
      <NovoFornecedorDialog
        open={fornecedorDialogOpen}
        onOpenChange={setFornecedorDialogOpen}
        onSaved={() => { fetchFornecedores(); setFornecedorDialogOpen(false); }}
      />
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
        <div className="flex items-center gap-2 mt-1 border rounded-md px-3 py-2 bg-background">
          <Paperclip className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs flex-1 truncate" title={file.name}>{file.name}</span>
          <Button type="button" variant="ghost" size="sm" onClick={() => onFile(null)}>
            <Trash2 className="w-4 h-4 text-destructive" />
          </Button>
        </div>
      ) : (
        <label className="flex items-center gap-2 cursor-pointer mt-1 border border-dashed rounded-md px-3 py-2 hover:bg-muted/50 transition">
          <Upload className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Selecionar arquivo (PDF/imagem)</span>
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