import { useEffect, useMemo, useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ClipboardList,
  Package,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Send,
  PackageOpen,
  Inbox,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { CategoriaCombobox } from '@/components/ui/categoria-combobox';
import { cn } from '@/lib/utils';
import { useMockRole } from '@/contexts/MockRoleContext';
import { UserCircle2, Building2 } from 'lucide-react';

type Insumo = {
  id: string;
  nome: string;
  unidade: string;
  categoria_id: string | null;
};
type Solicitacao = {
  id: string;
  data: string;
  status: string;
  quantidade: number;
  insumo_id: string;
  setor: string;
  colaborador: string;
  created_at: string;
};

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

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    pendente: { label: 'Pendente', cls: 'bg-amber-500/15 text-amber-600 border-amber-500/30' },
    em_cotacao: { label: 'Em Cotação', cls: 'bg-blue-500/15 text-blue-600 border-blue-500/30' },
    aprovada: { label: 'Em Cotação', cls: 'bg-blue-500/15 text-blue-600 border-blue-500/30' },
    comprado: { label: 'Comprado', cls: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30' },
    recusada: { label: 'Recusada', cls: 'bg-destructive/15 text-destructive border-destructive/30' },
  };
  const cfg = map[status] ?? { label: status, cls: 'bg-muted text-muted-foreground' };
  return <Badge variant="outline" className={cn('font-normal', cfg.cls)}>{cfg.label}</Badge>;
}

