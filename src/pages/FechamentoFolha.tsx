import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Loader2, ChevronLeft, ChevronRight, Calendar, Download, FileText, DollarSign } from 'lucide-react';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatCurrency } from '@/lib/processData';

interface Funcionario {
  id: string;
  nome: string;
  setor: string;
  frente: string;
  ativo: boolean;
  base_salary: number;
}

interface PayrollRow {
  funcionario: Funcionario;
  salarioBase: number;
  totalVales: number;
  totalBonus: number;
  totalDescontos: number;
  comissao: number;
  liquido: number;
}

const FechamentoFolha = () => {
  const [rows, setRows] = useState<PayrollRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [monthStart, setMonthStart] = useState(() => startOfMonth(new Date()));

  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();

  useEffect(() => { if (!authLoading && !user) navigate('/auth'); }, [user, authLoading, navigate]);
  useEffect(() => { if (user) fetchData(); }, [user, monthStart]);

  const getWeeksInMonth = (start: Date, end: Date) => {
    const weeks: { inicio: Date; fim: Date }[] = [];
    let current = new Date(start);
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 0) current.setDate(current.getDate() - dayOfWeek);
    while (current <= end) {
      const ws = new Date(current);
      const we = new Date(current);
      we.setDate(we.getDate() + 6);
      weeks.push({ inicio: ws, fim: we });
      current.setDate(current.getDate() + 7);
    }
    return weeks;
  };

  const fetchData = async () => {
    setIsLoading(true);
    const monthEnd = endOfMonth(monthStart);
    const weeks = getWeeksInMonth(monthStart, monthEnd);
    const fetchStart = format(weeks[0]?.inicio || monthStart, 'yyyy-MM-dd');
    const fetchEnd = format(weeks[weeks.length - 1]?.fim || monthEnd, 'yyyy-MM-dd');
    const refMonth = format(monthStart, 'yyyy-MM-dd');

    const [funcRes, fechRes, txRes] = await Promise.all([
      supabase.from('funcionarios').select('*').eq('ativo', true).order('nome'),
      supabase.from('fechamentos')
        .select('id, data, comissao_japa, comissao_trattoria')
        .gte('data', fetchStart).lte('data', fetchEnd),
      supabase.from('payroll_transactions').select('*').eq('reference_month', refMonth),
    ]);

    const funcs = (funcRes.data || []) as Funcionario[];
    const fechs = fechRes.data || [];
    const txs = (txRes.data || []) as any[];

    // Calculate commissions per employee (same logic as RateioMensal)
    const comissaoMap = new Map<string, number>();
    funcs.forEach(f => comissaoMap.set(f.id, 0));

    const percentGarcom = 0.475 / 0.8;
    const percentCozinha = 0.275 / 0.8;
    const percentAdmin = 0.05 / 0.8;

    weeks.forEach(week => {
      const ws = format(week.inicio, 'yyyy-MM-dd');
      const we = format(week.fim, 'yyyy-MM-dd');
      const weekFechs = fechs.filter((f: any) => f.data >= ws && f.data <= we);
      if (weekFechs.length === 0) return;

      const totalCJ = weekFechs.reduce((s: number, f: any) => s + Number(f.comissao_japa), 0);
      const totalCT = weekFechs.reduce((s: number, f: any) => s + Number(f.comissao_trattoria), 0);
      const totalC = totalCJ + totalCT;
      if (totalC === 0) return;

      const jG = totalCJ * percentGarcom;
      const jC = totalCJ * percentCozinha;
      const tG = totalCT * percentGarcom;
      const tC = totalCT * percentCozinha;
      const adm = totalC * percentAdmin;

      const gJ = funcs.filter(f => f.setor === 'Garçom' && (f.frente === 'Japa' || f.frente === 'Ambas'));
      const gT = funcs.filter(f => f.setor === 'Garçom' && (f.frente === 'Trattoria' || f.frente === 'Ambas'));
      const cJ = funcs.filter(f => f.setor === 'Cozinha' && (f.frente === 'Japa' || f.frente === 'Ambas'));
      const cT = funcs.filter(f => f.setor === 'Cozinha' && (f.frente === 'Trattoria' || f.frente === 'Ambas'));
      const aF = funcs.filter(f => f.setor === 'Administrativo');

      const add = (id: string, v: number) => comissaoMap.set(id, (comissaoMap.get(id) || 0) + v);

      if (gJ.length) gJ.forEach(f => add(f.id, jG / gJ.length));
      if (gT.length) gT.forEach(f => add(f.id, tG / gT.length));
      if (cJ.length) cJ.forEach(f => add(f.id, jC / cJ.length));
      if (cT.length) cT.forEach(f => add(f.id, tC / cT.length));
      if (aF.length) aF.forEach(f => add(f.id, adm / aF.length));
    });

    // Build payroll rows
    const payrollRows: PayrollRow[] = funcs.map(f => {
      const empTxs = txs.filter(t => t.employee_id === f.id);
      const totalVales = empTxs.filter(t => t.transaction_type === 'vale').reduce((s: number, t: any) => s + Number(t.amount), 0);
      const totalBonus = empTxs.filter(t => t.transaction_type === 'bonus').reduce((s: number, t: any) => s + Number(t.amount), 0);
      const totalDescontos = empTxs.filter(t => t.transaction_type === 'desconto').reduce((s: number, t: any) => s + Number(t.amount), 0);
      const comissao = comissaoMap.get(f.id) || 0;
      const salarioBase = Number(f.base_salary) || 0;
      const liquido = salarioBase + totalBonus + comissao - totalVales - totalDescontos;
      return { funcionario: f, salarioBase, totalVales, totalBonus, totalDescontos, comissao, liquido };
    }).filter(r => r.salarioBase > 0 || r.totalVales > 0 || r.totalBonus > 0 || r.comissao > 0 || r.totalDescontos > 0);

    setRows(payrollRows);
    setIsLoading(false);
  };

  const totals = rows.reduce((acc, r) => ({
    salario: acc.salario + r.salarioBase,
    vales: acc.vales + r.totalVales,
    bonus: acc.bonus + r.totalBonus,
    descontos: acc.descontos + r.totalDescontos,
    comissao: acc.comissao + r.comissao,
    liquido: acc.liquido + r.liquido,
  }), { salario: 0, vales: 0, bonus: 0, descontos: 0, comissao: 0, liquido: 0 });

  const mesAnoLabel = format(monthStart, "MMMM 'de' yyyy", { locale: ptBR });

  const exportCSV = () => {
    const header = 'Colaborador;Salário Base;Vales;Bônus;Descontos;Comissão;Valor Líquido\n';
    const body = rows.map(r =>
      `${r.funcionario.nome};${r.salarioBase.toFixed(2)};${r.totalVales.toFixed(2)};${r.totalBonus.toFixed(2)};${r.totalDescontos.toFixed(2)};${r.comissao.toFixed(2)};${r.liquido.toFixed(2)}`
    ).join('\n');
    const totalLine = `\nTOTAL;${totals.salario.toFixed(2)};${totals.vales.toFixed(2)};${totals.bonus.toFixed(2)};${totals.descontos.toFixed(2)};${totals.comissao.toFixed(2)};${totals.liquido.toFixed(2)}`;
    const blob = new Blob(['\uFEFF' + header + body + totalLine], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fechamento-folha-${format(monthStart, 'yyyy-MM')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPDF = () => {
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`
      <html><head><title>Fechamento de Folha - ${mesAnoLabel}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 30px; max-width: 1100px; margin: 0 auto; color: #333; }
        h1 { font-size: 20px; text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; }
        .periodo { background: #f0f0f0; padding: 10px; border-radius: 5px; text-align: center; margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; }
        th { background: #f5f5f5; padding: 8px; text-align: right; border-bottom: 2px solid #ddd; }
        th:first-child { text-align: left; }
        td { padding: 8px; border-bottom: 1px solid #eee; text-align: right; }
        td:first-child { text-align: left; font-weight: 600; }
        .text-red { color: #dc2626; }
        .text-green { color: #16a34a; }
        .total-row { background: #f0f7ff; font-weight: bold; border-top: 2px solid #333; }
        @media print { body { padding: 15px; } }
      </style></head><body>
        <h1>FECHAMENTO DE FOLHA DE PAGAMENTO</h1>
        <div class="periodo"><strong>Referência:</strong> ${mesAnoLabel.charAt(0).toUpperCase() + mesAnoLabel.slice(1)}</div>
        <table>
          <thead><tr>
            <th style="text-align:left">Colaborador</th>
            <th>Salário Base</th>
            <th>Vales</th>
            <th>Bônus</th>
            <th>Descontos</th>
            <th>Comissão</th>
            <th>Valor Líquido</th>
          </tr></thead>
          <tbody>
            ${rows.map(r => `<tr>
              <td>${r.funcionario.nome}</td>
              <td>${formatCurrency(r.salarioBase)}</td>
              <td class="text-red">${r.totalVales > 0 ? '- ' + formatCurrency(r.totalVales) : '-'}</td>
              <td class="text-green">${r.totalBonus > 0 ? formatCurrency(r.totalBonus) : '-'}</td>
              <td class="text-red">${r.totalDescontos > 0 ? '- ' + formatCurrency(r.totalDescontos) : '-'}</td>
              <td class="text-green">${r.comissao > 0 ? formatCurrency(r.comissao) : '-'}</td>
              <td style="font-weight:bold">${formatCurrency(r.liquido)}</td>
            </tr>`).join('')}
            <tr class="total-row">
              <td>TOTAL</td>
              <td>${formatCurrency(totals.salario)}</td>
              <td class="text-red">${formatCurrency(totals.vales)}</td>
              <td class="text-green">${formatCurrency(totals.bonus)}</td>
              <td class="text-red">${formatCurrency(totals.descontos)}</td>
              <td class="text-green">${formatCurrency(totals.comissao)}</td>
              <td>${formatCurrency(totals.liquido)}</td>
            </tr>
          </tbody>
        </table>
      </body></html>
    `);
    w.document.close();
    w.print();
  };

  if (authLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!user) return null;

  return (
    <AppLayout title="Fechamento de Folha" subtitle="Relatório consolidado para contabilidade">
      <div className="space-y-6">
        {/* Month Selector */}
        <div className="bg-card rounded-xl p-4 shadow-card border border-border flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="icon" onClick={() => setMonthStart(startOfMonth(subMonths(monthStart, 1)))}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                <Calendar className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Mês de Referência</p>
                <p className="text-lg font-semibold text-foreground capitalize">{mesAnoLabel}</p>
              </div>
            </div>
            <Button variant="outline" size="icon" onClick={() => setMonthStart(startOfMonth(addMonths(monthStart, 1)))}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="secondary" onClick={() => setMonthStart(startOfMonth(new Date()))}>Mês Atual</Button>
            {rows.length > 0 && (
              <>
                <Button variant="outline" onClick={exportCSV} className="gap-2">
                  <Download className="w-4 h-4" />Exportar CSV
                </Button>
                <Button variant="outline" onClick={exportPDF} className="gap-2">
                  <FileText className="w-4 h-4" />Exportar PDF
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Summary */}
        {rows.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="bg-card rounded-xl p-4 shadow-card border border-border">
              <p className="text-xs text-muted-foreground">Total Salários</p>
              <p className="text-xl font-bold text-foreground">{formatCurrency(totals.salario)}</p>
            </div>
            <div className="bg-card rounded-xl p-4 shadow-card border border-border">
              <p className="text-xs text-muted-foreground">Total Vales</p>
              <p className="text-xl font-bold text-destructive">{formatCurrency(totals.vales)}</p>
            </div>
            <div className="bg-card rounded-xl p-4 shadow-card border border-border">
              <p className="text-xs text-muted-foreground">Total Bônus</p>
              <p className="text-xl font-bold text-success">{formatCurrency(totals.bonus)}</p>
            </div>
            <div className="bg-card rounded-xl p-4 shadow-card border border-border">
              <p className="text-xs text-muted-foreground">Total Descontos</p>
              <p className="text-xl font-bold text-destructive">{formatCurrency(totals.descontos)}</p>
            </div>
            <div className="bg-card rounded-xl p-4 shadow-card border border-border">
              <p className="text-xs text-muted-foreground">Total Comissões</p>
              <p className="text-xl font-bold text-success">{formatCurrency(totals.comissao)}</p>
            </div>
            <div className="bg-card rounded-xl p-4 shadow-card border border-border">
              <p className="text-xs text-muted-foreground">Total a Pagar</p>
              <p className="text-xl font-bold text-primary">{formatCurrency(totals.liquido)}</p>
            </div>
          </div>
        )}

        {/* Table */}
        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : rows.length === 0 ? (
          <div className="text-center py-16 bg-card rounded-2xl shadow-card">
            <DollarSign className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Nenhum dado para este mês. Cadastre salários nos colaboradores e registre lançamentos.</p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="bg-card rounded-2xl shadow-card overflow-hidden hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Colaborador</TableHead>
                    <TableHead className="text-right">Salário Base</TableHead>
                    <TableHead className="text-right">Vales</TableHead>
                    <TableHead className="text-right">Bônus</TableHead>
                    <TableHead className="text-right">Descontos</TableHead>
                    <TableHead className="text-right">Comissão</TableHead>
                    <TableHead className="text-right">Valor Líquido</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.funcionario.id}>
                      <TableCell className="font-medium">{r.funcionario.nome}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatCurrency(r.salarioBase)}</TableCell>
                      <TableCell className="text-right tabular-nums text-destructive font-semibold">
                        {r.totalVales > 0 ? `- ${formatCurrency(r.totalVales)}` : '-'}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-success font-semibold">
                        {r.totalBonus > 0 ? formatCurrency(r.totalBonus) : '-'}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-destructive font-semibold">
                        {r.totalDescontos > 0 ? `- ${formatCurrency(r.totalDescontos)}` : '-'}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-success font-semibold">
                        {r.comissao > 0 ? formatCurrency(r.comissao) : '-'}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-bold text-primary">
                        {formatCurrency(r.liquido)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow className="bg-secondary/50 font-bold">
                    <TableCell>TOTAL</TableCell>
                    <TableCell className="text-right tabular-nums">{formatCurrency(totals.salario)}</TableCell>
                    <TableCell className="text-right tabular-nums text-destructive">{formatCurrency(totals.vales)}</TableCell>
                    <TableCell className="text-right tabular-nums text-success">{formatCurrency(totals.bonus)}</TableCell>
                    <TableCell className="text-right tabular-nums text-destructive">{formatCurrency(totals.descontos)}</TableCell>
                    <TableCell className="text-right tabular-nums text-success">{formatCurrency(totals.comissao)}</TableCell>
                    <TableCell className="text-right tabular-nums text-primary">{formatCurrency(totals.liquido)}</TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-3">
              {rows.map((r) => (
                <div key={r.funcionario.id} className="bg-card rounded-xl p-4 shadow-card border border-border space-y-3">
                  <p className="font-semibold text-foreground">{r.funcionario.nome}</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><span className="text-muted-foreground">Salário:</span> <span className="font-medium">{formatCurrency(r.salarioBase)}</span></div>
                    {r.totalVales > 0 && <div><span className="text-muted-foreground">Vales:</span> <span className="font-medium text-destructive">- {formatCurrency(r.totalVales)}</span></div>}
                    {r.totalBonus > 0 && <div><span className="text-muted-foreground">Bônus:</span> <span className="font-medium text-success">{formatCurrency(r.totalBonus)}</span></div>}
                    {r.totalDescontos > 0 && <div><span className="text-muted-foreground">Descontos:</span> <span className="font-medium text-destructive">- {formatCurrency(r.totalDescontos)}</span></div>}
                    {r.comissao > 0 && <div><span className="text-muted-foreground">Comissão:</span> <span className="font-medium text-success">{formatCurrency(r.comissao)}</span></div>}
                  </div>
                  <div className="pt-2 border-t border-border flex justify-between">
                    <span className="text-sm text-muted-foreground">Valor Líquido</span>
                    <span className="font-bold text-primary">{formatCurrency(r.liquido)}</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
};

export default FechamentoFolha;
