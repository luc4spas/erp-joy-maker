import { useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
} from 'lucide-react';

type EmptyStateProps = {
  icon: React.ElementType;
  title: string;
  description?: string;
};

function EmptyState({ icon: Icon, title, description }: EmptyStateProps) {
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

/* ---------------- Aba 1: Catálogo ---------------- */
function CatalogoTab() {
  const [openFornecedor, setOpenFornecedor] = useState(false);
  const [openInsumo, setOpenInsumo] = useState(false);
  const fornecedores: any[] = [];
  const insumos: any[] = [];

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
          <Dialog open={openFornecedor} onOpenChange={setOpenFornecedor}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4" />
                Novo Fornecedor
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Novo Fornecedor</DialogTitle>
                <DialogDescription>Cadastre um novo parceiro</DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Nome</Label>
                  <Input placeholder="Nome do fornecedor" />
                </div>
                <div className="space-y-2">
                  <Label>Contato</Label>
                  <Input placeholder="Telefone / e-mail" />
                </div>
                <div className="space-y-2">
                  <Label>Categoria</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hortifruti">Hortifruti</SelectItem>
                      <SelectItem value="proteinas">Proteínas</SelectItem>
                      <SelectItem value="bebidas">Bebidas</SelectItem>
                      <SelectItem value="mercearia">Mercearia</SelectItem>
                      <SelectItem value="descartaveis">Descartáveis</SelectItem>
                      <SelectItem value="limpeza">Limpeza</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Prazo de Entrega (dias)</Label>
                  <Input type="number" placeholder="Ex: 2" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpenFornecedor(false)}>
                  Cancelar
                </Button>
                <Button onClick={() => setOpenFornecedor(false)}>Salvar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
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
                </TableRow>
              </TableHeader>
              <TableBody />
            </Table>
          )}
        </CardContent>
      </Card>

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
          <Dialog open={openInsumo} onOpenChange={setOpenInsumo}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4" />
                Novo Insumo
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Novo Insumo</DialogTitle>
                <DialogDescription>Adicione um item ao catálogo</DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Nome</Label>
                  <Input placeholder="Ex: Salmão fresco" />
                </div>
                <div className="space-y-2">
                  <Label>Unidade de Medida</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="kg">Kg</SelectItem>
                      <SelectItem value="g">g</SelectItem>
                      <SelectItem value="l">L</SelectItem>
                      <SelectItem value="ml">mL</SelectItem>
                      <SelectItem value="un">Un</SelectItem>
                      <SelectItem value="cx">Cx</SelectItem>
                      <SelectItem value="pct">Pct</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Fornecedor Vinculado</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Nenhum fornecedor cadastrado" />
                    </SelectTrigger>
                    <SelectContent />
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpenInsumo(false)}>
                  Cancelar
                </Button>
                <Button onClick={() => setOpenInsumo(false)}>Salvar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
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
                </TableRow>
              </TableHeader>
              <TableBody />
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* ---------------- Aba 2: Solicitações ---------------- */
function SolicitacoesTab() {
  const solicitacoes: any[] = [];
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
              <Input placeholder="Nome" />
            </div>
            <div className="space-y-2">
              <Label>Setor</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="japonesa">Cozinha Japonesa</SelectItem>
                  <SelectItem value="italiana">Cozinha Italiana</SelectItem>
                  <SelectItem value="bar">Bar</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Insumo</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Nenhum insumo cadastrado" />
                </SelectTrigger>
                <SelectContent />
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Quantidade</Label>
              <Input type="number" placeholder="0" />
            </div>
            <Button>
              <Plus className="w-4 h-4" />
              Solicitar
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
          {solicitacoes.length === 0 ? (
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
              <TableBody />
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* ---------------- Aba 3: Pedidos de Compra ---------------- */
function PedidosCompraTab() {
  const colunas = [
    { key: 'rascunho', label: 'Rascunho', icon: FileEdit, color: 'text-muted-foreground' },
    { key: 'enviado', label: 'Enviado', icon: Send, color: 'text-warning' },
    { key: 'recebido', label: 'Recebido', icon: PackageCheck, color: 'text-success' },
  ];
  const pedidos: Record<string, any[]> = { rascunho: [], enviado: [], recebido: [] };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Pedidos de Compra</h3>
          <p className="text-sm text-muted-foreground">
            POs consolidados por fornecedor a partir das solicitações aprovadas
          </p>
        </div>
        <Button>
          <Plus className="w-4 h-4" />
          Novo Pedido
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {colunas.map((col) => (
          <Card key={col.key} className="bg-muted/30">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide">
                <col.icon className={`w-4 h-4 ${col.color}`} />
                {col.label}
                <span className="ml-auto text-xs text-muted-foreground">
                  {pedidos[col.key].length}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 min-h-[200px]">
              {pedidos[col.key].length === 0 ? (
                <EmptyState
                  icon={Inbox}
                  title="Nenhum pedido"
                  description={`Sem pedidos em "${col.label.toLowerCase()}".`}
                />
              ) : null}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

/* ---------------- Aba 4: Contagem de Estoque ---------------- */
function ContagemEstoqueTab() {
  const [tipo, setTipo] = useState<'diaria' | 'semanal'>('diaria');
  const itens: any[] = [];

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
          {itens.length === 0 ? (
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
                  <TableHead>Estoque Sistêmico</TableHead>
                  <TableHead>Contagem Real</TableHead>
                  <TableHead>Diferença</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody />
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button disabled={itens.length === 0}>
          <Save className="w-4 h-4" />
          Salvar Contagem
        </Button>
      </div>
    </div>
  );
}

/* ---------------- Página Principal ---------------- */
export default function SupplyChainDashboard() {
  return (
    <AppLayout
      title="Cadeia de Suprimentos"
      subtitle="Catálogo, solicitações, pedidos de compra e inventário"
    >
      <Tabs defaultValue="catalogo" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 h-auto">
          <TabsTrigger value="catalogo" className="gap-2">
            <Package className="w-4 h-4" />
            Catálogo
          </TabsTrigger>
          <TabsTrigger value="solicitacoes" className="gap-2">
            <ClipboardList className="w-4 h-4" />
            Solicitações
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
          <CatalogoTab />
        </TabsContent>
        <TabsContent value="solicitacoes">
          <SolicitacoesTab />
        </TabsContent>
        <TabsContent value="pedidos">
          <PedidosCompraTab />
        </TabsContent>
        <TabsContent value="contagem">
          <ContagemEstoqueTab />
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
}