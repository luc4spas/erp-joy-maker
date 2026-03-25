import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { useToast } from '@/hooks/use-toast';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Pencil, Trash2, Loader2, Building2 } from 'lucide-react';

interface Empresa {
  id: string;
  nome: string;
  cnpj: string | null;
  tipo: string;
  ativo: boolean;
}

export default function Empresas() {
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const { toast } = useToast();
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Empresa | null>(null);
  const [form, setForm] = useState({ nome: '', cnpj: '', tipo: 'filial' });

  const canCreate = hasPermission('administracao', 'create');
  const canEdit = hasPermission('administracao', 'edit');
  const canDelete = hasPermission('administracao', 'delete');

  useEffect(() => { if (user) fetchEmpresas(); }, [user]);

  const fetchEmpresas = async () => {
    setLoading(true);
    const { data } = await supabase.from('empresas').select('*').eq('user_id', user!.id).order('nome');
    setEmpresas((data as any) || []);
    setLoading(false);
  };

  const openDialog = (empresa?: Empresa) => {
    if (empresa) {
      setEditing(empresa);
      setForm({ nome: empresa.nome, cnpj: empresa.cnpj || '', tipo: empresa.tipo });
    } else {
      setEditing(null);
      setForm({ nome: '', cnpj: '', tipo: 'filial' });
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.nome.trim() || !user) return;
    try {
      if (editing) {
        await supabase.from('empresas').update({ nome: form.nome, cnpj: form.cnpj || null, tipo: form.tipo }).eq('id', editing.id);
      } else {
        await supabase.from('empresas').insert({ user_id: user.id, nome: form.nome, cnpj: form.cnpj || null, tipo: form.tipo });
      }
      toast({ title: editing ? 'Empresa atualizada!' : 'Empresa cadastrada!' });
      setDialogOpen(false);
      fetchEmpresas();
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    }
  };

  const toggleAtivo = async (empresa: Empresa) => {
    await supabase.from('empresas').update({ ativo: !empresa.ativo }).eq('id', empresa.id);
    fetchEmpresas();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir esta empresa?')) return;
    await supabase.from('empresas').delete().eq('id', id);
    toast({ title: 'Empresa excluída!' });
    fetchEmpresas();
  };

  return (
    <AppLayout title="Empresas" subtitle="Cadastro de empresas e filiais">
      <div className="space-y-6">
        {canCreate && (
          <div className="flex justify-end">
            <Button onClick={() => openDialog()}><Plus className="w-4 h-4 mr-2" /> Nova Empresa</Button>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : empresas.length === 0 ? (
          <Card><CardContent className="py-12 text-center"><Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" /><p className="text-muted-foreground">Nenhuma empresa cadastrada.</p></CardContent></Card>
        ) : (
          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>CNPJ</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Status</TableHead>
                    {(canEdit || canDelete) && <TableHead className="text-center">Ações</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {empresas.map(e => (
                    <TableRow key={e.id}>
                      <TableCell className="font-medium">{e.nome}</TableCell>
                      <TableCell className="font-mono text-sm">{e.cnpj || '-'}</TableCell>
                      <TableCell className="capitalize">{e.tipo}</TableCell>
                      <TableCell>
                        <Badge className="cursor-pointer" variant={e.ativo ? 'default' : 'secondary'} onClick={() => canEdit && toggleAtivo(e)}>
                          {e.ativo ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </TableCell>
                      {(canEdit || canDelete) && (
                        <TableCell>
                          <div className="flex justify-center gap-1">
                            {canEdit && <Button variant="ghost" size="sm" onClick={() => openDialog(e)}><Pencil className="w-4 h-4" /></Button>}
                            {canDelete && <Button variant="ghost" size="sm" onClick={() => handleDelete(e.id)}><Trash2 className="w-4 h-4" /></Button>}
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Editar Empresa' : 'Nova Empresa'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Nome *</Label><Input value={form.nome} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))} /></div>
            <div><Label>CNPJ</Label><Input value={form.cnpj} onChange={e => setForm(p => ({ ...p, cnpj: e.target.value }))} /></div>
            <div>
              <Label>Tipo</Label>
              <Select value={form.tipo} onValueChange={v => setForm(p => ({ ...p, tipo: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="matriz">Matriz</SelectItem>
                  <SelectItem value="filial">Filial</SelectItem>
                </SelectContent>
              </Select>
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
