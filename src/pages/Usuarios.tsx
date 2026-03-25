import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, Pencil, Trash2, UserPlus, Shield } from 'lucide-react';

interface Profile {
  id: string;
  user_id: string;
  nome: string;
  email: string;
  unidade: string;
  cargo: string;
  ativo: boolean;
  created_at: string;
  last_sign_in?: string | null;
  email_confirmed?: boolean;
}

interface AccessGroup {
  id: string;
  name: string;
}

const UNIDADES = ['Todas', 'Trattoria', 'Japa', 'Hippocampus'];

const Usuarios = () => {
  const [users, setUsers] = useState<Profile[]>([]);
  const [groups, setGroups] = useState<AccessGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<Profile | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [unidade, setUnidade] = useState('Todas');
  const [groupId, setGroupId] = useState('');

  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => { if (user) { fetchUsers(); fetchGroups(); } }, [user]);

  const fetchGroups = async () => {
    const { data } = await supabase.from('access_groups').select('id, name').order('name');
    if (data) setGroups(data);
  };

  const callEdgeFunction = async (body: any) => {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    return data;
  };

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const data = await callEdgeFunction({ action: 'list' });
      setUsers(data);
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const openCreate = () => {
    setEditingUser(null);
    setNome(''); setEmail(''); setPassword(''); setUnidade('Todas'); setGroupId('');
    setDialogOpen(true);
  };

  const openEdit = (u: Profile) => {
    setEditingUser(u);
    setNome(u.nome); setEmail(u.email); setPassword(''); setUnidade(u.unidade); setGroupId('');
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!nome || !email) {
      toast({ title: 'Erro', description: 'Nome e e-mail são obrigatórios.', variant: 'destructive' });
      return;
    }
    if (!editingUser && !password) {
      toast({ title: 'Erro', description: 'Senha é obrigatória para novos usuários.', variant: 'destructive' });
      return;
    }
    if (!editingUser && !groupId) {
      toast({ title: 'Erro', description: 'Selecione um grupo de acesso.', variant: 'destructive' });
      return;
    }

    setIsSaving(true);
    try {
      const selectedGroup = groups.find(g => g.id === groupId);
      const cargo = selectedGroup?.name || 'Operador';

      if (editingUser) {
        await callEdgeFunction({
          action: 'update',
          user_id: editingUser.user_id,
          nome, email, unidade, cargo, ativo: editingUser.ativo,
          ...(password ? { password } : {}),
        });
        toast({ title: 'Sucesso', description: 'Usuário atualizado.' });
      } else {
        await callEdgeFunction({ action: 'create', email, password, nome, unidade, cargo, group_id: groupId });
        toast({ title: 'Sucesso', description: 'Usuário criado.' });
      }
      setDialogOpen(false);
      fetchUsers();
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (u: Profile) => {
    if (!confirm(`Deseja excluir o usuário "${u.nome}"?`)) return;
    try {
      await callEdgeFunction({ action: 'delete', user_id: u.user_id });
      toast({ title: 'Sucesso', description: 'Usuário excluído.' });
      fetchUsers();
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    }
  };

  const handleToggleAtivo = async (u: Profile) => {
    try {
      await callEdgeFunction({
        action: 'update',
        user_id: u.user_id,
        nome: u.nome, email: u.email, unidade: u.unidade, cargo: u.cargo,
        ativo: !u.ativo,
      });
      toast({ title: 'Sucesso', description: `Usuário ${!u.ativo ? 'ativado' : 'desativado'}.` });
      fetchUsers();
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    }
  };

  const cargoColor = (cargo: string) => {
    switch (cargo) {
      case 'Admin': return 'destructive';
      case 'Gerente': return 'default';
      case 'Financeiro': return 'secondary';
      default: return 'outline';
    }
  };

  return (
    <AppLayout title="Gestão de Usuários" subtitle="Cadastro e controle de acesso da equipe">
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            <span className="text-sm text-muted-foreground">{users.length} usuários cadastrados</span>
          </div>
          <Button onClick={openCreate} className="gap-2">
            <UserPlus className="w-4 h-4" /> Novo Usuário
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Unidade</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map(u => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.nome}</TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>{u.unidade}</TableCell>
                    <TableCell>
                      <Badge variant={cargoColor(u.cargo) as any}>{u.cargo}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={u.ativo ? 'default' : 'secondary'}
                        className="cursor-pointer"
                        onClick={() => handleToggleAtivo(u)}
                      >
                        {u.ativo ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(u)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(u)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {users.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Nenhum usuário cadastrado.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingUser ? 'Editar Usuário' : 'Novo Usuário'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome</Label>
              <Input value={nome} onChange={e => setNome(e.target.value)} placeholder="Nome completo" />
            </div>
            <div>
              <Label>E-mail</Label>
              <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@exemplo.com" />
            </div>
            <div>
              <Label>{editingUser ? 'Nova Senha (deixe vazio para manter)' : 'Senha'}</Label>
              <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
            </div>
            <div>
              <Label>Unidade Vinculada</Label>
              <Select value={unidade} onValueChange={setUnidade}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {UNIDADES.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Grupo de Acesso</Label>
              <Select value={groupId} onValueChange={setGroupId}>
                <SelectTrigger><SelectValue placeholder="Selecione o grupo" /></SelectTrigger>
                <SelectContent>
                  {groups.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingUser ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default Usuarios;