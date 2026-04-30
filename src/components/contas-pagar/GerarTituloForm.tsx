import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, FileText } from 'lucide-react';
import { CategoriaCombobox } from '@/components/ui/categoria-combobox';

interface FormData {
  empresa_id: string;
  fornecedor_id: string;
  numero_documento: string;
  valor_total: string;
  num_parcelas: string;
  dia_vencimento: string;
  categoria: string;
  centro_custo: string;
}

interface Props {
  formData: FormData;
  setFormData: React.Dispatch<React.SetStateAction<FormData>>;
  empresas: { id: string; nome: string }[];
  fornecedores: { id: string; nome: string }[];
  onGenerateParcelas: () => void;
  onAddFornecedor: () => void;
}

export function GerarTituloForm({ formData, setFormData, empresas, fornecedores, onGenerateParcelas, onAddFornecedor }: Props) {
  const update = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <FileText className="w-5 h-5" /> Gerar Título - Etapa 1
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <Label>Empresa *</Label>
            <Select value={formData.empresa_id} onValueChange={v => update('empresa_id', v)}>
              <SelectTrigger><SelectValue placeholder="Selecione a empresa" /></SelectTrigger>
              <SelectContent>
                {empresas.map(e => <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Fornecedor *</Label>
            <div className="flex gap-2">
              <Select value={formData.fornecedor_id} onValueChange={v => update('fornecedor_id', v)}>
                <SelectTrigger className="flex-1"><SelectValue placeholder="Selecione o fornecedor" /></SelectTrigger>
                <SelectContent>
                  {fornecedores.map(f => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" onClick={onAddFornecedor} title="Novo fornecedor">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div>
            <Label>Identificação (Nº Documento / NF)</Label>
            <Input value={formData.numero_documento} onChange={e => update('numero_documento', e.target.value)} placeholder="Ex: NF-001234" />
          </div>

          <div>
            <Label>Valor Total *</Label>
            <Input value={formData.valor_total} onChange={e => update('valor_total', e.target.value)} placeholder="R$ 0,00" />
          </div>

          <div>
            <Label>Quantidade de Parcelas *</Label>
            <Input type="number" min="1" value={formData.num_parcelas} onChange={e => update('num_parcelas', e.target.value)} />
          </div>

          <div>
            <Label>Dia do Vencimento</Label>
            <Input type="number" min="1" max="28" value={formData.dia_vencimento} onChange={e => update('dia_vencimento', e.target.value)} placeholder="Ex: 15" />
          </div>

          <div>
            <Label>Categoria</Label>
            <CategoriaCombobox
              value={formData.categoria}
              onChange={(v) => update('categoria', v)}
              placeholder="Selecione ou crie uma categoria"
              table="categorias_pagar"
            />
          </div>

          <div>
            <Label>Centro de Custo</Label>
            <Input value={formData.centro_custo} onChange={e => update('centro_custo', e.target.value)} placeholder="Ex: Operacional" />
          </div>
        </div>

        <div className="mt-8 flex justify-end">
          <Button onClick={onGenerateParcelas} size="lg">
            Carregar Títulos
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