/* =================== Página principal =================== */
export default function OperacionalRequisicoes() {
  const { user } = useAuth();
  const { profile } = useMockRole();
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [categorias, setCategorias] = useState<{ id: string; nome: string }[]>([]);
  const [minhas, setMinhas] = useState<Solicitacao[]>([]);

  const fetchAll = async () => {
    const [{ data: ins }, { data: cats }, { data: sols }] = await Promise.all([
      supabase.from('suprimentos_insumos').select('id, nome, unidade, categoria_id').order('nome'),
      supabase.from('suprimentos_categorias').select('id, nome').order('nome'),
      supabase
        .from('suprimentos_solicitacoes')
        .select('*')
        .eq('user_id', user?.id ?? '')
        .order('created_at', { ascending: false }),
    ]);
    setInsumos((ins as any) ?? []);
    setCategorias((cats as any) ?? []);
    setMinhas((sols as any) ?? []);
  };

  useEffect(() => {
    if (user?.id) fetchAll();
  }, [user?.id]);

  return (
    <AppLayout
      title="Requisições Operacionais"
      subtitle="Solicite insumos para sua frente de operação"
    >
      <Tabs defaultValue="nova" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 md:w-[400px]">
          <TabsTrigger value="nova">Nova Requisição</TabsTrigger>
          <TabsTrigger value="minhas">Minhas Requisições</TabsTrigger>
        </TabsList>
        <TabsContent value="nova">
          <NovaRequisicaoWizard
            insumos={insumos}
            categorias={categorias}
            userId={user?.id}
            colaborador={profile.nome}
            setor={profile.setor}
            onSent={fetchAll}
          />
        </TabsContent>
        <TabsContent value="minhas">
          <MinhasRequisicoes solicitacoes={minhas} insumos={insumos} />
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
}

/* =================== Wizard 3 passos =================== */
function NovaRequisicaoWizard({
  insumos,
  categorias,
  userId,
  colaborador,
  setor,
  onSent,
}: {
  insumos: Insumo[];
  categorias: { id: string; nome: string }[];
  userId?: string;
  colaborador: string;
  setor: string;
  onSent: () => void;
}) {
  const [step, setStep] = useState(1);
  const [categoriaId, setCategoriaId] = useState('');
  const [quantidades, setQuantidades] = useState<Record<string, string>>({});
  const [enviando, setEnviando] = useState(false);

  const itensFiltrados = useMemo(
    () => (categoriaId ? insumos.filter((i) => i.categoria_id === categoriaId) : []),
    [insumos, categoriaId],
  );

  const itensSelecionados = useMemo(
    () =>
      Object.entries(quantidades)
        .filter(([, q]) => Number(q) > 0)
        .map(([id, q]) => {
          const ins = insumos.find((i) => i.id === id);
          return { id, nome: ins?.nome ?? '', unidade: ins?.unidade ?? '', quantidade: Number(q) };
        }),
    [quantidades, insumos],
  );

  const podeAvancar1 = !!categoriaId;
  const podeAvancar2 = itensSelecionados.length > 0;

  const enviar = async () => {
    if (!userId) return toast.error('Sessão expirada');
    setEnviando(true);
    const registros = itensSelecionados.map((it) => ({
      user_id: userId,
      colaborador,
      setor,
      insumo_id: it.id,
      quantidade: it.quantidade,
      status: 'pendente',
    }));
    const { error } = await supabase.from('suprimentos_solicitacoes').insert(registros);
    setEnviando(false);
    if (error) return toast.error(error.message);
    toast.success(`Requisição enviada com ${registros.length} item(ns)`);
    setStep(1);
    setCategoriaId('');
    setQuantidades({});
    onSent();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <ClipboardList className="w-5 h-5 text-primary" />
          Nova Requisição
        </CardTitle>
        <CardDescription>Fluxo guiado em 3 etapas</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Banner do requisitante (auto-preenchido) */}
        <div className="flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
          <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
            <UserCircle2 className="w-5 h-5 text-primary" />
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            <div>
              <span className="text-xs text-muted-foreground">Requisitante: </span>
              <span className="font-semibold text-foreground">{colaborador}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Setor: </span>
              <span className="font-semibold text-foreground">{setor}</span>
            </div>
          </div>
        </div>

        {/* Stepper */}
        <div className="flex items-center justify-between gap-2">
          {[
            { n: 1, label: 'Categoria' },
            { n: 2, label: 'Itens' },
            { n: 3, label: 'Resumo' },
          ].map((s, idx, arr) => (
            <div key={s.n} className="flex items-center flex-1">
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold border',
                    step === s.n
                      ? 'bg-primary text-primary-foreground border-primary'
                      : step > s.n
                        ? 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30'
                        : 'bg-muted text-muted-foreground border-border',
                  )}
                >
                  {step > s.n ? <CheckCircle2 className="w-4 h-4" /> : s.n}
                </div>
                <span className="text-sm font-medium">{s.label}</span>
              </div>
              {idx < arr.length - 1 && (
                <div className={cn('flex-1 h-px mx-3', step > s.n ? 'bg-emerald-500/40' : 'bg-border')} />
              )}
            </div>
          ))}
        </div>

        {/* Passo 1 */}
        {step === 1 && (
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-2">
              <Label>Categoria do Produto *</Label>
              <Select value={categoriaId} onValueChange={setCategoriaId}>
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      categorias.length === 0
                        ? 'Nenhuma categoria cadastrada'
                        : 'Selecione uma categoria'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {categorias.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                O nome do colaborador e o setor são preenchidos automaticamente pelo perfil logado.
              </p>
            </div>
          </div>
        )}

        {/* Passo 2 */}
        {step === 2 && (
          <div>
            {!categoriaId ? (
              <EmptyState
                icon={Package}
                title="Selecione uma categoria primeiro"
                description="Volte ao passo 1 para escolher uma categoria de produtos."
              />
            ) : itensFiltrados.length === 0 ? (
              <EmptyState
                icon={PackageOpen}
                title="Nenhum item nesta categoria"
                description="Cadastre insumos vinculados a esta categoria no módulo de Suprimentos."
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {itensFiltrados.map((it) => (
                  <div
                    key={it.id}
                    className="border rounded-lg p-3 space-y-2 bg-card hover:border-primary/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium text-sm">{it.nome}</p>
                      <Badge variant="secondary" className="text-xs">{it.unidade}</Badge>
                    </div>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="Quantidade"
                      value={quantidades[it.id] ?? ''}
                      onChange={(e) =>
                        setQuantidades({ ...quantidades, [it.id]: e.target.value })
                      }
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Passo 3 */}
        {step === 3 && (
          <div className="space-y-4">
            {itensSelecionados.length === 0 ? (
              <EmptyState
                icon={Inbox}
                title="Nenhum item selecionado"
                description="Volte ao passo 2 e informe ao menos uma quantidade."
              />
            ) : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm bg-muted/30 rounded-lg p-3">
                  <div>
                    <p className="text-muted-foreground text-xs">Colaborador</p>
                    <p className="font-medium">{colaborador}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Setor</p>
                    <p className="font-medium">{setor}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Categoria</p>
                    <p className="font-medium">
                      {categorias.find((c) => c.id === categoriaId)?.nome ?? '—'}
                    </p>
                  </div>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead className="text-right">Quantidade</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {itensSelecionados.map((it) => (
                      <TableRow key={it.id}>
                        <TableCell className="font-medium">{it.nome}</TableCell>
                        <TableCell className="text-right">
                          {it.quantidade.toFixed(2)} {it.unidade}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </>
            )}
          </div>
        )}

        {/* Navegação */}
        <div className="flex items-center justify-between pt-2">
          <Button
            variant="outline"
            onClick={() => setStep((s) => Math.max(1, s - 1))}
            disabled={step === 1}
          >
            <ChevronLeft className="w-4 h-4" />
            Voltar
          </Button>
          {step < 3 ? (
            <Button
              onClick={() => setStep((s) => s + 1)}
              disabled={(step === 1 && !podeAvancar1) || (step === 2 && !podeAvancar2)}
            >
              Avançar
              <ChevronRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              onClick={enviar}
              disabled={enviando || itensSelecionados.length === 0}
            >
              <Send className="w-4 h-4" />
              {enviando ? 'Enviando...' : 'Enviar Requisição'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/* =================== Minhas Requisições =================== */
function MinhasRequisicoes({
  solicitacoes,
  insumos,
}: {
  solicitacoes: Solicitacao[];
  insumos: Insumo[];
}) {
  // Agrupa solicitações pela mesma data + colaborador (mesma sessão de envio)
  const grupos = useMemo(() => {
    const map = new Map<string, Solicitacao[]>();
    solicitacoes.forEach((s) => {
      const key = `${s.data}__${s.colaborador}__${s.setor}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    });
    return Array.from(map.entries()).map(([key, lista], idx) => ({
      id: `REQ-${String(solicitacoes.length - idx).padStart(3, '0')}`,
      key,
      data: lista[0].data,
      colaborador: lista[0].colaborador,
      setor: lista[0].setor,
      itens: lista,
      status: lista[0].status,
    }));
  }, [solicitacoes]);

  const insumoNome = (id: string) => insumos.find((i) => i.id === id)?.nome ?? '—';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Minhas Requisições</CardTitle>
        <CardDescription>Acompanhe o status das solicitações enviadas</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {grupos.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="Você ainda não enviou requisições"
            description="Comece criando uma nova requisição na aba ao lado."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Itens</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {grupos.map((g) => (
                <TableRow key={g.key}>
                  <TableCell className="font-mono text-xs">{g.id}</TableCell>
                  <TableCell>{new Date(g.data).toLocaleDateString('pt-BR')}</TableCell>
                  <TableCell className="max-w-[400px] truncate">
                    {g.itens
                      .map((i) => `${insumoNome(i.insumo_id)} (${Number(i.quantidade).toFixed(2)})`)
                      .join(', ')}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={g.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}