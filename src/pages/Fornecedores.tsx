import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, Loader2, Truck } from 'lucide-react';

interface Fornecedor {
  id: string;
  nome: string;
  cnpj_cpf: string | null;
  telefone: string | null;
  email: string | null;
  banco: string | null;
  agencia: string | null;
  conta: string | null;
  ativo: boolean;
}

export default function Fornecedores() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Fornecedor | null>(null);
  const [form, setForm] = useState({ nome: '', cnpj_cpf: '', telefone: '', email: '', banco: '', agencia: '', conta: '' });

  useEffect(() => { if (user) fetchFornecedores(); }, [user]);

  const fetchFornecedores = async () => {
    setLoading(true);
    const { data } = await supabase.from('fornecedores').select('*').eq('user_id', user!.id).order('nome');
    setFornecedores((data as any) || []);
    setLoading(false);
  };

  const openDialog = (f?: Fornecedor) => {
    if (f) {
      setEditing(f);
      setForm({ nome: f.nome, cnpj_cpf: f.cnpj_cpf || '', telefone: f.telefone || '', email: f.email || '', banco: f.banco || '', agencia: f.agencia || '', conta: f.conta || '' });
    } else {
      setEditing(null);
      setForm({ nome: '', cnpj_cpf: '', telefone: '', email: '', banco: '', agencia: '', conta: '' });
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.nome.trim() || !user) return;
    try {
      const data = {
        nome: form.nome,
        cnpj_cpf: form.cnpj_cpf || null,
        telefone: form.telefone || null,
        email: form.email || null,
        banco: form.banco || null,
        agencia: form.agencia || null,
        conta: form.conta || null,
      };
      if (editing) {
        await supabase.from('fornecedores').update(data).eq('id', editing.id);
      } else {
        await supabase.from('fornecedores').insert({ ...data, user_id: user.id });
      }
      toast({ title: editing ? 'Fornecedor atualizado!' : 'Fornecedor cadastrado!' });
      setDialogOpen(false);
      fetchFornecedores();
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    }
  };

  const toggleAtivo = async (f: Fornecedor) => {
    await supabase.from('fornecedores').update({ ativo: !f.ativo }).eq('id', f.id);
    fetchFornecedores();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este fornecedor?')) return;
    const { error } = await supabase.from('fornecedores').delete().eq('id', id);
    if (error) {
      toast({ title: 'Erro', description: 'Fornecedor vinculado a contas a pagar. Desative-o em vez de excluir.', variant: 'destructive' });
      return;
    }
    toast({ title: 'Fornecedor excluído!' });
    fetchFornecedores();
  };

  return (
    <AppLayout title="Fornecedores" subtitle="Cadastro de fornecedores">
      <div className="space-y-6">
        <div className="flex justify-end">
          <Button onClick={() => openDialog()}>
            <Plus className="w-4 h-4 mr-2" /> Novo Fornecedor
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : fornecedores.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Truck className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Nenhum fornecedor cadastrado.</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="pt-6">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>CNPJ/CPF</TableHead>
                      <TableHead>Contato</TableHead>
                      <TableHead>Banco</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-center">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fornecedores.map(f => (
                      <TableRow key={f.id}>
                        <TableCell className="font-medium">{f.nome}</TableCell>
                        <TableCell className="font-mono text-sm">{f.cnpj_cpf || '-'}</TableCell>
                        <TableCell className="text-sm">{f.telefone || f.email || '-'}</TableCell>
                        <TableCell className="text-sm">{f.banco ? `${f.banco} Ag:${f.agencia} Cc:${f.conta}` : '-'}</TableCell>
                        <TableCell>
                          <Badge className="cursor-pointer" variant={f.ativo ? 'default' : 'secondary'} onClick={() => toggleAtivo(f)}>
                            {f.ativo ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-center gap-1">
                            <Button variant="ghost" size="sm" onClick={() => openDialog(f)}><Pencil className="w-4 h-4" /></Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDelete(f.id)}><Trash2 className="w-4 h-4" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Fornecedor' : 'Novo Fornecedor'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div><Label>Nome *</Label><Input value={form.nome} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>CNPJ/CPF</Label><Input value={form.cnpj_cpf} onChange={e => setForm(p => ({ ...p, cnpj_cpf: e.target.value }))} /></div>
              <div><Label>Telefone</Label><Input value={form.telefone} onChange={e => setForm(p => ({ ...p, telefone: e.target.value }))} /></div>
            </div>
            <div><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} /></div>
            <div className="grid grid-cols-3 gap-4">
              <div><Label>Banco</Label><Input value={form.banco} onChange={e => setForm(p => ({ ...p, banco: e.target.value }))} /></div>
              <div><Label>Agência</Label><Input value={form.agencia} onChange={e => setForm(p => ({ ...p, agencia: e.target.value }))} /></div>
              <div><Label>Conta</Label><Input value={form.conta} onChange={e => setForm(p => ({ ...p, conta: e.target.value }))} /></div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleSave} disabled={!form.nome.trim()}>Salvar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
