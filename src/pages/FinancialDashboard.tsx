import { useMemo, useState } from 'react';
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

type Unidade = 'consolidado' | 'japa' | 'trattoria';
type StatusConta = 'vencido' | 'vence_hoje' | 'a_vencer' | 'pago';
type TipoConta = 'conta_fixa' | 'despesa_diaria' | 'fornecedor';

interface ContaRow {
  id: string;
  descricao: string;
  fornecedor: string;
  tipo: TipoConta;
  unidade: Unidade;
  vencimento: string; // ISO yyyy-mm-dd
  valor: number;
  status: StatusConta;
}

const today = new Date();
const fmtISO = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (d: Date, n: number) => {
  const c = new Date(d);
  c.setDate(c.getDate() + n);
  return c;
};

const MOCK_ROWS: ContaRow[] = [
  {
    id: '1',
    descricao: 'Aluguel - Unidade Japonesa',
    fornecedor: 'Imobiliária Sakura',
    tipo: 'conta_fixa',
    unidade: 'japa',
    vencimento: fmtISO(addDays(today, -5)),
    valor: 18500,
    status: 'vencido',
  },
  {
    id: '2',
    descricao: 'Energia Elétrica',
    fornecedor: 'Enel Distribuição',
    tipo: 'conta_fixa',
    unidade: 'trattoria',
    vencimento: fmtISO(addDays(today, -2)),
    valor: 4320.55,
    status: 'vencido',
  },
  {
    id: '3',
    descricao: 'Compra de peixes frescos',
    fornecedor: 'Pescados Tókio',
    tipo: 'fornecedor',
    unidade: 'japa',
    vencimento: fmtISO(today),
    valor: 7820.4,
    status: 'vence_hoje',
  },
  {
    id: '4',
    descricao: 'Gás de cozinha (recarga)',
    fornecedor: 'Ultragaz',
    tipo: 'despesa_diaria',
    unidade: 'trattoria',
    vencimento: fmtISO(today),
    valor: 680,
    status: 'vence_hoje',
  },
  {
    id: '5',
    descricao: 'Hortifruti semanal',
    fornecedor: 'Hortifruti Bella Verdura',
    tipo: 'fornecedor',
    unidade: 'trattoria',
    vencimento: fmtISO(addDays(today, 2)),
    valor: 3210.9,
    status: 'a_vencer',
  },
  {
    id: '6',
    descricao: 'Internet + Telefonia',
    fornecedor: 'Vivo Empresas',
    tipo: 'conta_fixa',
    unidade: 'consolidado',
    vencimento: fmtISO(addDays(today, 4)),
    valor: 890.5,
    status: 'a_vencer',
  },
  {
    id: '7',
    descricao: 'Material de limpeza',
    fornecedor: 'Distribuidora CleanPro',
    tipo: 'despesa_diaria',
    unidade: 'japa',
    vencimento: fmtISO(addDays(today, 1)),
    valor: 540.2,
    status: 'a_vencer',
  },
  {
    id: '8',
    descricao: 'Vinhos importados',
    fornecedor: 'Importadora La Vigna',
    tipo: 'fornecedor',
    unidade: 'trattoria',
    vencimento: fmtISO(addDays(today, 6)),
    valor: 12400,
    status: 'a_vencer',
  },
  {
    id: '9',
    descricao: 'Folha de pagamento parcial',
    fornecedor: 'RH Interno',
    tipo: 'conta_fixa',
    unidade: 'consolidado',
    vencimento: fmtISO(addDays(today, -10)),
    valor: 32500,
    status: 'pago',
  },
  {
    id: '10',
    descricao: 'Carnes nobres',
    fornecedor: 'Frigorífico Premium',
    tipo: 'fornecedor',
    unidade: 'trattoria',
    vencimento: fmtISO(addDays(today, -8)),
    valor: 9780.3,
    status: 'pago',
  },
  {
    id: '11',
    descricao: 'Manutenção freezer',
    fornecedor: 'FrioTech Serviços',
    tipo: 'despesa_diaria',
    unidade: 'japa',
    vencimento: fmtISO(today),
    valor: 1250,
    status: 'vence_hoje',
  },
  {
    id: '12',
    descricao: 'Saquê e bebidas asiáticas',
    fornecedor: 'Asia Drinks Ltda',
    tipo: 'fornecedor',
    unidade: 'japa',
    vencimento: fmtISO(addDays(today, 3)),
    valor: 4670,
    status: 'a_vencer',
  },
];

const tipoLabel: Record<TipoConta, string> = {
  conta_fixa: 'Conta Fixa',
  despesa_diaria: 'Despesa Diária',
  fornecedor: 'Fornecedor',
};

