import { useEffect, useMemo, useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import {
  PackageOpen,
  Truck,
  Package,
  ClipboardList,
  ShoppingCart,
  Warehouse,
  Plus,
  Inbox,
  FileEdit,
  Send,
  PackageCheck,
  Save,
  Check,
  X,
  Trash2,
  ScrollText,
  FileSearch,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { CotacaoTab } from '@/components/suprimentos/CotacaoTab';

type Fornecedor = {
  id: string;
  nome: string;
  contato: string | null;
  categoria: string | null;
  prazo_entrega: number | null;
};
type Insumo = {
  id: string;
  nome: string;
  unidade: string;
  fornecedor_id: string | null;
  estoque_sistemico: number;
  critico: boolean;
};
type Solicitacao = {
  id: string;
  colaborador: string;
  setor: string;
  insumo_id: string;
  quantidade: number;
  status: string;
  data: string;
};
type Pedido = {
  id: string;
  fornecedor_id: string;
  status: string;
  total: number;
  data_pedido: string;
};
type Contagem = {
  id?: string;
  insumo_id: string;
  estoque_sistemico: number;
  contagem_real: number;
  diferenca: number;
  tipo: string;
  data: string;
};

const UNIDADES = ['kg', 'g', 'L', 'mL', 'un', 'cx', 'pct'];
const CATEGORIAS = ['Hortifruti', 'Proteínas', 'Bebidas', 'Mercearia', 'Descartáveis', 'Limpeza', 'Outros'];
const SETORES = ['Cozinha Japonesa', 'Cozinha Italiana', 'Bar'];

function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType;
  title: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-muted-foreground" />
      </div>
      <p className="text-sm font-medium text-foreground">{title}</p>
      {description && (
        <p className="text-xs text-muted-foreground mt-1 max-w-sm">{description}</p>
      )}
    </div>
  );
}

