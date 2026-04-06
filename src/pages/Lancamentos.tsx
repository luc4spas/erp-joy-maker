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
import { Loader2, Plus, Trash2, ChevronLeft, ChevronRight, Calendar, Upload, Check, AlertCircle, DollarSign } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format, startOfMonth, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatCurrency } from '@/lib/processData';
import * as XLSX from 'xlsx';

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
  description: string | null;
  reference_month: string;
  created_at: string;
  funcionario?: Funcionario;
}

interface ImportPreview {
  nomePlanilha: string;
  funcionarioId?: string;
  funcionarioNome?: string;
  horas: number;
  status: 'sucesso' | 'erro';
}

const typeLabels: Record<string, string> = { 
  vale: 'Vale', 
  bonus: 'Bônus', 
  desconto: 'Desconto',
  adicional_noturno: 'Adic. Noturno'
};

const typeColors: Record<string, string> = {
  vale: 'bg-destructive/10 text-destructive',
  bonus: 'bg-success/20 text-success',
  desconto: 'bg-muted text-muted-foreground',
  adicional_noturno: 'bg-blue-500/10 text-blue-600',
};

const Lancamentos = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [importPreview, setImportPreview] = useState<ImportPreview[]>([]);
  const [isSavingImport, setIsSavingImport] = useState(false);
  const [monthStart, setMonthStart] = useState(() => startOfMonth(new Date()));
  const [form, setForm] = useState({ 
    employee_id: '', 
    transaction_type: 'vale' as 'vale' | 'bonus' | 'desconto' | 'adicional_noturno', 
    amount: '', 
    description: '' 
  });

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

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

        const normalize = (txt: string) => 
          txt.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim().replace(/\s+/g, ' ');

        const previewData: ImportPreview[] = [];

        for (const row of jsonData.slice(1)) {
          if (!row || row.length === 0) continue;
          
          const nomeBruto = row[0]?.toString() || "";
          if (!nomeBruto) continue;

          const nomePlanilhaNorm = normalize(nomeBruto);
          const partesPlanilha = nomePlanilhaNorm.split(' ');
          const primeiroUltimoPlanilha = `${partesPlanilha[0]} ${partesPlanilha[partesPlanilha.length - 1]}`;

          const valorNoturnoRaw = row[11];
          const horas = typeof valorNoturnoRaw === 'string' 
            ? parseFloat(valorNoturnoRaw.replace(',', '.')) 
            : parseFloat(valorNoturnoRaw) || 0;

          if (horas > 0) {
            // Busca Inteligente
            const func = funcionarios.find(f => {
              const nomeSistemaNorm = normalize(f.nome);
              
              // 1. Tenta match exato ou parcial (contido um no outro)
              if (nomePlanilhaNorm.includes(nomeSistemaNorm) || nomeSistemaNorm.includes(nomePlanilhaNorm)) return true;
              
              // 2. Tenta match por Primeiro + Último nome (resolve as abreviações do N. Silva)
              const partesSistema = nomeSistemaNorm.split(' ');
              const primeiroUltimoSistema = `${partesSistema[0]} ${partesSistema[partesSistema.length - 1]}`;
              
              return primeiroUltimoPlanilha === primeiroUltimoSistema;
            });

            previewData.push({
              nomePlanilha: nomeBruto,
              funcionarioId: func?.id,
              funcionarioNome: func?.nome,
              horas: horas,
              status: func ? 'sucesso' : 'erro'
            });
          }
        }

        setImportPreview(previewData);
        setPreviewOpen(true);
      } catch (err) {
        toast({ variant: "destructive", title: "Erro ao ler Excel" });
      }
    };
    reader.readAsArrayBuffer(file);
    event.target.value = '';
  };

  const confirmImport = async () => {
    setIsSavingImport(true);
    const refMonth = format(monthStart, 'yyyy-MM-dd');
    const validImports = importPreview.filter(p => p.status === 'sucesso');

    try {
      const inserts = validImports.map(item => ({
        user_id: user?.id,
        employee_id: item.funcionarioId,
        transaction_type: 'adicional_noturno',
        hours_quantity: item.horas,
        amount: 0,
        reference_month: refMonth,
        description: 'Importação via Excel'
      }));

      const { error } = await supabase.from('payroll_transactions').insert(inserts);
      if (error) throw error;

      toast({ title: "Sucesso", description: `${validImports.length} lançamentos salvos!` });
      setPreviewOpen(false);
      fetchData();
    } catch (err) {
      toast({ variant: "destructive", title: "Erro ao salvar importação" });
    } finally {
      setIsSavingImport(false);
    }
  };

  const handleSubmit = async () => {
    if (!user || !form.employee_id || !form.amount) return;
    const refMonth = format(monthStart, 'yyyy-MM-dd');
    const valor = parseFloat(form.amount.replace(',', '.'));
    const isNoturno = form.transaction_type === 'adicional_noturno';

    try {
      const { error } = await supabase.from('payroll_transactions').insert({
        user_id: user.id,
        employee_id: form.employee_id,
        transaction_type: form.transaction_type,
        amount: isNoturno ? 0 : valor,
        hours_quantity: isNoturno ? valor : 0,
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
  const totals = transactions.reduce((acc, t) => {
    if (t.transaction_type === 'vale') acc.vales += Number(t.amount);
    if (t.transaction_type === 'bonus') acc.bonus += Number(t.amount);
    if (t.transaction_type === 'desconto') acc.descontos += Number(t.amount);
    return acc;
  }, { vales: 0, bonus: 0, descontos: 0 });

  if (authLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <AppLayout title="Lançamentos" subtitle="Gestão de folha e adicionais">
      <div className="space-y-6">
        <div className="bg-card rounded-xl p-4 shadow-card border border-border flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="icon" onClick={() => setMonthStart(startOfMonth(subMonths(monthStart, 1)))}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Mês de Referência</p>
              <p className="text-lg font-semibold text-foreground capitalize">{mesAnoLabel}</p>
            </div>
            <Button variant="outline" size="icon" onClick={() => setMonthStart(startOfMonth(addMonths(monthStart, 1)))}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex gap-2">
            {canCreate && (
              <>
                <Button variant="outline" className="relative cursor-pointer">
                  <Upload className="w-4 h-4 mr-2" /> Importar Excel
                  <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept=".xlsx, .xls" onChange={handleFileSelect} />
                </Button>
                
                <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
                  <DialogContent className="max-w-2xl h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
                    <DialogHeader className="p-6 pb-2">
                      <DialogTitle>Conferir Importação ({mesAnoLabel})</DialogTitle>
                    </DialogHeader>
                    
                    <div className="flex-1 overflow-hidden px-6">
                      <ScrollArea className="h-full border rounded-md">
                        <Table>
                          <TableHeader className="sticky top-0 bg-background z-10">
                            <TableRow>
                              <TableHead>Nome na Planilha</TableHead>
                              <TableHead>No Sistema</TableHead>
                              <TableHead className="text-right">Horas</TableHead>
                              <TableHead className="w-10"></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {importPreview.map((item, idx) => (
                              <TableRow key={idx} className={item.status === 'erro' ? 'bg-destructive/5' : ''}>
                                <TableCell className="text-sm py-2">{item.nomePlanilha}</TableCell>
                                <TableCell className="text-sm font-medium py-2">
                                  {item.funcionarioNome || (
                                    <span className="text-destructive flex items-center gap-1">
                                      <AlertCircle className="w-3 h-3" /> Não encontrado
                                    </span>
                                  )}
                                </TableCell>
                                <TableCell className="text-right font-mono py-2">{item.horas}h</TableCell>
                                <TableCell className="py-2">
                                  {item.status === 'sucesso' ? (
                                    <Check className="w-4 h-4 text-success" />
                                  ) : (
                                    <AlertCircle className="w-4 h-4 text-destructive" />
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </ScrollArea>
                    </div>

                    <div className="p-6 pt-2 space-y-4">
                      <div className="bg-muted/30 p-3 rounded-lg text-sm">
                        <div className="flex justify-between font-medium">
                          <span>Total lido:</span>
                          <span>{importPreview.length} registros</span>
                        </div>
                        <div className="flex justify-between text-success font-medium">
                          <span>Prontos para salvar:</span>
                          <span>{importPreview.filter(p => p.status === 'sucesso').length}</span>
                        </div>
                        <div className="flex justify-between text-destructive font-medium">
                          <span>Inconsistentes:</span>
                          <span>{importPreview.filter(p => p.status === 'erro').length}</span>
                        </div>
                      </div>
                      
                      <DialogFooter className="flex gap-2 sm:gap-0">
                        <Button variant="ghost" onClick={() => setPreviewOpen(false)} className="flex-1 sm:flex-none">
                          Cancelar
                        </Button>
                        <Button 
                          onClick={confirmImport} 
                          className="flex-1 sm:flex-none"
                          disabled={isSavingImport || importPreview.filter(p => p.status === 'sucesso').length === 0}
                        >
                          {isSavingImport ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
                          Confirmar e Salvar
                        </Button>
                      </DialogFooter>
                    </div>
                  </DialogContent>
                </Dialog>

                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="gap-2"><Plus className="w-4 h-4" /> Novo</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Novo Lançamento</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-4">
                      <div>
                        <Label>Colaborador</Label>
                        <Select value={form.employee_id} onValueChange={(v) => setForm({ ...form, employee_id: v })}>
                          <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                          <SelectContent>
                            {funcionarios.map(f => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}
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
                              <SelectItem value="adicional_noturno">Adic. Noturno</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>{form.transaction_type === 'adicional_noturno' ? 'Horas' : 'Valor (R$)'}</Label>
                          <Input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0,00" />
                        </div>
                      </div>
                      <Button onClick={handleSubmit} className="w-full">Salvar Lançamento</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-card rounded-xl p-4 border border-border shadow-sm">
            <p className="text-xs text-muted-foreground">Vales</p>
            <p className="text-2xl font-bold text-destructive">{formatCurrency(totals.vales)}</p>
          </div>
          <div className="bg-card rounded-xl p-4 border border-border shadow-sm">
            <p className="text-xs text-muted-foreground">Bônus</p>
            <p className="text-2xl font-bold text-success">{formatCurrency(totals.bonus)}</p>
          </div>
          <div className="bg-card rounded-xl p-4 border border-border shadow-sm">
            <p className="text-xs text-muted-foreground">Descontos</p>
            <p className="text-2xl font-bold text-muted-foreground">{formatCurrency(totals.descontos)}</p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : (
          <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Valor/Qtd</TableHead>
                  {canDelete && <TableHead className="w-10"></TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={canDelete ? 4 : 3} className="text-center py-8 text-muted-foreground italic">
                      Nenhum lançamento encontrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  transactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell className="font-medium">{tx.funcionario?.nome || 'N/A'}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={typeColors[tx.transaction_type]}>
                          {typeLabels[tx.transaction_type]}
                        </Badge>
                      </TableCell>
                      <TableCell className={`text-right tabular-nums font-semibold ${tx.transaction_type === 'vale' || tx.transaction_type === 'desconto' ? 'text-destructive' : 'text-success'}`}>
                        {tx.transaction_type === 'adicional_noturno' ? `${tx.hours_quantity}h` : formatCurrency(tx.amount)}
                      </TableCell>
                      {canDelete && (
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(tx.id)}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default Lancamentos;
