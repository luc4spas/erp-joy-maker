import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { useToast } from '@/hooks/use-toast';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Plus, Trash2, ChevronLeft, ChevronRight, Calendar, DollarSign } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { format, startOfMonth, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatCurrency } from '@/lib/processData';

interface Funcionario {
  id: string;
  nome: string;
  setor: string;
  frente: string;
  ativo: boolean;
}

interface Transaction {
  id: string;
  employee_id: string;
  transaction_type: 'vale' | 'bonus' | 'desconto';
  amount: number;
  description: string | null;
  reference_month: string;
  created_at: string;
  funcionario?: Funcionario;
}

const typeLabels: Record<string, string> = { vale: 'Vale', bonus: 'Bônus', desconto: 'Desconto' };
const typeColors: Record<string, string> = {
  vale: 'bg-destructive/10 text-destructive',
  bonus: 'bg-success/20 text-success',
  desconto: 'bg-muted text-muted-foreground',
};

const Lancamentos = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [monthStart, setMonthStart] = useState(() => startOfMonth(new Date()));
  const [form, setForm] = useState({ employee_id: '', transaction_type: 'vale' as 'vale' | 'bonus' | 'desconto', amount: '', description: '' });

  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { hasPermission } = usePermissions();
  const { toast } = useToast();

  const canCreate = hasPermission('folha_pagamento', 'create');
  const canDelete = hasPermission('folha_pagamento', 'delete');

  useEffect(() => { if (!authLoading && !user) navigate('/auth'); }, [user, authLoading, navigate]);
  useEffect(() => { if (user) fetchData(); }, [user, monthStart]);

  const fetchData = async () => {
    setIsLoading(true);
    const refMonth = format(monthStart, 'yyyy-MM-dd');
    const [funcRes, txRes] = await Promise.all([
      supabase.from('funcionarios').select('*').eq('ativo', true).order('nome'),
      supabase.from('payroll_transactions').select('*').eq('reference_month', refMonth).order('created_at', { ascending: false }),
    ]);
    if (funcRes.data) setFuncionarios(funcRes.data as Funcionario[]);
    if (txRes.data) {
      const funcsMap = new Map((funcRes.data || []).map((f: any) => [f.id, f]));
      setTransactions((txRes.data as any[]).map(tx => ({ ...tx, funcionario: funcsMap.get(tx.employee_id) })));
    }
    setIsLoading(false);
  };

  const handleSubmit = async () => {
    if (!user || !form.employee_id || !form.amount) return;
    const refMonth = format(monthStart, 'yyyy-MM-dd');
    try {
      const { error } = await supabase.from('payroll_transactions').insert({
        user_id: user.id,
        employee_id: form.employee_id,
        transaction_type: form.transaction_type,
        amount: parseFloat(form.amount.replace(',', '.')),
        description: form.description || null,
        reference_month: refMonth,
      });
      if (error) throw error;
      toast({ title: 'Lançamento salvo!' });
      setDialogOpen(false);
      setForm({ employee_id: '', transaction_type: 'vale', amount: '', description: '' });
      fetchData();
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('payroll_transactions').delete().eq('id', id);
    if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Excluído!' }); fetchData(); }
  };

  const mesAnoLabel = format(monthStart, "MMMM 'de' yyyy", { locale: ptBR });
  const totalVales = transactions.filter(t => t.transaction_type === 'vale').reduce((s, t) => s + Number(t.amount), 0);
  const totalBonus = transactions.filter(t => t.transaction_type === 'bonus').reduce((s, t) => s + Number(t.amount), 0);
  const totalDescontos = transactions.filter(t => t.transaction_type === 'desconto').reduce((s, t) => s + Number(t.amount), 0);

  if (authLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!user) return null;

  return (
    <AppLayout title="Lançamentos" subtitle="Vales, bônus e descontos dos colaboradores">
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
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setMonthStart(startOfMonth(new Date()))}>Mês Atual</Button>
            {canCreate && (
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2"><Plus className="w-4 h-4" />Novo Lançamento</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Novo Lançamento</DialogTitle></DialogHeader>
                  <div className="space-y-4 py-4">
                    <div>
                      <Label>Colaborador</Label>
                      <Select value={form.employee_id} onValueChange={(v) => setForm({ ...form, employee_id: v })}>
                        <SelectTrigger><SelectValue placeholder="Selecionar colaborador" /></SelectTrigger>
                        <SelectContent>
                          {funcionarios.map(f => (
                            <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Tipo</Label>
                        <Select value={form.transaction_type} onValueChange={(v: any) => setForm({ ...form, transaction_type: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="vale">Vale</SelectItem>
                            <SelectItem value="bonus">Bônus</SelectItem>
                            <SelectItem value="desconto">Desconto</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Valor (R$)</Label>
                        <Input type="number" step="0.01" min="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0,00" />
                      </div>
                    </div>
                    <div>
                      <Label>Descrição (opcional)</Label>
                      <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Observação do lançamento" />
                    </div>
                    <Button onClick={handleSubmit} className="w-full">Salvar Lançamento</Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-card rounded-xl p-4 shadow-card border border-border">
            <p className="text-xs text-muted-foreground">Total Vales</p>
            <p className="text-2xl font-bold text-destructive">{formatCurrency(totalVales)}</p>
          </div>
          <div className="bg-card rounded-xl p-4 shadow-card border border-border">
            <p className="text-xs text-muted-foreground">Total Bônus</p>
            <p className="text-2xl font-bold text-success">{formatCurrency(totalBonus)}</p>
          </div>
          <div className="bg-card rounded-xl p-4 shadow-card border border-border">
            <p className="text-xs text-muted-foreground">Total Descontos</p>
            <p className="text-2xl font-bold text-muted-foreground">{formatCurrency(totalDescontos)}</p>
          </div>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-16 bg-card rounded-2xl shadow-card">
            <DollarSign className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Nenhum lançamento para este mês.</p>
          </div>
        ) : (
          <div className="bg-card rounded-2xl shadow-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Colaborador</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="hidden md:table-cell">Descrição</TableHead>
                  {canDelete && <TableHead>Ações</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell className="font-medium">{tx.funcionario?.nome || 'N/A'}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={typeColors[tx.transaction_type]}>
                        {typeLabels[tx.transaction_type]}
                      </Badge>
                    </TableCell>
                    <TableCell className={`text-right tabular-nums font-semibold ${tx.transaction_type === 'vale' || tx.transaction_type === 'desconto' ? 'text-destructive' : 'text-success'}`}>
                      {tx.transaction_type === 'vale' || tx.transaction_type === 'desconto' ? '- ' : '+ '}{formatCurrency(tx.amount)}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">{tx.description || '-'}</TableCell>
                    {canDelete && (
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(tx.id)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default Lancamentos;
