import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Inbox,
  ChevronDown,
  ChevronRight,
  Sparkles,
  ShoppingCart,
  Package,
  Trophy,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Solicitacao {
  id: string;
  status: string;
  data: string;
  insumo_id: string;
  quantidade: number;
  colaborador: string;
  setor: string;
}
interface Insumo {
  id: string;
  nome: string;
  unidade: string;
}
interface Fornecedor {
  id: string;
  nome: string;
}
interface InsumoFornecedor {
  insumo_id: string;
  fornecedor_id: string;
  ultimo_preco: number | null;
}

/** Estado em memória do mapa: precos[insumoId][fornecedorId] = string */
type PrecosMap = Record<string, Record<string, string>>;
type SelMap = Record<string, string | null>; // insumo -> fornecedor escolhido

function EmptyState({ icon: Icon, title, description }: any) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-muted-foreground" />
      </div>
      <p className="text-sm font-medium">{title}</p>
      {description && <p className="text-xs text-muted-foreground mt-1 max-w-md">{description}</p>}
    </div>
  );
}

export function CotacaoTab({
  solicitacoes,
  insumos,
  fornecedores,
  userId,
  onChanged,
}: {
  solicitacoes: Solicitacao[];
  insumos: Insumo[];
  fornecedores: Fornecedor[];
  userId?: string;
  onChanged: () => void;
}) {
  const pendentes = solicitacoes.filter((s) => s.status === 'pendente' || s.status === 'aprovada');
  const [solicitacaoSel, setSolicitacaoSel] = useState<string>('');
  const [vinculos, setVinculos] = useState<InsumoFornecedor[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [precos, setPrecos] = useState<PrecosMap>({});
  const [selecionados, setSelecionados] = useState<SelMap>({});
  const [gerando, setGerando] = useState(false);

  useEffect(() => {
    supabase
      .from('suprimentos_insumo_fornecedores')
      .select('insumo_id, fornecedor_id, ultimo_preco')
      .then(({ data }) => setVinculos((data as any) ?? []));
  }, []);

  // Itens da requisição escolhida (uma solicitação = 1 item; agrupamos múltiplas pendentes mais recentes do mesmo dia/colaborador opcionalmente)
  const itens = useMemo(() => {
    if (!solicitacaoSel) return [];
    const sel = pendentes.find((s) => s.id === solicitacaoSel);
    if (!sel) return [];
    // mostra todas as pendentes da mesma (data, colaborador, setor)
    const grupo = pendentes.filter(
      (s) => s.data === sel.data && s.colaborador === sel.colaborador && s.setor === sel.setor,
    );
    return grupo.map((s) => ({
      solicitacaoId: s.id,
      insumo: insumos.find((i) => i.id === s.insumo_id),
      quantidade: s.quantidade,
    }));
  }, [solicitacaoSel, pendentes, insumos]);

  const fornecedoresDoInsumo = (insumoId: string) => {
    const ids = vinculos.filter((v) => v.insumo_id === insumoId).map((v) => v.fornecedor_id);
    return fornecedores.filter((f) => ids.includes(f.id));
  };
  const ultimoPreco = (insumoId: string, fornId: string) =>
    vinculos.find((v) => v.insumo_id === insumoId && v.fornecedor_id === fornId)?.ultimo_preco ?? null;

  const setPreco = (insumoId: string, fornId: string, valor: string) => {
    setPrecos((p) => ({ ...p, [insumoId]: { ...(p[insumoId] ?? {}), [fornId]: valor } }));
  };

  const escolherMaisBarato = () => {
    const novo: SelMap = {};
    itens.forEach((it) => {
      if (!it.insumo) return;
      const opts = fornecedoresDoInsumo(it.insumo.id)
        .map((f) => ({ id: f.id, preco: Number(precos[it.insumo!.id]?.[f.id] || 0) }))
        .filter((o) => o.preco > 0);
      if (opts.length === 0) return;
      opts.sort((a, b) => a.preco - b.preco);
      novo[it.insumo.id] = opts[0].id;
    });
    setSelecionados(novo);
    toast.success('Selecionados os fornecedores mais baratos');
  };

  const consolidacao = useMemo(() => {
    const grupos = new Map<string, { fornecedor: Fornecedor; itens: { insumo: Insumo; qtd: number; preco: number }[]; total: number }>();
    itens.forEach((it) => {
      if (!it.insumo) return;
      const fornId = selecionados[it.insumo.id];
      if (!fornId) return;
      const preco = Number(precos[it.insumo.id]?.[fornId] || 0);
      const forn = fornecedores.find((f) => f.id === fornId);
      if (!forn) return;
      if (!grupos.has(fornId))
        grupos.set(fornId, { fornecedor: forn, itens: [], total: 0 });
      const g = grupos.get(fornId)!;
      g.itens.push({ insumo: it.insumo, qtd: it.quantidade, preco });
      g.total += preco * it.quantidade;
    });
    return Array.from(grupos.values());
  }, [itens, selecionados, precos, fornecedores]);

  const gerarPOs = async () => {
    if (!userId) return toast.error('Sessão expirada');
    if (consolidacao.length === 0) return toast.error('Selecione fornecedores antes de gerar pedidos');
    setGerando(true);
    try {
      for (const grupo of consolidacao) {
        const { data: pedido, error } = await supabase
          .from('suprimentos_pedidos')
          .insert({
            user_id: userId,
            fornecedor_id: grupo.fornecedor.id,
            status: 'rascunho',
            total: grupo.total,
          })
          .select()
          .single();
        if (error || !pedido) throw error;
        const { error: e2 } = await supabase.from('suprimentos_pedido_itens').insert(
          grupo.itens.map((it) => ({
            user_id: userId,
            pedido_id: pedido.id,
            insumo_id: it.insumo.id,
            quantidade: it.qtd,
            preco_unitario: it.preco,
          })),
        );
        if (e2) throw e2;
      }
      // Marca solicitações como compradas
      const ids = itens.map((i) => i.solicitacaoId);
      await supabase.from('suprimentos_solicitacoes').update({ status: 'comprado' }).in('id', ids);
      toast.success(`${consolidacao.length} pedido(s) gerado(s)`);
      setSolicitacaoSel('');
      setPrecos({});
      setSelecionados({});
      onChanged();
    } catch (e: any) {
      toast.error(e.message ?? 'Erro ao gerar pedidos');
    } finally {
      setGerando(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Mapa de Cotação</CardTitle>
          <CardDescription>
            Selecione uma requisição pendente, preencha os preços por fornecedor e consolide os pedidos.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
            <div className="md:col-span-2 space-y-2">
              <label className="text-sm font-medium">Requisição</label>
              <Select value={solicitacaoSel} onValueChange={setSolicitacaoSel}>
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      pendentes.length === 0
                        ? 'Nenhuma requisição pendente'
                        : 'Selecione uma requisição'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {pendentes.map((s) => {
                    const ins = insumos.find((i) => i.id === s.insumo_id);
                    return (
                      <SelectItem key={s.id} value={s.id}>
                        {new Date(s.data).toLocaleDateString('pt-BR')} — {s.colaborador} ({s.setor}) — {ins?.nome ?? '—'}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" onClick={escolherMaisBarato} disabled={itens.length === 0}>
              <Sparkles className="w-4 h-4" />
              Selecionar mais barato
            </Button>
          </div>

          {!solicitacaoSel ? (
            <EmptyState
              icon={Inbox}
              title="Selecione uma requisição"
              description="O mapa de cotação será montado com base nos itens solicitados."
            />
          ) : itens.length === 0 ? (
            <EmptyState icon={Package} title="Sem itens nesta requisição" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8" />
                  <TableHead>Produto</TableHead>
                  <TableHead>Qtd</TableHead>
                  <TableHead>Fornecedores</TableHead>
                  <TableHead className="w-32">Escolhido</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {itens.map((it) => {
                  if (!it.insumo) return null;
                  const isOpen = expanded[it.insumo.id] ?? true;
                  const opts = fornecedoresDoInsumo(it.insumo.id);
                  const escolhido = selecionados[it.insumo.id];
                  // calcular o mais barato para destacar
                  const precosNum = opts
                    .map((f) => ({ id: f.id, p: Number(precos[it.insumo!.id]?.[f.id] || 0) }))
                    .filter((x) => x.p > 0);
                  const minP = precosNum.length ? Math.min(...precosNum.map((x) => x.p)) : null;
                  return (
                    <>
                      <TableRow key={it.insumo.id}>
                        <TableCell>
                          <button
                            onClick={() =>
                              setExpanded({ ...expanded, [it.insumo!.id]: !isOpen })
                            }
                            className="text-muted-foreground hover:text-foreground"
                          >
                            {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                          </button>
                        </TableCell>
                        <TableCell className="font-medium">{it.insumo.nome}</TableCell>
                        <TableCell>
                          {it.quantidade.toFixed(2)} {it.insumo.unidade}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {opts.length} vinculado(s)
                        </TableCell>
                        <TableCell>
                          {escolhido ? (
                            <Badge variant="default" className="gap-1">
                              <Trophy className="w-3 h-3" />
                              {fornecedores.find((f) => f.id === escolhido)?.nome ?? '—'}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                      {isOpen && (
                        <TableRow className="bg-muted/30 hover:bg-muted/30">
                          <TableCell />
                          <TableCell colSpan={4} className="p-3">
                            {opts.length === 0 ? (
                              <p className="text-xs text-muted-foreground">
                                Nenhum fornecedor vinculado a este produto. Vincule no cadastro de Insumos.
                              </p>
                            ) : (
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead className="w-10" />
                                    <TableHead>Fornecedor</TableHead>
                                    <TableHead>Último Preço</TableHead>
                                    <TableHead>Preço Atual</TableHead>
                                    <TableHead>Subtotal</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {opts.map((f) => {
                                    const last = ultimoPreco(it.insumo!.id, f.id);
                                    const atual = Number(precos[it.insumo!.id]?.[f.id] || 0);
                                    const isMin = minP !== null && atual === minP && atual > 0;
                                    return (
                                      <TableRow
                                        key={f.id}
                                        className={cn(escolhido === f.id && 'bg-primary/5')}
                                      >
                                        <TableCell>
                                          <Checkbox
                                            checked={escolhido === f.id}
                                            onCheckedChange={(c) =>
                                              setSelecionados((s) => ({
                                                ...s,
                                                [it.insumo!.id]: c ? f.id : null,
                                              }))
                                            }
                                          />
                                        </TableCell>
                                        <TableCell className="font-medium">
                                          {f.nome}
                                          {isMin && (
                                            <Badge variant="secondary" className="ml-2 text-xs">
                                              Melhor preço
                                            </Badge>
                                          )}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground text-xs">
                                          {last !== null
                                            ? Number(last).toLocaleString('pt-BR', {
                                                style: 'currency',
                                                currency: 'BRL',
                                              })
                                            : '—'}
                                        </TableCell>
                                        <TableCell>
                                          <Input
                                            type="number"
                                            step="0.01"
                                            className="w-28 h-8"
                                            value={precos[it.insumo!.id]?.[f.id] ?? ''}
                                            onChange={(e) =>
                                              setPreco(it.insumo!.id, f.id, e.target.value)
                                            }
                                            placeholder="0,00"
                                          />
                                        </TableCell>
                                        <TableCell className="text-xs">
                                          {atual > 0
                                            ? (atual * it.quantidade).toLocaleString('pt-BR', {
                                                style: 'currency',
                                                currency: 'BRL',
                                              })
                                            : '—'}
                                        </TableCell>
                                      </TableRow>
                                    );
                                  })}
                                </TableBody>
                              </Table>
                            )}
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Consolidação */}
      {consolidacao.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-primary" />
              Pedidos a Gerar ({consolidacao.length})
            </CardTitle>
            <CardDescription>
              Pré-visualização da consolidação pelos fornecedores selecionados.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {consolidacao.map((g) => (
              <div key={g.fornecedor.id} className="border rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="font-medium">{g.fornecedor.nome}</p>
                  <p className="text-sm font-semibold text-primary">
                    {g.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </p>
                </div>
                <div className="text-xs text-muted-foreground">
                  {g.itens
                    .map(
                      (i) =>
                        `${i.insumo.nome} (${i.qtd.toFixed(2)} ${i.insumo.unidade} × ${i.preco.toLocaleString(
                          'pt-BR',
                          { style: 'currency', currency: 'BRL' },
                        )})`,
                    )
                    .join(' • ')}
                </div>
              </div>
            ))}
            <div className="flex justify-end">
              <Button onClick={gerarPOs} disabled={gerando}>
                <ShoppingCart className="w-4 h-4" />
                {gerando ? 'Gerando...' : 'Gerar Pedidos de Compra (POs)'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}