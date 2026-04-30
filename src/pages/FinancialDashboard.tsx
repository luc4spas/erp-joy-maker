import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  TrendingUp,
  Utensils,
  ArrowDownCircle,
  Wallet,
  AlertTriangle,
  Clock,
  Search,
  Plus,
  Calendar as CalendarIcon,
  FileText,
  Loader2,
  Eye,
} from 'lucide-react';
import { formatCurrency } from '@/lib/processData';
import {
  ResponsiveContainer,
  ComposedChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Bar,
  Line,
} from 'recharts';
import { format, startOfMonth, endOfMonth, addDays, isSameDay, isBefore, parseISO, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { DataPagination } from '@/components/ui/data-pagination';
import { NovaContaPagarDialog } from '@/components/financeiro/NovaContaPagarDialog';
import { NovaDespesaDialog } from '@/components/financeiro/NovaDespesaDialog';

type Unidade = 'consolidado' | 'japa' | 'trattoria';
type StatusConta = 'vencido' | 'vence_hoje' | 'a_vencer' | 'pago';
type TipoConta = 'conta_fixa' | 'despesa_diaria' | 'fornecedor' | 'comissao';

interface ContaRow {
  id: string;
  descricao: string;
  fornecedor: string;
  tipo: TipoConta;
  vencimento: string; // ISO yyyy-mm-dd
  valor: number;
  status: StatusConta;
}

const tipoLabel: Record<TipoConta, string> = {
  conta_fixa: 'Conta Fixa',
  despesa_diaria: 'Despesa Diária',
  fornecedor: 'Fornecedor',
  comissao: 'Comissão',
};

const statusBadge = (s: StatusConta) => {
  const map: Record<StatusConta, { label: string; cls: string }> = {
    vencido: { label: 'Vencido', cls: 'bg-destructive text-destructive-foreground hover:bg-destructive/90' },
    vence_hoje: { label: 'Vence Hoje', cls: 'bg-amber-500 text-white hover:bg-amber-500/90' },
    a_vencer: { label: 'A Vencer', cls: 'bg-muted text-muted-foreground hover:bg-muted/80' },
    pago: { label: 'Pago', cls: 'bg-emerald-600 text-white hover:bg-emerald-600/90' },
  };
  const v = map[s];
  return <Badge className={v.cls}>{v.label}</Badge>;
};

const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const today = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

const computeStatus = (vencimento: string, dataPagamento: string | null): StatusConta => {
  if (dataPagamento) return 'pago';
  const v = parseISO(vencimento);
  v.setHours(0, 0, 0, 0);
  const t = today();
  if (isSameDay(v, t)) return 'vence_hoje';
  if (isBefore(v, t)) return 'vencido';
  return 'a_vencer';
};

export default function FinancialDashboard() {
  const navigate = useNavigate();
  const [unidade, setUnidade] = useState<Unidade>('consolidado');
  // Mês de competência (yyyy-MM)
  const [competencia, setCompetencia] = useState<string>(format(new Date(), 'yyyy-MM'));
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<'todos' | StatusConta>('todos');
  const [filtroTipo, setFiltroTipo] = useState<'todos' | TipoConta>('todos');
  const [filtroData, setFiltroData] = useState('');

  const [rows, setRows] = useState<ContaRow[]>([]);
  const [faturamentoMes, setFaturamentoMes] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Modais
  const [novaContaOpen, setNovaContaOpen] = useState(false);
  const [novaDespesaOpen, setNovaDespesaOpen] = useState(false);
  const [detalhesRow, setDetalhesRow] = useState<ContaRow | null>(null);

  // Paginação
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    void fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unidade, competencia]);

  const competenciaRange = useMemo(() => {
    const ref = parseISO(`${competencia}-01`);
    return {
      ini: format(startOfMonth(ref), 'yyyy-MM-dd'),
      fim: format(endOfMonth(ref), 'yyyy-MM-dd'),
      ref,
    };
  }, [competencia]);

  const monthOptions = useMemo(() => {
    const opts: { value: string; label: string }[] = [];
    for (let i = 0; i < 12; i++) {
      const d = subMonths(new Date(), i);
      opts.push({
        value: format(d, 'yyyy-MM'),
        label: format(d, "MMMM 'de' yyyy", { locale: ptBR }),
      });
    }
    return opts;
  }, []);

  const fetchAll = async () => {
    setIsLoading(true);
    try {
      const { ini, fim } = competenciaRange;

      // ---------- Parcelas (Contas a Pagar) ----------
      const { data: parcelas, error: pErr } = await supabase
        .from('parcelas_pagar')
        .select(
          'id, valor_original, data_vencimento, data_pagamento, status, conta_pagar:contas_pagar!inner(id, numero_documento, categoria, fornecedor:fornecedores(nome))',
        )
        .gte('data_vencimento', ini)
        .lte('data_vencimento', fim);
      if (pErr) throw pErr;

      const parcelaRows: ContaRow[] = (parcelas || []).map((p: any) => {
        const cat = (p.conta_pagar?.categoria || '').toLowerCase();
        const tipo: TipoConta = cat.includes('fixa') || cat.includes('aluguel') || cat.includes('energia')
          ? 'conta_fixa'
          : 'fornecedor';
        const fornecedor = p.conta_pagar?.fornecedor?.nome || 'Fornecedor';
        const doc = p.conta_pagar?.numero_documento || '';
        return {
          id: `pg-${p.id}`,
          descricao: doc ? `${fornecedor} • ${doc}` : fornecedor,
          fornecedor,
          tipo,
          vencimento: p.data_vencimento,
          valor: num(p.valor_original),
          status: computeStatus(p.data_vencimento, p.data_pagamento),
        };
      });

      // ---------- Despesas Diárias ----------
      const { data: despesas, error: dErr } = await supabase
        .from('despesas')
        .select('id, data, descricao, valor, categoria')
        .gte('data', ini)
        .lte('data', fim);
      if (dErr) throw dErr;

      const despesaRows: ContaRow[] = (despesas || []).map((d: any) => ({
        id: `dp-${d.id}`,
        descricao: d.descricao || 'Despesa',
        fornecedor: d.categoria || 'Despesa Diária',
        tipo: 'despesa_diaria',
        vencimento: d.data,
        valor: num(d.valor),
        // Despesa lançada já é considerada paga no caixa do dia
        status: computeStatus(d.data, d.data),
      }));

      // ---------- Comissões pagas (pagamentos_funcionarios.pago = true) ----------
      const { data: comissoes, error: cErr } = await supabase
        .from('pagamentos_funcionarios')
        .select('id, data, valor, pago, funcionario:funcionarios(nome, setor)')
        .eq('pago', true)
        .gte('data', ini)
        .lte('data', fim);
      if (cErr) throw cErr;

      const comissaoRows: ContaRow[] = (comissoes || []).map((c: any) => ({
        id: `cm-${c.id}`,
        descricao: `Comissão • ${c.funcionario?.nome || 'Colaborador'}`,
        fornecedor: c.funcionario?.setor || 'Comissão',
        tipo: 'comissao',
        vencimento: c.data,
        valor: num(c.valor),
        // Comissão paga conta como saída efetiva no caixa do dia
        status: computeStatus(c.data, c.data),
      }));

      setRows([...parcelaRows, ...despesaRows, ...comissaoRows]);

      // ---------- Faturamento (Fechamentos) — mês de competência ----------
      const { data: fechs } = await supabase
        .from('fechamentos')
        .select('japa_total, trattoria_total, hippocampus_total, total_geral')
        .gte('data', ini)
        .lte('data', fim);
      const fat = (fechs || []).reduce((s, f: any) => {
        if (unidade === 'japa') return s + num(f.japa_total);
        if (unidade === 'trattoria') return s + num(f.trattoria_total);
        return s + num(f.total_geral);
      }, 0);
      setFaturamentoMes(fat);
    } catch (e) {
      console.error('FinancialDashboard fetch error', e);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      if (busca && !`${r.descricao} ${r.fornecedor}`.toLowerCase().includes(busca.toLowerCase())) return false;
      if (filtroStatus !== 'todos' && r.status !== filtroStatus) return false;
      if (filtroTipo !== 'todos' && r.tipo !== filtroTipo) return false;
      if (filtroData && r.vencimento !== filtroData) return false;
      return true;
    });
  }, [rows, busca, filtroStatus, filtroTipo, filtroData]);

  const sortedRows = useMemo(
    () => filteredRows.slice().sort((a, b) => a.vencimento.localeCompare(b.vencimento)),
    [filteredRows],
  );

  const pagedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sortedRows.slice(start, start + pageSize);
  }, [sortedRows, page, pageSize]);

  // Reset página quando filtros mudarem
  useEffect(() => { setPage(1); }, [busca, filtroStatus, filtroTipo, filtroData, pageSize]);

  const totals = useMemo(() => {
    const vencidas = rows.filter((r) => r.status === 'vencido');
    const venceHoje = rows.filter((r) => r.status === 'vence_hoje');
    const naoPagas = rows.filter((r) => r.status !== 'pago');
    const totalSaidas = naoPagas.reduce((s, r) => s + r.valor, 0);
    const cmv = faturamentoMes * 0.32; // estimativa padrão de 32% — ajustar quando houver coluna real
    const saldo = faturamentoMes - totalSaidas - cmv;
    return {
      totalVencidas: vencidas.reduce((s, r) => s + r.valor, 0),
      qtdVencidas: vencidas.length,
      totalVenceHoje: venceHoje.reduce((s, r) => s + r.valor, 0),
      qtdVenceHoje: venceHoje.length,
      cmv,
      totalSaidas,
      saldo,
    };
  }, [rows, faturamentoMes]);

  const projection = useMemo(() => {
    const t = today();
    const days: { dia: string; Receitas: number; Saidas: number; Saldo: number }[] = [];
    const mediaDiaria = faturamentoMes
      ? faturamentoMes / Math.max(1, new Date().getDate())
      : 0;
    for (let i = 0; i < 7; i++) {
      const d = addDays(t, i);
      const iso = format(d, 'yyyy-MM-dd');
      const saidas = rows
        .filter((r) => r.status !== 'pago' && r.vencimento === iso)
        .reduce((s, r) => s + r.valor, 0);
      const receita = Math.round(mediaDiaria);
      days.push({
        dia: format(d, 'dd/MM'),
        Receitas: receita,
        Saidas: Math.round(saidas),
        Saldo: Math.round(receita - saidas),
      });
    }
    return days;
  }, [rows, faturamentoMes]);

  return (
    <AppLayout title="Dashboard Financeiro" subtitle="Centro de controle do fluxo de caixa">
      <div className="space-y-6">
        {/* Seletor de Unidade */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Unidade:</span>
            <Select value={unidade} onValueChange={(v) => setUnidade(v as Unidade)}>
              <SelectTrigger className="w-[240px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="consolidado">Visão Consolidada</SelectItem>
                <SelectItem value="japa">Unidade Japonesa</SelectItem>
                <SelectItem value="trattoria">Unidade Italiana</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard
                title="Faturamento Bruto"
                value={formatCurrency(faturamentoMes)}
                icon={<TrendingUp className="w-5 h-5" />}
                tone="emerald"
                hint="Mês atual"
              />
              <KpiCard
                title="CMV Estimado"
                value={formatCurrency(totals.cmv)}
                icon={<Utensils className="w-5 h-5" />}
                tone="orange"
                hint="≈ 32% do faturamento"
              />
              <KpiCard
                title="Total de Saídas"
                value={formatCurrency(totals.totalSaidas)}
                icon={<ArrowDownCircle className="w-5 h-5" />}
                tone="red"
                hint="Contas + despesas em aberto"
              />
              <KpiCard
                title="Saldo Atual"
                value={formatCurrency(totals.saldo)}
                icon={<Wallet className="w-5 h-5" />}
                tone={totals.saldo >= 0 ? 'blue' : 'red'}
              />
            </div>

            {/* Central de Alertas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Alert className="border-l-4 border-l-destructive bg-destructive/5">
                <AlertTriangle className="h-5 w-5 !text-destructive" />
                <AlertTitle className="text-destructive font-semibold">Contas Vencidas</AlertTitle>
                <AlertDescription className="flex items-end justify-between gap-4 mt-1">
                  <span className="text-sm text-muted-foreground">
                    {totals.qtdVencidas} obrigações em atraso exigem ação imediata.
                  </span>
                  <span className="text-2xl font-bold text-destructive">
                    {formatCurrency(totals.totalVencidas)}
                  </span>
                </AlertDescription>
              </Alert>

              <Alert className="border-l-4 border-l-amber-500 bg-amber-500/5">
                <Clock className="h-5 w-5 !text-amber-500" />
                <AlertTitle className="text-amber-600 font-semibold">Vence Hoje</AlertTitle>
                <AlertDescription className="flex items-end justify-between gap-4 mt-1">
                  <span className="text-sm text-muted-foreground">
                    {totals.qtdVenceHoje} contas precisam ser pagas até o fim do dia.
                  </span>
                  <span className="text-2xl font-bold text-amber-600">
                    {formatCurrency(totals.totalVenceHoje)}
                  </span>
                </AlertDescription>
              </Alert>
            </div>

            {/* Gráfico Projeção */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  Projeção de Saídas vs. Receitas — Próximos 7 dias
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[320px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={projection}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="dia" className="text-xs" />
                      <YAxis className="text-xs" tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`} />
                      <Tooltip
                        formatter={(v: number) => formatCurrency(v)}
                        contentStyle={{
                          background: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: 8,
                        }}
                      />
                      <Legend />
                      <Bar dataKey="Receitas" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Saidas" name="Saídas" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                      <Line
                        type="monotone"
                        dataKey="Saldo"
                        stroke="hsl(var(--foreground))"
                        strokeWidth={2}
                        dot={{ r: 3 }}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Tabela Central de Contas e Despesas */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary" />
                    Central de Contas e Despesas
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button variant="default" size="sm" onClick={() => setNovaContaOpen(true)}>
                      <Plus className="w-4 h-4" /> Nova Conta a Pagar
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => setNovaDespesaOpen(true)}>
                      <Plus className="w-4 h-4" /> Lançar Despesa Diária
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Filtros */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Buscar fornecedor ou descrição..."
                      className="pl-9"
                      value={busca}
                      onChange={(e) => setBusca(e.target.value)}
                    />
                  </div>
                  <Select value={filtroStatus} onValueChange={(v) => setFiltroStatus(v as any)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos os status</SelectItem>
                      <SelectItem value="vencido">Vencido</SelectItem>
                      <SelectItem value="vence_hoje">Vence Hoje</SelectItem>
                      <SelectItem value="a_vencer">A Vencer</SelectItem>
                      <SelectItem value="pago">Pago</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={filtroTipo} onValueChange={(v) => setFiltroTipo(v as any)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos os tipos</SelectItem>
                      <SelectItem value="conta_fixa">Conta Fixa</SelectItem>
                      <SelectItem value="despesa_diaria">Despesa Diária</SelectItem>
                      <SelectItem value="fornecedor">Fornecedor</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="relative">
                    <CalendarIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                    <Input
                      type="date"
                      className="pl-9"
                      value={filtroData}
                      onChange={(e) => setFiltroData(e.target.value)}
                    />
                  </div>
                </div>

                {/* Tabela */}
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Descrição / Fornecedor</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Vencimento</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-center w-[80px]">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedRows.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                            Nenhum registro encontrado.
                          </TableCell>
                        </TableRow>
                      ) : (
                        pagedRows.map((r) => (
                            <TableRow key={r.id}>
                              <TableCell>
                                <div className="font-medium">{r.descricao}</div>
                                <div className="text-xs text-muted-foreground">{r.fornecedor}</div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">{tipoLabel[r.tipo]}</Badge>
                              </TableCell>
                              <TableCell>
                                {new Date(r.vencimento + 'T00:00:00').toLocaleDateString('pt-BR')}
                              </TableCell>
                              <TableCell className="text-right font-mono font-medium">
                                {formatCurrency(r.valor)}
                              </TableCell>
                              <TableCell>{statusBadge(r.status)}</TableCell>
                              <TableCell className="text-center">
                                <Button variant="ghost" size="sm" onClick={() => setDetalhesRow(r)}>
                                  <Eye className="w-4 h-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                      )}
                    </TableBody>
                  </Table>
                </div>
                <DataPagination
                  page={page}
                  pageSize={pageSize}
                  total={sortedRows.length}
                  onPageChange={setPage}
                  onPageSizeChange={setPageSize}
                />
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Modais inline */}
      <NovaContaPagarDialog open={novaContaOpen} onOpenChange={setNovaContaOpen} onSaved={fetchAll} />
      <NovaDespesaDialog open={novaDespesaOpen} onOpenChange={setNovaDespesaOpen} onSaved={fetchAll} />

      <Dialog open={!!detalhesRow} onOpenChange={(v) => !v && setDetalhesRow(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalhes do Lançamento</DialogTitle>
          </DialogHeader>
          {detalhesRow && (
            <div className="space-y-3 text-sm">
              <DetailRow label="Descrição" value={detalhesRow.descricao} />
              <DetailRow label="Fornecedor / Categoria" value={detalhesRow.fornecedor} />
              <DetailRow label="Tipo" value={tipoLabel[detalhesRow.tipo]} />
              <DetailRow
                label="Vencimento"
                value={new Date(detalhesRow.vencimento + 'T00:00:00').toLocaleDateString('pt-BR')}
              />
              <DetailRow label="Valor" value={formatCurrency(detalhesRow.valor)} />
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-muted-foreground">Status</span>
                {statusBadge(detalhesRow.status)}
              </div>
              <div className="pt-3 flex justify-end gap-2">
                {detalhesRow.tipo === 'despesa_diaria' ? (
                  <Button variant="outline" size="sm" onClick={() => navigate('/despesas')}>
                    Ver em Despesas
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" onClick={() => navigate('/contas-pagar')}>
                    Ver em Contas a Pagar
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 py-2 border-b">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  );
}

function KpiCard({
  title,
  value,
  icon,
  tone,
  hint,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  tone: 'emerald' | 'orange' | 'red' | 'blue';
  hint?: string;
}) {
  const toneMap = {
    emerald: 'bg-emerald-500/10 text-emerald-600',
    orange: 'bg-orange-500/10 text-orange-600',
    red: 'bg-destructive/10 text-destructive',
    blue: 'bg-primary/10 text-primary',
  } as const;
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground font-medium">{title}</p>
            <p className="text-2xl font-bold mt-2">{value}</p>
            {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
          </div>
          <div className={`rounded-lg p-2 ${toneMap[tone]}`}>{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}