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
import { Loader2, Plus, Trash2, ChevronLeft, ChevronRight, Calendar, Upload, Check, AlertCircle } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format, startOfMonth, addMonths, subMonths, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatCurrency } from '@/lib/processData';
import * as XLSX from 'xlsx';

// ... interfaces permanecem as mesmas ...

const Lancamentos = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [importPreview, setImportPreview] = useState<ImportPreview[]>([]);
  const [isSavingImport, setIsSavingImport] = useState(false);
  
  // Estado que controla o mês de referência exibido
  const [monthStart, setMonthStart] = useState(() => startOfMonth(new Date()));
  
  const [form, setForm] = useState({ 
    employee_id: '', 
    transaction_type: 'vale' as any, 
    amount: '', 
    description: '' 
  });

  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const { toast } = useToast();

  const canCreate = hasPermission('folha_pagamento', 'create');
  const canDelete = hasPermission('folha_pagamento', 'delete');

  // ESSENCIAL: Dispara a busca sempre que o usuário trocar o mês nas setas
  useEffect(() => { 
    if (user) fetchData(); 
  }, [user, monthStart]);

  const fetchData = async () => {
    setIsLoading(true);
    // Formata o primeiro dia do mês selecionado para o filtro do banco (YYYY-MM-DD)
    const refMonth = format(monthStart, 'yyyy-MM-dd');
    
    const [funcRes, txRes] = await Promise.all([
      supabase.from('funcionarios').select('*').eq('ativo', true).order('nome'),
      supabase.from('payroll_transactions')
        .select('*')
        .eq('reference_month', refMonth) // Filtra pelo mês selecionado
        .order('created_at', { ascending: false }),
    ]);

    if (funcRes.data) setFuncionarios(funcRes.data as Funcionario[]);
    if (txRes.data) {
      const funcsMap = new Map((funcRes.data || []).map((f: any) => [f.id, f]));
      setTransactions((txRes.data as any[]).map(tx => ({ 
        ...tx, 
        funcionario: funcsMap.get(tx.employee_id) 
      })));
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
          if (!row || row[0] === undefined) continue;
          
          const nomeBruto = row[0]?.toString() || "";
          const nomePlanilhaNorm = normalize(nomeBruto);
          const partesPlanilha = nomePlanilhaNorm.split(' ');
          const primeiroUltimoPlanilha = `${partesPlanilha[0]} ${partesPlanilha[partesPlanilha.length - 1]}`;

          const valorNoturnoRaw = row[11];
          const horas = typeof valorNoturnoRaw === 'string' 
            ? parseFloat(valorNoturnoRaw.replace(',', '.')) 
            : parseFloat(valorNoturnoRaw) || 0;

          if (horas > 0) {
            const func = funcionarios.find(f => {
              const nomeSistemaNorm = normalize(f.nome);
              if (nomePlanilhaNorm.includes(nomeSistemaNorm) || nomeSistemaNorm.includes(nomePlanilhaNorm)) return true;
              
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
        toast({ variant: "destructive", title: "Erro ao processar arquivo" });
      }
    };
    reader.readAsArrayBuffer(file);
    event.target.value = '';
  };

  const confirmImport = async () => {
    setIsSavingImport(true);
    // Usa o mês que está na tela no momento da importação
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
        description: `Importação Ponto - ${format(monthStart, 'MM/yyyy')}`
      }));

      const { error } = await supabase.from('payroll_transactions').insert(inserts);
      if (error) throw error;

      toast({ title: "Sucesso", description: "Lançamentos importados para " + format(monthStart, 'MMMM', { locale: ptBR }) });
      setPreviewOpen(false);
      fetchData();
    } catch (err) {
      toast({ variant: "destructive", title: "Erro ao salvar" });
    } finally {
      setIsSavingImport(false);
    }
  };

  const mesAnoLabel = format(monthStart, "MMMM 'de' yyyy", { locale: ptBR });

  return (
    <AppLayout title="Lançamentos" subtitle="Gestão de folha e adicionais">
      <div className="space-y-6">
        <div className="bg-card rounded-xl p-4 shadow-card border border-border flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {/* Botão Voltar Mês */}
            <Button 
              variant="outline" 
              size="icon" 
              onClick={() => setMonthStart(prev => startOfMonth(subMonths(prev, 1)))}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            
            <div className="text-center min-w-[150px]">
              <p className="text-xs text-muted-foreground font-medium">Mês de Referência</p>
              <p className="text-lg font-semibold text-foreground capitalize">{mesAnoLabel}</p>
            </div>

            {/* Botão Próximo Mês */}
            <Button 
              variant="outline" 
              size="icon" 
              onClick={() => setMonthStart(prev => startOfMonth(addMonths(prev, 1)))}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
            
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setMonthStart(startOfMonth(new Date()))}
              className="ml-2 text-xs"
            >
              Ir para Hoje
            </Button>
          </div>

          <div className="flex gap-2">
            {/* ... botões de Novo e Importar permanecem iguais ... */}
          </div>
        </div>

        {/* ... Restante do Dashboard e Tabela ... */}
      </div>
    </AppLayout>
  );
};

export default Lancamentos;
