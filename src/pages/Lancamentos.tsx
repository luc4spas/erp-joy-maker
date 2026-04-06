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
  transaction_type: 'vale' | 'bonus' | 'desconto' | 'adicional_noturno';
  amount: number;
  hours_quantity?: number;
  description: string;
  reference_month: string;
  created_at: string;
  funcionario?: Funcionario;
}

const typeLabels: Record<string, string> = {
  vale: 'Vale',
  bonus: 'Bônus',
  desconto: 'Desconto',
  adicional_noturno: 'Adicional Noturno',
};

const typeColors: Record<string, string> = {
  vale: 'bg-destructive/10 text-destructive border-destructive/20',
  bonus: 'bg-success/10 text-success border-success/20',
  desconto: 'bg-destructive/10 text-destructive border-destructive/20',
  adicional_noturno: 'bg-blue-500/10 text-blue-600 border-blue-200',
};

const Lancamentos = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [monthStart, setMonthStart] = useState(() => startOfMonth(new Date()));

  // Form states
  const [employeeId, setEmployeeId] = useState('');
  const [type, setType] = useState<'vale' | 'bonus' | 'desconto' | 'adicional_noturno'>('vale');
  const [amount, setAmount] = useState('');
  const [hours, setHours] = useState('');
  const [description, setDescription] = useState('');

  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { permissions } = usePermissions();
  const { toast } = useToast();

  const canWrite = permissions?.includes('admin') || permissions?.includes('manager');
  const canDelete = permissions?.includes('admin');

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user, monthStart]);

  const fetchData = async () => {
    setIsLoading(true);
    const refMonth = format(monthStart, 'yyyy-MM-dd');

    const [txRes, funcRes] = await Promise.all([
      supabase
        .from('payroll_transactions')
        .select(`
          *,
          funcionario:funcionarios(id, nome, setor, frente, ativo)
        `)
        .eq('reference_month', refMonth)
        .order('created_at', { ascending: false }),
      supabase
        .from('funcionarios')
        .select('*')
        .eq('ativo', true)
        .order('nome')
    ]);

    setTransactions((txRes.data || []) as Transaction[]);
    setFuncionarios((funcRes.data || []) as Funcionario[]);
    setIsLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeId || (!amount && type !== 'adicional_noturno') || (type === 'adicional_noturno' && !hours)) return;

    setIsSubmitting(true);
    const refMonth = format(monthStart, 'yyyy-MM-dd');

    const { error } = await supabase.from('payroll_transactions').insert({
      employee_id: employeeId,
      transaction_type: type,
      amount: type === 'adicional_noturno' ? 0 : Number(amount),
      hours_quantity: type === 'adicional_noturno' ? Number(hours) : null,
      description,
      reference_month: refMonth,
      user_id: user?.id
    });

    if (error) {
      toast({ variant: 'destructive', title: 'Erro ao salvar', description: error.message });
    } else {
      toast({ title: 'Sucesso', description: 'Lançamento registrado.' });
      setIsDialogOpen(false);
      setEmployeeId('');
      setAmount('');
      setHours('');
      setDescription('');
      fetchData();
    }
    setIsSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este lançamento?')) return;
    const { error } = await supabase.from('payroll_transactions').delete().eq('id', id);
    if (error) {
      toast({ variant: 'destructive', title: 'Erro ao excluir', description: error.message });
    } else {
      fetchData();
    }
  };

  const mesAnoLabel = format(monthStart, "MMMM 'de' yyyy", { locale: ptBR });

  if (authLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <AppLayout title="Lançamentos de Folha" subtitle="Gestão de vales, bônus e adicionais">
      <div className="space-y-6">
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
            {canWrite && (
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2"><Plus className="w-4 h-4" /> Novo Lançamento</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Novo Lançamento</DialogTitle></DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label>Colaborador</Label>
                      <Select value={employeeId} onValueChange={setEmployeeId}>
                        <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                        <SelectContent>
                          {funcionarios.map(f => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Tipo</Label>
                      <Select value={type} onValueChange={(v: any) => setType(v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="vale">Vale</SelectItem>
                          <SelectItem value="bonus">Bônus</SelectItem>
                          <SelectItem value="desconto">Desconto</SelectItem>
                          <SelectItem value="adicional_noturno">Adicional Noturno</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {type === 'adicional_noturno' ? (
                      <div className="space-y-2">
                        <Label>Quantidade de Horas</Label>
                        <Input type="number" step="0.01" value={hours} onChange={e => setHours(e.target.value)} placeholder="Ex: 50.81" />
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Label>Valor (R$)</Label>
                        <Input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0,00" />
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label>Observação (Opcional)</Label>
                      <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Ex: Adiantamento dia 15" />
                    </div>
                    <Button type="submit" className="w-full" disabled={isSubmitting}>
                      {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar Lançamento'}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-16 bg-card rounded-2xl shadow-card border border-border">
            <DollarSign className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Nenhum lançamento para este mês.</p>
          </div>
        ) : (
          <div className="bg-card rounded-2xl shadow-card overflow-hidden border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Colaborador</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Valor/Qtd</TableHead>
                  <TableHead className="hidden md:table-cell">Descrição</TableHead>
                  {canDelete && <TableHead className="w-[50px]"></TableHead>}
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
                      {tx.transaction_type === 'adicional_noturno' 
                        ? `${tx.hours_quantity}h`
                        : (tx.transaction_type === 'vale' || tx.transaction_type === 'desconto' ? '- ' : '+ ') + formatCurrency(tx.amount)
                      }
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
