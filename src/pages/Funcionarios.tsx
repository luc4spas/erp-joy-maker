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
import { Switch } from '@/components/ui/switch';
import { Loader2, Plus, Trash2, Edit2, Users, CalendarIcon } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatCurrency } from '@/lib/processData';

interface Funcionario {
  id: string;
  nome: string;
  setor: 'Garçom' | 'Cozinha' | 'Administrativo';
  frente: 'Japa' | 'Trattoria' | 'Ambas';
  ativo: boolean;
  birth_date: string | null;
  base_salary: number;
}

type FormState = { nome: string; setor: 'Garçom' | 'Cozinha' | 'Administrativo'; frente: 'Japa' | 'Trattoria' | 'Ambas'; ativo: boolean; birth_date: Date | undefined; base_salary: string };
const defaultForm: FormState = { nome: '', setor: 'Garçom', frente: 'Ambas', ativo: true, birth_date: undefined, base_salary: '' };

const getSetorCompleto = (f: Funcionario): string => {
  if (f.setor === 'Administrativo') return 'CAIXA/ADM/CUMINS';
  if (f.frente === 'Ambas') return `${f.setor.toUpperCase()} (AMBAS)`;
  return `${f.setor.toUpperCase()} ${f.frente.toUpperCase()}`;
};

const getSetorColorClass = (f: Funcionario): string => {
  if (f.setor === 'Administrativo') return 'bg-commission-light text-commission-foreground';
  if (f.frente === 'Japa' || f.frente === 'Ambas') return 'bg-japa-light text-japa-foreground';
  return 'bg-trattoria-light text-trattoria-foreground';
};

const Funcionarios = () => {
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(defaultForm);
  
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { hasPermission } = usePermissions();
  const { toast } = useToast();

  const canCreate = hasPermission('colaboradores', 'create');
  const canEdit = hasPermission('colaboradores', 'edit');
  const canDelete = hasPermission('colaboradores', 'delete');

  useEffect(() => { if (!authLoading && !user) navigate('/auth'); }, [user, authLoading, navigate]);
  useEffect(() => { if (user) fetchFuncionarios(); }, [user]);

  const fetchFuncionarios = async () => {
    setIsLoading(true);
    const { data, error } = await supabase.from('funcionarios').select('*').order('nome');
    if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    else setFuncionarios(data as Funcionario[]);
    setIsLoading(false);
  };

  const handleSubmit = async () => {
    if (!user || !form.nome.trim()) return;
    const payload = {
      nome: form.nome,
      setor: form.setor,
      frente: form.frente,
      ativo: form.ativo,
      birth_date: form.birth_date ? format(form.birth_date, 'yyyy-MM-dd') : null,
      base_salary: form.base_salary ? parseFloat(form.base_salary.replace(',', '.')) : 0,
    };
    try {
      if (editingId) {
        const { error } = await supabase.from('funcionarios').update(payload).eq('id', editingId);
        if (error) throw error;
        toast({ title: 'Atualizado!' });
      } else {
        const { error } = await supabase.from('funcionarios').insert({ ...payload, user_id: user.id });
        if (error) throw error;
        toast({ title: 'Colaborador adicionado!' });
      }
      setDialogOpen(false);
      setEditingId(null);
      setForm(defaultForm);
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
    setForm({
      nome: f.nome,
      setor: f.setor,
      frente: f.frente,
      ativo: f.ativo,
      birth_date: f.birth_date ? new Date(f.birth_date + 'T12:00:00') : undefined,
      base_salary: f.base_salary ? String(f.base_salary) : '',
    });
    setDialogOpen(true);
  };

  const resetForm = () => { setEditingId(null); setForm(defaultForm); };

  if (authLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!user) return null;

  const formFields = (
    <div className="space-y-4 py-4">
      <div><Label>Nome</Label><Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Nome do colaborador" /></div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Setor</Label>
          <Select value={form.setor} onValueChange={(v: any) => setForm({ ...form, setor: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Garçom">Garçom</SelectItem>
              <SelectItem value="Cozinha">Cozinha</SelectItem>
              <SelectItem value="Administrativo">Caixa/Adm/Cumins</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Frente</Label>
          <Select value={form.frente} onValueChange={(v: any) => setForm({ ...form, frente: v })} disabled={form.setor === 'Administrativo'}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Japa">Japa</SelectItem>
              <SelectItem value="Trattoria">Trattoria</SelectItem>
              <SelectItem value="Ambas">Ambas</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Salário Base (R$)</Label>
          <Input
            type="number"
            step="0.01"
            min="0"
            value={form.base_salary}
            onChange={(e) => setForm({ ...form, base_salary: e.target.value })}
            placeholder="0,00"
          />
        </div>
        <div>
          <Label>Data de Aniversário</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !form.birth_date && "text-muted-foreground")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {form.birth_date ? format(form.birth_date, "dd/MM/yyyy") : "Selecionar"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={form.birth_date} onSelect={(d) => setForm({ ...form, birth_date: d })} initialFocus className="p-3 pointer-events-auto" locale={ptBR} />
            </PopoverContent>
          </Popover>
        </div>
      </div>
      <div className="flex items-center gap-2"><Switch checked={form.ativo} onCheckedChange={(c) => setForm({ ...form, ativo: c })} /><Label>Ativo</Label></div>
      <Button onClick={handleSubmit} className="w-full">{editingId ? 'Salvar' : 'Adicionar'}</Button>
    </div>
  );

  return (
    <AppLayout title="Colaboradores" subtitle="Cadastre e gerencie a equipe">
      <div className="space-y-6">
        {canCreate && (
          <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="w-4 h-4" />Novo Colaborador</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{editingId ? 'Editar' : 'Novo'} Colaborador</DialogTitle></DialogHeader>
              {formFields}
            </DialogContent>
          </Dialog>
        )}

        {!canCreate && canEdit && (
          <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
            <DialogContent>
              <DialogHeader><DialogTitle>Editar Colaborador</DialogTitle></DialogHeader>
              {formFields}
            </DialogContent>
          </Dialog>
        )}

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : funcionarios.length === 0 ? (
          <div className="text-center py-16 bg-card rounded-2xl shadow-card">
            <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Nenhum colaborador cadastrado.</p>
          </div>
        ) : (
          <div className="bg-card rounded-2xl shadow-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Setor</TableHead>
                  <TableHead className="hidden md:table-cell">Salário Base</TableHead>
                  <TableHead>Status</TableHead>
                  {(canEdit || canDelete) && <TableHead>Ações</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {funcionarios.map((f) => (
                  <TableRow key={f.id}>
                    <TableCell className="font-medium">{f.nome}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={getSetorColorClass(f)}>{getSetorCompleto(f)}</Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell tabular-nums">
                      {f.base_salary > 0 ? formatCurrency(f.base_salary) : <span className="text-muted-foreground">-</span>}
                    </TableCell>
                    <TableCell>
                      {f.ativo ? <Badge variant="default" className="bg-success text-primary-foreground">Ativo</Badge> : <Badge variant="secondary">Inativo</Badge>}
                    </TableCell>
                    {(canEdit || canDelete) && (
                      <TableCell>
                        <div className="flex gap-2">
                          {canEdit && (
                            <Button variant="ghost" size="icon" onClick={() => openEdit(f)}>
                              <Edit2 className="w-4 h-4" />
                            </Button>
                          )}
                          {canDelete && (
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(f.id)}>
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          )}
                        </div>
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

export default Funcionarios;
