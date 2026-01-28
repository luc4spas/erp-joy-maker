import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/processData';
import { formatDateBR } from '@/lib/dateUtils';
import { AppLayout } from '@/components/AppLayout';
import { DateRangeFilter } from '@/components/DateRangeFilter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Plus, Trash2, Receipt } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { startOfMonth, endOfMonth, format } from 'date-fns';

interface Despesa { id: string; data: string; descricao: string; valor: number; categoria: string; }

const CATEGORIAS = ['Insumos', 'Pessoal', 'Manutenção', 'Outros'];

const Despesas = () => {
  const [despesas, setDespesas] = useState<Despesa[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ data: format(new Date(), 'yyyy-MM-dd'), descricao: '', valor: '', categoria: 'Outros' });
  const [startDate, setStartDate] = useState<Date>(startOfMonth(new Date()));
  const [endDate, setEndDate] = useState<Date>(endOfMonth(new Date()));
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();

  useEffect(() => { if (!authLoading && !user) navigate('/auth'); }, [user, authLoading, navigate]);
  useEffect(() => { if (user) fetchDespesas(); }, [user, startDate, endDate]);

  const fetchDespesas = async () => {
    setIsLoading(true);
    const { data, error } = await supabase.from('despesas').select('*').gte('data', format(startDate, 'yyyy-MM-dd')).lte('data', format(endDate, 'yyyy-MM-dd')).order('data', { ascending: false });
    if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    else setDespesas(data as Despesa[]);
    setIsLoading(false);
  };

  const handleSubmit = async () => {
    if (!user || !form.descricao.trim() || !form.valor) return;
    const { error } = await supabase.from('despesas').insert({ user_id: user.id, data: form.data, descricao: form.descricao, valor: parseFloat(form.valor), categoria: form.categoria });
    if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Despesa adicionada!' }); setDialogOpen(false); setForm({ data: format(new Date(), 'yyyy-MM-dd'), descricao: '', valor: '', categoria: 'Outros' }); fetchDespesas(); }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('despesas').delete().eq('id', id);
    if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Excluído!' }); fetchDespesas(); }
  };

  const totalDespesas = despesas.reduce((s, d) => s + Number(d.valor), 0);

  if (authLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!user) return null;

  return (
    <AppLayout title="Despesas" subtitle="Gerencie as despesas diárias">
      <div className="space-y-6">
        <DateRangeFilter onFilter={(s, e) => { setStartDate(s); setEndDate(e); }} initialStartDate={startDate} initialEndDate={endDate} />
        
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild><Button className="gap-2"><Plus className="w-4 h-4" />Nova Despesa</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Nova Despesa</DialogTitle></DialogHeader>
              <div className="space-y-4 py-4">
                <div><Label>Data</Label><Input type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} /></div>
                <div><Label>Descrição</Label><Input value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} /></div>
                <div><Label>Valor (R$)</Label><Input type="number" step="0.01" value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} /></div>
                <div><Label>Categoria</Label><Select value={form.categoria} onValueChange={(v) => setForm({ ...form, categoria: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{CATEGORIAS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
                <Button onClick={handleSubmit} className="w-full">Adicionar</Button>
              </div>
            </DialogContent>
          </Dialog>
          <div className="bg-card rounded-xl p-4 shadow-card"><p className="text-xs text-muted-foreground">Total no Período</p><p className="text-2xl font-bold text-destructive">{formatCurrency(totalDespesas)}</p></div>
        </div>

        {isLoading ? <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div> : despesas.length === 0 ? (
          <div className="text-center py-16 bg-card rounded-2xl shadow-card"><Receipt className="w-16 h-16 text-muted-foreground mx-auto mb-4" /><p className="text-muted-foreground">Nenhuma despesa no período.</p></div>
        ) : (
          <div className="bg-card rounded-2xl shadow-card overflow-hidden">
            <Table><TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Descrição</TableHead><TableHead>Categoria</TableHead><TableHead className="text-right">Valor</TableHead><TableHead>Ação</TableHead></TableRow></TableHeader>
              <TableBody>{despesas.map((d) => (<TableRow key={d.id}><TableCell>{formatDateBR(d.data)}</TableCell><TableCell>{d.descricao}</TableCell><TableCell>{d.categoria}</TableCell><TableCell className="text-right text-destructive font-medium">{formatCurrency(d.valor)}</TableCell><TableCell><Button variant="ghost" size="icon" onClick={() => handleDelete(d.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button></TableCell></TableRow>))}</TableBody>
            </Table>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default Despesas;
