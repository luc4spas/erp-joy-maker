import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Loader2, Plus, Trash2, Edit2, X, Check, Users } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface Funcionario {
  id: string;
  nome: string;
  setor: 'Garçom' | 'Cozinha' | 'Administrativo';
  frente: 'Japa' | 'Trattoria' | 'Ambas';
  ativo: boolean;
}

const Funcionarios = () => {
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<{ nome: string; setor: 'Garçom' | 'Cozinha' | 'Administrativo'; frente: 'Japa' | 'Trattoria' | 'Ambas'; ativo: boolean }>({ nome: '', setor: 'Garçom', frente: 'Ambas', ativo: true });
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) fetchFuncionarios();
  }, [user]);

  const fetchFuncionarios = async () => {
    setIsLoading(true);
    const { data, error } = await supabase.from('funcionarios').select('*').order('nome');
    if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    else setFuncionarios(data as Funcionario[]);
    setIsLoading(false);
  };

  const handleSubmit = async () => {
    if (!user || !form.nome.trim()) return;
    try {
      if (editingId) {
        const { error } = await supabase.from('funcionarios').update({ nome: form.nome, setor: form.setor, frente: form.frente, ativo: form.ativo }).eq('id', editingId);
        if (error) throw error;
        toast({ title: 'Atualizado!' });
      } else {
        const { error } = await supabase.from('funcionarios').insert({ user_id: user.id, nome: form.nome, setor: form.setor, frente: form.frente, ativo: form.ativo });
        if (error) throw error;
        toast({ title: 'Funcionário adicionado!' });
      }
      setDialogOpen(false);
      setEditingId(null);
      setForm({ nome: '', setor: 'Garçom', frente: 'Ambas', ativo: true });
      fetchFuncionarios();
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('funcionarios').delete().eq('id', id);
    if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Excluído!' }); fetchFuncionarios(); }
  };

  const openEdit = (f: Funcionario) => {
    setEditingId(f.id);
    setForm({ nome: f.nome, setor: f.setor, frente: f.frente, ativo: f.ativo });
    setDialogOpen(true);
  };

  if (authLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!user) return null;

  return (
    <AppLayout title="Funcionários" subtitle="Cadastre e gerencie a equipe">
      <div className="space-y-6">
        <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) { setEditingId(null); setForm({ nome: '', setor: 'Garçom', frente: 'Ambas', ativo: true }); } }}>
          <DialogTrigger asChild><Button className="gap-2"><Plus className="w-4 h-4" />Novo Funcionário</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editingId ? 'Editar' : 'Novo'} Funcionário</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <div><Label>Nome</Label><Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></div>
              <div><Label>Setor</Label><Select value={form.setor} onValueChange={(v: any) => setForm({ ...form, setor: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Garçom">Garçom</SelectItem><SelectItem value="Cozinha">Cozinha</SelectItem><SelectItem value="Administrativo">Administrativo</SelectItem></SelectContent></Select></div>
              <div><Label>Frente</Label><Select value={form.frente} onValueChange={(v: any) => setForm({ ...form, frente: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Japa">Japa</SelectItem><SelectItem value="Trattoria">Trattoria</SelectItem><SelectItem value="Ambas">Ambas</SelectItem></SelectContent></Select></div>
              <div className="flex items-center gap-2"><Switch checked={form.ativo} onCheckedChange={(c) => setForm({ ...form, ativo: c })} /><Label>Ativo</Label></div>
              <Button onClick={handleSubmit} className="w-full">{editingId ? 'Salvar' : 'Adicionar'}</Button>
            </div>
          </DialogContent>
        </Dialog>

        {isLoading ? <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div> : funcionarios.length === 0 ? (
          <div className="text-center py-16 bg-card rounded-2xl shadow-card"><Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" /><p className="text-muted-foreground">Nenhum funcionário cadastrado.</p></div>
        ) : (
          <div className="bg-card rounded-2xl shadow-card overflow-hidden">
            <Table><TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Setor</TableHead><TableHead>Frente</TableHead><TableHead>Status</TableHead><TableHead>Ações</TableHead></TableRow></TableHeader>
              <TableBody>{funcionarios.map((f) => (<TableRow key={f.id}><TableCell className="font-medium">{f.nome}</TableCell><TableCell>{f.setor}</TableCell><TableCell>{f.frente}</TableCell><TableCell>{f.ativo ? <span className="text-green-600">Ativo</span> : <span className="text-muted-foreground">Inativo</span>}</TableCell><TableCell><div className="flex gap-2"><Button variant="ghost" size="icon" onClick={() => openEdit(f)}><Edit2 className="w-4 h-4" /></Button><Button variant="ghost" size="icon" onClick={() => handleDelete(f.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button></div></TableCell></TableRow>))}</TableBody>
            </Table>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default Funcionarios;