/* =================== Página Principal =================== */
export default function SupplyChainDashboard() {
  const { user } = useAuth();
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [solicitacoes, setSolicitacoes] = useState<Solicitacao[]>([]);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);

  const fetchAll = async () => {
    const [f, i, s, p] = await Promise.all([
      supabase.from('suprimentos_fornecedores').select('*').order('nome'),
      supabase.from('suprimentos_insumos').select('*').order('nome'),
      supabase.from('suprimentos_solicitacoes').select('*').order('created_at', { ascending: false }),
      supabase.from('suprimentos_pedidos').select('*').order('created_at', { ascending: false }),
    ]);
    if (!f.error) setFornecedores((f.data as any) ?? []);
    if (!i.error) setInsumos((i.data as any) ?? []);
    if (!s.error) setSolicitacoes((s.data as any) ?? []);
    if (!p.error) setPedidos((p.data as any) ?? []);
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const kpiPendentes = solicitacoes.filter((s) => s.status === 'pendente').length;
  const kpiCotacoes = solicitacoes.filter((s) => s.status === 'aprovada' || s.status === 'em_cotacao').length;
  const kpiPOs = pedidos.length;

  return (
    <AppLayout
      title="Cadeia de Suprimentos"
      subtitle="Catálogo, solicitações, pedidos de compra e inventário"
    >
      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        {[
          { label: 'Requisições Pendentes', value: kpiPendentes, icon: ClipboardList, color: 'text-amber-500' },
          { label: 'Cotações Abertas', value: kpiCotacoes, icon: FileSearch, color: 'text-blue-500' },
          { label: 'Pedidos de Compra', value: kpiPOs, icon: ScrollText, color: 'text-emerald-500' },
        ].map((k) => (
          <Card key={k.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                <k.icon className={`w-5 h-5 ${k.color}`} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{k.label}</p>
                <p className="text-2xl font-bold">{k.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="catalogo" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 h-auto">
          <TabsTrigger value="catalogo" className="gap-2">
            <Package className="w-4 h-4" />
            Catálogo
          </TabsTrigger>
          <TabsTrigger value="solicitacoes" className="gap-2">
            <ClipboardList className="w-4 h-4" />
            Solicitações
          </TabsTrigger>
          <TabsTrigger value="cotacao" className="gap-2">
            <FileSearch className="w-4 h-4" />
            Cotação
          </TabsTrigger>
          <TabsTrigger value="pedidos" className="gap-2">
            <ShoppingCart className="w-4 h-4" />
            Pedidos de Compra
          </TabsTrigger>
          <TabsTrigger value="contagem" className="gap-2">
            <Warehouse className="w-4 h-4" />
            Contagem de Estoque
          </TabsTrigger>
        </TabsList>

        <TabsContent value="catalogo">
          <CatalogoTab
            fornecedores={fornecedores}
            insumos={insumos}
            userId={user?.id}
            onChanged={fetchAll}
          />
        </TabsContent>
        <TabsContent value="solicitacoes">
          <SolicitacoesTab
            insumos={insumos}
            solicitacoes={solicitacoes}
            userId={user?.id}
            onChanged={fetchAll}
          />
        </TabsContent>
        <TabsContent value="cotacao">
          <CotacaoTab
            solicitacoes={solicitacoes}
            insumos={insumos}
            fornecedores={fornecedores}
            userId={user?.id}
            onChanged={fetchAll}
          />
        </TabsContent>
        <TabsContent value="pedidos">
          <PedidosCompraTab
            fornecedores={fornecedores}
            insumos={insumos}
            pedidos={pedidos}
            solicitacoes={solicitacoes}
            userId={user?.id}
            onChanged={fetchAll}
          />
        </TabsContent>
        <TabsContent value="contagem">
          <ContagemEstoqueTab insumos={insumos} userId={user?.id} />
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
}

/* =================== Aba 1: Catálogo =================== */
function CatalogoTab({
  fornecedores,
  insumos,
  userId,
  onChanged,
}: {
  fornecedores: Fornecedor[];
  insumos: Insumo[];
  userId?: string;
  onChanged: () => void;
}) {
  const [openF, setOpenF] = useState(false);
  const [openI, setOpenI] = useState(false);
  const [savingF, setSavingF] = useState(false);
  const [savingI, setSavingI] = useState(false);

  const [novoF, setNovoF] = useState({ nome: '', contato: '', categoria: '', prazo_entrega: '' });
  const [novoI, setNovoI] = useState({ nome: '', unidade: 'un', fornecedor_id: '', estoque_sistemico: '' });

  const fornNome = (id: string | null) =>
    fornecedores.find((f) => f.id === id)?.nome ?? '—';

  const salvarFornecedor = async () => {
    if (!userId) return toast.error('Sessão expirada');
    if (!novoF.nome.trim()) return toast.error('Informe o nome');
    setSavingF(true);
    const { error } = await supabase.from('suprimentos_fornecedores').insert({
      user_id: userId,
      nome: novoF.nome.trim(),
      contato: novoF.contato || null,
      categoria: novoF.categoria || null,
      prazo_entrega: novoF.prazo_entrega ? Number(novoF.prazo_entrega) : 0,
    });
    setSavingF(false);
    if (error) return toast.error(error.message);
    toast.success('Fornecedor cadastrado');
    setNovoF({ nome: '', contato: '', categoria: '', prazo_entrega: '' });
    setOpenF(false);
    onChanged();
  };

  const salvarInsumo = async () => {
    if (!userId) return toast.error('Sessão expirada');
    if (!novoI.nome.trim()) return toast.error('Informe o nome');
    setSavingI(true);
    const { error } = await supabase.from('suprimentos_insumos').insert({
      user_id: userId,
      nome: novoI.nome.trim(),
      unidade: novoI.unidade,
      fornecedor_id: novoI.fornecedor_id || null,
      estoque_sistemico: novoI.estoque_sistemico ? Number(novoI.estoque_sistemico) : 0,
    });
    setSavingI(false);
    if (error) return toast.error(error.message);
    toast.success('Insumo cadastrado');
    setNovoI({ nome: '', unidade: 'un', fornecedor_id: '', estoque_sistemico: '' });
    setOpenI(false);
    onChanged();
  };

  const excluirFornecedor = async (id: string) => {
    const { error } = await supabase.from('suprimentos_fornecedores').delete().eq('id', id);
    if (error) return toast.error(error.message);
    toast.success('Fornecedor removido');
    onChanged();
  };

  const excluirInsumo = async (id: string) => {
    const { error } = await supabase.from('suprimentos_insumos').delete().eq('id', id);
    if (error) return toast.error(error.message);
    toast.success('Insumo removido');
    onChanged();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Fornecedores */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Truck className="w-5 h-5 text-primary" />
              Fornecedores
            </CardTitle>
            <CardDescription>Cadastro de parceiros de suprimento</CardDescription>
          </div>
          <Button size="sm" onClick={() => setOpenF(true)}>
            <Plus className="w-4 h-4" />
            Novo Fornecedor
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {fornecedores.length === 0 ? (
            <EmptyState
              icon={Truck}
              title="Nenhum fornecedor cadastrado"
              description="Cadastre seu primeiro fornecedor para começar a montar pedidos de compra."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Prazo</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fornecedores.map((f) => (
                  <TableRow key={f.id}>
                    <TableCell className="font-medium">{f.nome}</TableCell>
                    <TableCell>{f.contato || '—'}</TableCell>
                    <TableCell>{f.categoria || '—'}</TableCell>
                    <TableCell>{f.prazo_entrega ?? 0}d</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => excluirFornecedor(f.id)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={openF} onOpenChange={setOpenF}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Fornecedor</DialogTitle>
            <DialogDescription>Cadastre um novo parceiro</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input
                value={novoF.nome}
                onChange={(e) => setNovoF({ ...novoF, nome: e.target.value })}
                placeholder="Nome do fornecedor"
              />
            </div>
            <div className="space-y-2">
              <Label>Contato</Label>
              <Input
                value={novoF.contato}
                onChange={(e) => setNovoF({ ...novoF, contato: e.target.value })}
                placeholder="Telefone / e-mail"
              />
            </div>
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select
                value={novoF.categoria}
                onValueChange={(v) => setNovoF({ ...novoF, categoria: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIAS.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Prazo de Entrega (dias)</Label>
              <Input
                type="number"
                value={novoF.prazo_entrega}
                onChange={(e) => setNovoF({ ...novoF, prazo_entrega: e.target.value })}
                placeholder="Ex: 2"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenF(false)}>
              Cancelar
            </Button>
            <Button onClick={salvarFornecedor} disabled={savingF}>
              {savingF ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Insumos */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Package className="w-5 h-5 text-primary" />
              Insumos
            </CardTitle>
            <CardDescription>Itens utilizados nas operações</CardDescription>
          </div>
          <Button size="sm" onClick={() => setOpenI(true)}>
            <Plus className="w-4 h-4" />
            Novo Insumo
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {insumos.length === 0 ? (
            <EmptyState
              icon={PackageOpen}
              title="Nenhum insumo cadastrado"
              description="Cadastre os itens que sua operação utiliza para habilitar solicitações e pedidos."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Unidade</TableHead>
                  <TableHead>Fornecedor</TableHead>
                  <TableHead>Estoque</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {insumos.map((i) => (
                  <TableRow key={i.id}>
                    <TableCell className="font-medium">{i.nome}</TableCell>
                    <TableCell>{i.unidade}</TableCell>
                    <TableCell>{fornNome(i.fornecedor_id)}</TableCell>
                    <TableCell>{Number(i.estoque_sistemico).toFixed(2)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => excluirInsumo(i.id)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={openI} onOpenChange={setOpenI}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Insumo</DialogTitle>
            <DialogDescription>Adicione um item ao catálogo</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input
                value={novoI.nome}
                onChange={(e) => setNovoI({ ...novoI, nome: e.target.value })}
                placeholder="Ex: Salmão fresco"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Unidade</Label>
                <Select
                  value={novoI.unidade}
                  onValueChange={(v) => setNovoI({ ...novoI, unidade: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {UNIDADES.map((u) => (
                      <SelectItem key={u} value={u}>
                        {u}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Estoque atual</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={novoI.estoque_sistemico}
                  onChange={(e) =>
                    setNovoI({ ...novoI, estoque_sistemico: e.target.value })
                  }
                  placeholder="0"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Fornecedor Vinculado</Label>
              <Select
                value={novoI.fornecedor_id}
                onValueChange={(v) => setNovoI({ ...novoI, fornecedor_id: v })}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      fornecedores.length === 0
                        ? 'Nenhum fornecedor cadastrado'
                        : 'Selecione'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {fornecedores.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenI(false)}>
              Cancelar
            </Button>
            <Button onClick={salvarInsumo} disabled={savingI}>
              {savingI ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* =================== Aba 2: Solicitações =================== */
function SolicitacoesTab({
  insumos,
  solicitacoes,
  userId,
  onChanged,
}: {
  insumos: Insumo[];
  solicitacoes: Solicitacao[];
  userId?: string;
  onChanged: () => void;
}) {
  const [form, setForm] = useState({ colaborador: '', setor: '', insumo_id: '', quantidade: '' });
  const [saving, setSaving] = useState(false);

  const insumoNome = (id: string) => insumos.find((i) => i.id === id);

  const criar = async () => {
    if (!userId) return toast.error('Sessão expirada');
    if (!form.colaborador.trim() || !form.setor || !form.insumo_id || !form.quantidade)
      return toast.error('Preencha todos os campos');
    setSaving(true);
    const { error } = await supabase.from('suprimentos_solicitacoes').insert({
      user_id: userId,
      colaborador: form.colaborador.trim(),
      setor: form.setor,
      insumo_id: form.insumo_id,
      quantidade: Number(form.quantidade),
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success('Solicitação registrada');
    setForm({ colaborador: '', setor: '', insumo_id: '', quantidade: '' });
    onChanged();
  };

  const decidir = async (id: string, status: 'aprovada' | 'recusada') => {
    const { error } = await supabase
      .from('suprimentos_solicitacoes')
      .update({ status })
      .eq('id', id);
    if (error) return toast.error(error.message);
    toast.success(status === 'aprovada' ? 'Aprovada' : 'Recusada');
    onChanged();
  };

  const pendentes = solicitacoes.filter((s) => s.status === 'pendente');
  const historico = solicitacoes.filter((s) => s.status !== 'pendente');

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Plus className="w-5 h-5 text-primary" />
            Nova Solicitação
          </CardTitle>
          <CardDescription>Requisições internas de insumos</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
            <div className="space-y-2">
              <Label>Colaborador</Label>
              <Input
                value={form.colaborador}
                onChange={(e) => setForm({ ...form, colaborador: e.target.value })}
                placeholder="Nome"
              />
            </div>
            <div className="space-y-2">
              <Label>Setor</Label>
              <Select value={form.setor} onValueChange={(v) => setForm({ ...form, setor: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {SETORES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Insumo</Label>
              <Select
                value={form.insumo_id}
                onValueChange={(v) => setForm({ ...form, insumo_id: v })}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      insumos.length === 0 ? 'Nenhum insumo cadastrado' : 'Selecione'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {insumos.map((i) => (
                    <SelectItem key={i.id} value={i.id}>
                      {i.nome} ({i.unidade})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Quantidade</Label>
              <Input
                type="number"
                step="0.01"
                value={form.quantidade}
                onChange={(e) => setForm({ ...form, quantidade: e.target.value })}
                placeholder="0"
              />
            </div>
            <Button onClick={criar} disabled={saving}>
              <Plus className="w-4 h-4" />
              {saving ? 'Enviando...' : 'Solicitar'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Solicitações Pendentes</CardTitle>
          <CardDescription>Aprove ou recuse as requisições recebidas</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {pendentes.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title="Nenhuma solicitação pendente"
              description="Quando uma frente operacional fizer uma requisição, ela aparecerá aqui para aprovação."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Colaborador</TableHead>
                  <TableHead>Setor</TableHead>
                  <TableHead>Insumo</TableHead>
                  <TableHead>Quantidade</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendentes.map((s) => {
                  const ins = insumoNome(s.insumo_id);
                  return (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.colaborador}</TableCell>
                      <TableCell>{s.setor}</TableCell>
                      <TableCell>{ins?.nome ?? '—'}</TableCell>
                      <TableCell>
                        {Number(s.quantidade).toFixed(2)} {ins?.unidade ?? ''}
                      </TableCell>
                      <TableCell>
                        {new Date(s.data).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => decidir(s.id, 'aprovada')}
                        >
                          <Check className="w-4 h-4" />
                          Aprovar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => decidir(s.id, 'recusada')}
                        >
                          <X className="w-4 h-4" />
                          Recusar
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {historico.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Histórico</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Colaborador</TableHead>
                  <TableHead>Setor</TableHead>
                  <TableHead>Insumo</TableHead>
                  <TableHead>Qtd</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {historico.map((s) => {
                  const ins = insumoNome(s.insumo_id);
                  return (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.colaborador}</TableCell>
                      <TableCell>{s.setor}</TableCell>
                      <TableCell>{ins?.nome ?? '—'}</TableCell>
                      <TableCell>
                        {Number(s.quantidade).toFixed(2)} {ins?.unidade ?? ''}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={s.status === 'aprovada' ? 'default' : 'secondary'}
                        >
                          {s.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(s.data).toLocaleDateString('pt-BR')}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/* =================== Aba 3: Pedidos de Compra =================== */
function PedidosCompraTab({
  fornecedores,
  insumos,
  pedidos,
  solicitacoes,
  userId,
  onChanged,
}: {
  fornecedores: Fornecedor[];
  insumos: Insumo[];
  pedidos: Pedido[];
  solicitacoes: Solicitacao[];
  userId?: string;
  onChanged: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [novoP, setNovoP] = useState({ fornecedor_id: '', observacao: '' });
  const [itens, setItens] = useState<{ insumo_id: string; quantidade: string; preco: string }[]>(
    [{ insumo_id: '', quantidade: '', preco: '' }],
  );

  const colunas = [
    { key: 'rascunho', label: 'Rascunho', icon: FileEdit, color: 'text-muted-foreground', next: 'enviado' as const, nextLabel: 'Enviar' },
    { key: 'enviado', label: 'Enviado', icon: Send, color: 'text-amber-500', next: 'recebido' as const, nextLabel: 'Receber' },
    { key: 'recebido', label: 'Recebido', icon: PackageCheck, color: 'text-emerald-500', next: null, nextLabel: '' },
  ];

  const fornNome = (id: string) => fornecedores.find((f) => f.id === id)?.nome ?? '—';

  const total = useMemo(
    () =>
      itens.reduce(
        (acc, it) => acc + (Number(it.quantidade) || 0) * (Number(it.preco) || 0),
        0,
      ),
    [itens],
  );

  const criarPedido = async () => {
    if (!userId) return toast.error('Sessão expirada');
    if (!novoP.fornecedor_id) return toast.error('Selecione o fornecedor');
    const itensValidos = itens.filter((i) => i.insumo_id && Number(i.quantidade) > 0);
    if (itensValidos.length === 0) return toast.error('Adicione ao menos um item');
    setSaving(true);
    const { data: pedido, error } = await supabase
      .from('suprimentos_pedidos')
      .insert({
        user_id: userId,
        fornecedor_id: novoP.fornecedor_id,
        observacao: novoP.observacao || null,
        total,
        status: 'rascunho',
      })
      .select()
      .single();
    if (error || !pedido) {
      setSaving(false);
      return toast.error(error?.message ?? 'Erro ao criar pedido');
    }
    const { error: e2 } = await supabase.from('suprimentos_pedido_itens').insert(
      itensValidos.map((it) => ({
        user_id: userId,
        pedido_id: pedido.id,
        insumo_id: it.insumo_id,
        quantidade: Number(it.quantidade),
        preco_unitario: Number(it.preco) || 0,
      })),
    );
    setSaving(false);
    if (e2) return toast.error(e2.message);
    toast.success('Pedido criado');
    setNovoP({ fornecedor_id: '', observacao: '' });
    setItens([{ insumo_id: '', quantidade: '', preco: '' }]);
    setOpen(false);
    onChanged();
  };

  const moverStatus = async (id: string, status: 'enviado' | 'recebido') => {
    const update: any = { status };
    if (status === 'recebido') update.data_recebimento = new Date().toISOString().slice(0, 10);
    const { error } = await supabase.from('suprimentos_pedidos').update(update).eq('id', id);
    if (error) return toast.error(error.message);
    toast.success('Status atualizado');
    onChanged();
  };

  const excluirPedido = async (id: string) => {
    const { error } = await supabase.from('suprimentos_pedidos').delete().eq('id', id);
    if (error) return toast.error(error.message);
    toast.success('Pedido removido');
    onChanged();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Pedidos de Compra</h3>
          <p className="text-sm text-muted-foreground">
            POs por fornecedor — {solicitacoes.filter((s) => s.status === 'aprovada').length}{' '}
            solicitação(ões) aprovada(s) aguardando consolidação
          </p>
        </div>
        <Button onClick={() => setOpen(true)} disabled={fornecedores.length === 0}>
          <Plus className="w-4 h-4" />
          Novo Pedido
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {colunas.map((col) => {
          const lista = pedidos.filter((p) => p.status === col.key);
          return (
            <Card key={col.key} className="bg-muted/30">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide">
                  <col.icon className={`w-4 h-4 ${col.color}`} />
                  {col.label}
                  <span className="ml-auto text-xs text-muted-foreground">
                    {lista.length}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 min-h-[200px]">
                {lista.length === 0 ? (
                  <EmptyState
                    icon={Inbox}
                    title="Nenhum pedido"
                    description={`Sem pedidos em "${col.label.toLowerCase()}".`}
                  />
                ) : (
                  lista.map((p) => (
                    <Card key={p.id} className="bg-background">
                      <CardContent className="p-3 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-medium text-sm">{fornNome(p.fornecedor_id)}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(p.data_pedido).toLocaleDateString('pt-BR')}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => excluirPedido(p.id)}
                          >
                            <Trash2 className="w-3.5 h-3.5 text-destructive" />
                          </Button>
                        </div>
                        <p className="text-sm font-semibold text-primary">
                          {Number(p.total).toLocaleString('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                          })}
                        </p>
                        {col.next && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full"
                            onClick={() => moverStatus(p.id, col.next!)}
                          >
                            {col.nextLabel}
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  ))
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Novo Pedido de Compra</DialogTitle>
            <DialogDescription>Consolide itens em um PO para o fornecedor</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Fornecedor</Label>
              <Select
                value={novoP.fornecedor_id}
                onValueChange={(v) => setNovoP({ ...novoP, fornecedor_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {fornecedores.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Itens</Label>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setItens([...itens, { insumo_id: '', quantidade: '', preco: '' }])
                  }
                >
                  <Plus className="w-3.5 h-3.5" />
                  Adicionar
                </Button>
              </div>
              <div className="space-y-2 max-h-64 overflow-auto">
                {itens.map((it, idx) => (
                  <div
                    key={idx}
                    className="grid grid-cols-12 gap-2 items-end border rounded-md p-2"
                  >
                    <div className="col-span-6 space-y-1">
                      <Label className="text-xs">Insumo</Label>
                      <Select
                        value={it.insumo_id}
                        onValueChange={(v) => {
                          const cp = [...itens];
                          cp[idx].insumo_id = v;
                          setItens(cp);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          {insumos.map((i) => (
                            <SelectItem key={i.id} value={i.id}>
                              {i.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2 space-y-1">
                      <Label className="text-xs">Qtd</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={it.quantidade}
                        onChange={(e) => {
                          const cp = [...itens];
                          cp[idx].quantidade = e.target.value;
                          setItens(cp);
                        }}
                      />
                    </div>
                    <div className="col-span-3 space-y-1">
                      <Label className="text-xs">Preço un.</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={it.preco}
                        onChange={(e) => {
                          const cp = [...itens];
                          cp[idx].preco = e.target.value;
                          setItens(cp);
                        }}
                      />
                    </div>
                    <div className="col-span-1 flex justify-end">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setItens(itens.filter((_, i) => i !== idx))}
                        disabled={itens.length === 1}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-end text-sm">
                <span className="font-semibold">
                  Total:{' '}
                  {total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={criarPedido} disabled={saving}>
              {saving ? 'Salvando...' : 'Criar Pedido'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* =================== Aba 4: Contagem de Estoque =================== */
function ContagemEstoqueTab({
  insumos,
  userId,
}: {
  insumos: Insumo[];
  userId?: string;
}) {
  const [tipo, setTipo] = useState<'diaria' | 'semanal'>('diaria');
  const [contagens, setContagens] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // Para diária: foco em itens críticos. Se nenhum estiver marcado crítico, mostra todos.
  const visiveis = useMemo(() => {
    if (tipo === 'semanal') return insumos;
    const criticos = insumos.filter((i) => i.critico);
    return criticos.length > 0 ? criticos : insumos;
  }, [tipo, insumos]);

  useEffect(() => {
    setContagens({});
  }, [tipo]);

  const salvar = async () => {
    if (!userId) return toast.error('Sessão expirada');
    const registros = visiveis
      .map((i) => {
        const real = contagens[i.id];
        if (real === undefined || real === '') return null;
        const realNum = Number(real);
        return {
          user_id: userId,
          insumo_id: i.id,
          tipo,
          estoque_sistemico: Number(i.estoque_sistemico),
          contagem_real: realNum,
          diferenca: realNum - Number(i.estoque_sistemico),
        };
      })
      .filter(Boolean);
    if (registros.length === 0) return toast.error('Preencha ao menos uma contagem');
    setSaving(true);
    const { error } = await supabase.from('suprimentos_contagens').insert(registros as any);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(`${registros.length} contagem(ns) salva(s)`);
    setContagens({});
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Warehouse className="w-5 h-5 text-primary" />
              Contagem de Estoque
            </CardTitle>
            <CardDescription>
              {tipo === 'diaria'
                ? 'Foco em perecíveis e itens críticos'
                : 'Inventário geral de todos os insumos'}
            </CardDescription>
          </div>
          <Tabs value={tipo} onValueChange={(v) => setTipo(v as any)}>
            <TabsList>
              <TabsTrigger value="diaria">Contagem Diária</TabsTrigger>
              <TabsTrigger value="semanal">Contagem Semanal</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent className="p-0">
          {visiveis.length === 0 ? (
            <EmptyState
              icon={PackageOpen}
              title="Nenhum item para contagem"
              description="Cadastre insumos no catálogo para iniciar contagens de estoque."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Unidade</TableHead>
                  <TableHead>Estoque Sistêmico</TableHead>
                  <TableHead>Contagem Real</TableHead>
                  <TableHead>Diferença</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visiveis.map((i) => {
                  const real = contagens[i.id];
                  const diff =
                    real !== undefined && real !== ''
                      ? Number(real) - Number(i.estoque_sistemico)
                      : null;
                  return (
                    <TableRow key={i.id}>
                      <TableCell className="font-medium">{i.nome}</TableCell>
                      <TableCell>{i.unidade}</TableCell>
                      <TableCell>{Number(i.estoque_sistemico).toFixed(2)}</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          className="w-28"
                          value={contagens[i.id] ?? ''}
                          onChange={(e) =>
                            setContagens({ ...contagens, [i.id]: e.target.value })
                          }
                          placeholder="0"
                        />
                      </TableCell>
                      <TableCell>
                        {diff === null ? (
                          <span className="text-muted-foreground">—</span>
                        ) : (
                          <span
                            className={
                              diff === 0
                                ? 'text-muted-foreground'
                                : diff > 0
                                  ? 'text-emerald-500 font-medium'
                                  : 'text-destructive font-medium'
                            }
                          >
                            {diff > 0 ? '+' : ''}
                            {diff.toFixed(2)}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={salvar} disabled={visiveis.length === 0 || saving}>
          <Save className="w-4 h-4" />
          {saving ? 'Salvando...' : 'Salvar Contagem'}
        </Button>
      </div>
    </div>
  );
}