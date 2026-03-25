import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export function NovoFornecedorDialog({ open, onOpenChange, onSaved }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    nome: '', cnpj_cpf: '', telefone: '', email: '', banco: '', agencia: '', conta: '',
  });

  const handleSave = async () => {
    if (!form.nome.trim() || !user) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('fornecedores').insert({
        user_id: user.id,
        nome: form.nome,
        cnpj_cpf: form.cnpj_cpf || null,
        telefone: form.telefone || null,
        email: form.email || null,
        banco: form.banco || null,
        agencia: form.agencia || null,
        conta: form.conta || null,
      });
      if (error) throw error;
      toast({ title: 'Fornecedor cadastrado!' });
      setForm({ nome: '', cnpj_cpf: '', telefone: '', email: '', banco: '', agencia: '', conta: '' });
      onSaved();
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo Fornecedor</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Nome *</Label>
            <Input value={form.nome} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>CNPJ/CPF</Label>
              <Input value={form.cnpj_cpf} onChange={e => setForm(p => ({ ...p, cnpj_cpf: e.target.value }))} />
            </div>
            <div>
              <Label>Telefone</Label>
              <Input value={form.telefone} onChange={e => setForm(p => ({ ...p, telefone: e.target.value }))} />
            </div>
          </div>
          <div>
            <Label>Email</Label>
            <Input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Banco</Label>
              <Input value={form.banco} onChange={e => setForm(p => ({ ...p, banco: e.target.value }))} />
            </div>
            <div>
              <Label>Agência</Label>
              <Input value={form.agencia} onChange={e => setForm(p => ({ ...p, agencia: e.target.value }))} />
            </div>
            <div>
              <Label>Conta</Label>
              <Input value={form.conta} onChange={e => setForm(p => ({ ...p, conta: e.target.value }))} />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving || !form.nome.trim()}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Salvar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
