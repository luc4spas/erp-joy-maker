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
  totalHorasNoturnas: number; // Novo campo
  valorAdicionalNoturno: number; // Novo campo
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

    const payrollRows: PayrollRow[] = funcs.map(f => {
      const empTxs = txs.filter(t => t.employee_id === f.id);
      const totalVales = empTxs.filter(t => t.transaction_type === 'vale').reduce((s: number, t: any) => s + Number(t.amount), 0);
      const totalBonus = empTxs.filter(t => t.transaction_type === 'bonus').reduce((s: number, t: any) => s + Number(t.amount), 0);
      const totalDescontos = empTxs.filter(t => t.transaction_type === 'desconto').reduce((s: number, t: any) => s + Number(t.amount), 0);
      
      // Novo: Cálculo de Adicional Noturno
      const empNoturno = empTxs.filter(t => t.transaction_type === 'adicional_noturno');
      const totalHorasNoturnas = empNoturno.reduce((s: number, t: any) => s + Number(t.hours_quantity || 0), 0);
      
      const comissao = comissaoMap.get(f.id) || 0;
      const salarioBase = Number(f.base_salary) || 0;
      
      // Cálculo financeiro do adicional (Base 220h + 20% adicional)
      const valorHoraBase = salarioBase / 220;
      const valorAdicionalNoturno = totalHorasNoturnas * (valorHoraBase * 0.20);

      const liquido = salarioBase + totalBonus + comissao + valorAdicionalNoturno - totalVales - totalDescontos;
      
      return { 
        funcionario: f, 
        salarioBase, 
        totalVales, 
        totalBonus, 
        totalDescontos, 
        comissao, 
        totalHorasNoturnas, 
        valorAdicionalNoturno, 
        liquido 
      };
    }).filter(r => r.salarioBase > 0 || r.totalVales > 0 || r.totalBonus > 0 || r.comissao > 0 || r.totalDescontos > 0 || r.totalHorasNoturnas > 0);

    setRows(payrollRows);
    setIsLoading(false);
  };

  const totals = rows.reduce((acc, r) => ({
    salario: acc.salario + r.salarioBase,
    vales: acc.vales + r.totalVales,
    bonus: acc.bonus + r.totalBonus,
    descontos: acc.descontos + r.totalDescontos,
    comissao: acc.comissao + r.comissao,
    noturno: acc.noturno + r.valorAdicionalNoturno,
    liquido: acc.liquido + r.liquido,
  }), { salario: 0, vales: 0, bonus: 0, descontos: 0, comissao: 0, noturno: 0, liquido: 0 });

  const mesAnoLabel = format(monthStart, "MMMM 'de' yyyy", { locale: ptBR });

  const exportCSV = () => {
    const header = 'Colaborador;Salário Base;Vales;Bônus;Descontos;Comissão;Adic. Noturno (h);Adic. Noturno (R$);Valor Líquido\n';
    const body = rows.map(r =>
      `${r.funcionario.nome};${r.salarioBase.toFixed(2)};${r.totalVales.toFixed(2)};${r.totalBonus.toFixed(2)};${r.totalDescontos.toFixed(2)};${r.comissao.toFixed(2)};${r.totalHorasNoturnas.toFixed(2)};${r.valorAdicionalNoturno.toFixed(2)};${r.liquido.toFixed(2)}`
    ).join('\n');
    const totalLine = `\nTOTAL;${totals.salario.toFixed(2)};${totals.vales.toFixed(2)};${totals.bonus.toFixed(2)};${totals.descontos.toFixed(2)};${totals.comissao.toFixed(2)};;${totals.noturno.toFixed(2)};${totals.liquido.toFixed(2)}`;
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
        body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
        h1 { font-size: 18px; text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; }
        .periodo { background: #f0f0f0; padding: 8px; text-align: center; margin-bottom: 15px; font-size: 14px; }
        table { width: 100%; border-collapse: collapse; font-size: 10px; }
        th { background: #f5f5f5; padding: 6px; text-align: right; border-bottom: 2px solid #ddd; }
        th:first-child { text-align: left; }
        td { padding: 6px; border-bottom: 1px solid #eee; text-align: right; }
        td:first-child { text-align: left; font-weight: 600; }
        .text-red { color: #dc2626; }
        .text-green { color: #16a34a; }
        .total-row { background: #f0f7ff; font-weight: bold; border-top: 2px solid #333; }
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
            <th>Adic. Noturno</th>
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
              <td class="text-green">${r.totalHorasNoturnas > 0 ? r.totalHorasNoturnas + 'h (' + formatCurrency(r.valorAdicionalNoturno) + ')' : '-'}</td>
              <td style="font-weight:bold">${formatCurrency(r.liquido)}</td>
            </tr>`).join('')}
            <tr class="total-row">
              <td>TOTAL</td>
              <td>${formatCurrency(totals.salario)}</td>
              <td class="text-red">${formatCurrency(totals.vales)}</td>
              <td class="text-green">${formatCurrency(totals.bonus)}</td>
              <td class="text-red">${formatCurrency(totals.descontos)}</td>
              <td class="text-green">${formatCurrency(totals.comissao)}</td>
              <td class="text-green">${formatCurrency(totals.noturno)}</td>
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
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4">
            <div className="bg-card rounded-xl p-4 shadow-card border border-border">
              <p className="text-xs text-muted-foreground">Salários</p>
              <p className="text-lg font-bold">{formatCurrency(totals.salario)}</p>
            </div>
            <div className="bg-card rounded-xl p-4 shadow-card border border-border">
              <p className="text-xs text-muted-foreground">Vales</p>
              <p className="text-lg font-bold text-destructive">{formatCurrency(totals.vales)}</p>
            </div>
            <div className="bg-card rounded-xl p-4 shadow-card border border-border">
              <p className="text-xs text-muted-foreground">Bônus</p>
              <p className="text-lg font-bold text-success">{formatCurrency(totals.bonus)}</p>
            </div>
            <div className="bg-card rounded-xl p-4 shadow-card border border-border">
              <p className="text-xs text-muted-foreground">Comissões</p>
              <p className="text-lg font-bold text-success">{formatCurrency(totals.comissao)}</p>
            </div>
            <div className="bg-card rounded-xl p-4 shadow-card border border-border">
              <p className="text-xs text-muted-foreground">A. Noturno</p>
              <p className="text-lg font-bold text-success">{formatCurrency(totals.noturno)}</p>
            </div>
            <div className="bg-card rounded-xl p-4 shadow-card border border-border">
              <p className="text-xs text-muted-foreground">Descontos</p>
              <p className="text-lg font-bold text-destructive">{formatCurrency(totals.descontos)}</p>
            </div>
            <div className="bg-card rounded-xl p-4 shadow-card border border-border">
              <p className="text-xs text-muted-foreground">Total Líquido</p>
              <p className="text-lg font-bold text-primary">{formatCurrency(totals.liquido)}</p>
            </div>
          </div>
        )}

        {/* Table */}
        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : rows.length === 0 ? (
          <div className="text-center py-16 bg-card rounded-2xl shadow-card">
            <DollarSign className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Nenhum dado para este mês.</p>
          </div>
        ) : (
          <>
            <div className="bg-card rounded-2xl shadow-card overflow-hidden hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Colaborador</TableHead>
                    <TableHead className="text-right">Salário</TableHead>
                    <TableHead className="text-right">Vales/Desc.</TableHead>
                    <TableHead className="text-right">Bônus/Comis.</TableHead>
                    <TableHead className="text-right">Adic. Noturno</TableHead>
                    <TableHead className="text-right">Líquido</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.funcionario.id}>
                      <TableCell className="font-medium">{r.funcionario.nome}</TableCell>
                      <TableCell className="text-right">{formatCurrency(r.salarioBase)}</TableCell>
                      <TableCell className="text-right text-destructive">
                        -{formatCurrency(r.totalVales + r.totalDescontos)}
                      </TableCell>
                      <TableCell className="text-right text-success">
                        +{formatCurrency(r.totalBonus + r.comissao)}
                      </TableCell>
                      <TableCell className="text-right text-success">
                        {r.totalHorasNoturnas > 0 ? `${r.totalHorasNoturnas}h (${formatCurrency(r.valorAdicionalNoturno)})` : '-'}
                      </TableCell>
                      <TableCell className="text-right font-bold text-primary">
                        {formatCurrency(r.liquido)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow className="bg-secondary/50 font-bold">
                    <TableCell>TOTAL</TableCell>
                    <TableCell className="text-right">{formatCurrency(totals.salario)}</TableCell>
                    <TableCell className="text-right text-destructive">{formatCurrency(totals.vales + totals.descontos)}</TableCell>
                    <TableCell className="text-right text-success">{formatCurrency(totals.bonus + totals.comissao)}</TableCell>
                    <TableCell className="text-right text-success">{formatCurrency(totals.noturno)}</TableCell>
                    <TableCell className="text-right text-primary">{formatCurrency(totals.liquido)}</TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </div>

            <div className="md:hidden space-y-3">
              {rows.map((r) => (
                <div key={r.funcionario.id} className="bg-card rounded-xl p-4 shadow-card border border-border space-y-3">
                  <p className="font-semibold">{r.funcionario.nome}</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><span className="text-muted-foreground">Salário:</span> {formatCurrency(r.salarioBase)}</div>
                    <div><span className="text-muted-foreground">Adic. Not:</span> {formatCurrency(r.valorAdicionalNoturno)}</div>
                    <div><span className="text-muted-foreground">Descontos:</span> <span className="text-destructive">-{formatCurrency(r.totalVales + r.totalDescontos)}</span></div>
                    <div><span className="text-muted-foreground">Ganhos:</span> <span className="text-success">+{formatCurrency(r.totalBonus + r.comissao)}</span></div>
                  </div>
                  <div className="pt-2 border-t flex justify-between font-bold">
                    <span>Líquido</span>
                    <span className="text-primary">{formatCurrency(r.liquido)}</span>
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