const statusBadge = (s: StatusConta) => {
  const map: Record<StatusConta, { label: string; cls: string }> = {
    vencido: {
      label: 'Vencido',
      cls: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
    },
    vence_hoje: {
      label: 'Vence Hoje',
      cls: 'bg-amber-500 text-white hover:bg-amber-500/90',
    },
    a_vencer: {
      label: 'A Vencer',
      cls: 'bg-muted text-muted-foreground hover:bg-muted/80',
    },
    pago: {
      label: 'Pago',
      cls: 'bg-emerald-600 text-white hover:bg-emerald-600/90',
    },
  };
  const v = map[s];
  return <Badge className={v.cls}>{v.label}</Badge>;
};

// Mock revenue projection (next 7 days)
const buildProjection = (unidade: Unidade) => {
  const baseRev = unidade === 'consolidado' ? 22000 : unidade === 'japa' ? 12000 : 10000;
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = addDays(today, i);
    const dia = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    const variacao = 0.7 + Math.sin(i * 1.3) * 0.25 + (i % 3) * 0.05;
    const receita = Math.round(baseRev * variacao);
    const saidas = Math.round(baseRev * (0.5 + Math.cos(i * 0.9) * 0.2 + (i === 0 ? 0.3 : 0)));
    days.push({ dia, Receitas: receita, Saidas: saidas, Saldo: receita - saidas });
  }
  return days;
};

export default function FinancialDashboard() {
  const [unidade, setUnidade] = useState<Unidade>('consolidado');
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<'todos' | StatusConta>('todos');
  const [filtroTipo, setFiltroTipo] = useState<'todos' | TipoConta>('todos');
  const [filtroData, setFiltroData] = useState('');

  const rowsUnidade = useMemo(
    () =>
      unidade === 'consolidado'
        ? MOCK_ROWS
        : MOCK_ROWS.filter((r) => r.unidade === unidade || r.unidade === 'consolidado'),
    [unidade],
  );

  const filteredRows = useMemo(() => {
    return rowsUnidade.filter((r) => {
      if (
        busca &&
        !`${r.descricao} ${r.fornecedor}`.toLowerCase().includes(busca.toLowerCase())
      )
        return false;
      if (filtroStatus !== 'todos' && r.status !== filtroStatus) return false;
      if (filtroTipo !== 'todos' && r.tipo !== filtroTipo) return false;
      if (filtroData && r.vencimento !== filtroData) return false;
      return true;
    });
  }, [rowsUnidade, busca, filtroStatus, filtroTipo, filtroData]);

  const totals = useMemo(() => {
    const vencidas = rowsUnidade.filter((r) => r.status === 'vencido');
    const venceHoje = rowsUnidade.filter((r) => r.status === 'vence_hoje');
    const naoPagas = rowsUnidade.filter((r) => r.status !== 'pago');
    const totalSaidas = naoPagas.reduce((s, r) => s + r.valor, 0);
    const baseFat = unidade === 'consolidado' ? 184500 : unidade === 'japa' ? 98200 : 86300;
    const cmv = baseFat * 0.32;
    const saldo = baseFat - totalSaidas - cmv;
    return {
      totalVencidas: vencidas.reduce((s, r) => s + r.valor, 0),
      qtdVencidas: vencidas.length,
      totalVenceHoje: venceHoje.reduce((s, r) => s + r.valor, 0),
      qtdVenceHoje: venceHoje.length,
      faturamento: baseFat,
      cmv,
      totalSaidas,
      saldo,
    };
  }, [rowsUnidade, unidade]);

  const projection = useMemo(() => buildProjection(unidade), [unidade]);

  return (
    <AppLayout
      title="Dashboard Financeiro"
      subtitle="Centro de controle do fluxo de caixa"
    >
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

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            title="Faturamento Bruto"
            value={formatCurrency(totals.faturamento)}
            icon={<TrendingUp className="w-5 h-5" />}
            tone="emerald"
          />
          <KpiCard
            title="CMV Atual"
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
            <AlertTitle className="text-destructive font-semibold">
              Contas Vencidas
            </AlertTitle>
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
                  <YAxis
                    className="text-xs"
                    tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`}
                  />
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
                <Button variant="default" size="sm">
                  <Plus className="w-4 h-4" /> Nova Conta a Pagar
                </Button>
                <Button variant="secondary" size="sm">
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
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        Nenhum registro encontrado com os filtros atuais.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRows.map((r) => (
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
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
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
            <p className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
              {title}
            </p>
            <p className="text-2xl font-bold mt-2">{value}</p>
            {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
          </div>
          <div className={`rounded-lg p-2 ${toneMap[tone]}`}>{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}