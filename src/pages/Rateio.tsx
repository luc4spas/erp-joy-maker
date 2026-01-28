import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/processData';
import { formatDateBR } from '@/lib/dateUtils';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Printer, DollarSign, Users } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';

interface Funcionario { id: string; nome: string; setor: 'Garçom' | 'Cozinha' | 'Administrativo'; frente: 'Japa' | 'Trattoria' | 'Ambas'; ativo: boolean; }
interface Fechamento { id: string; data: string; comissao_japa: number; comissao_trattoria: number; }
interface RateioItem { funcionario: Funcionario; valor: number; }

const Rateio = () => {
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [fechamentos, setFechamentos] = useState<Fechamento[]>([]);
  const [selectedFechamento, setSelectedFechamento] = useState<string>('');
  const [rateio, setRateio] = useState<RateioItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (!authLoading && !user) navigate('/auth'); }, [user, authLoading, navigate]);
  useEffect(() => { if (user) fetchData(); }, [user]);

  const fetchData = async () => {
    setIsLoading(true);
    const [funcRes, fechRes] = await Promise.all([
      supabase.from('funcionarios').select('*').eq('ativo', true),
      supabase.from('fechamentos').select('id, data, comissao_japa, comissao_trattoria').order('data', { ascending: false }).limit(30)
    ]);
    if (funcRes.data) setFuncionarios(funcRes.data as Funcionario[]);
    if (fechRes.data) setFechamentos(fechRes.data as Fechamento[]);
    setIsLoading(false);
  };

  const calcularRateio = (fechamentoId: string) => {
    const fech = fechamentos.find(f => f.id === fechamentoId);
    if (!fech) return;

    const comissaoJapa = Number(fech.comissao_japa);
    const comissaoTrattoria = Number(fech.comissao_trattoria);
    
    // Percentuais: Garçons 4.75%, Cozinha 2.75%, Admin 0.5%
    const japaGarcom = comissaoJapa * (4.75 / 8);
    const japaCozinha = comissaoJapa * (2.75 / 8);
    const japaAdmin = comissaoJapa * (0.5 / 8);
    const trattoriaGarcom = comissaoTrattoria * (4.75 / 8);
    const trattoriaCozinha = comissaoTrattoria * (2.75 / 8);
    const trattoriaAdmin = comissaoTrattoria * (0.5 / 8);

    const garcomJapa = funcionarios.filter(f => f.setor === 'Garçom' && (f.frente === 'Japa' || f.frente === 'Ambas'));
    const garcomTrattoria = funcionarios.filter(f => f.setor === 'Garçom' && (f.frente === 'Trattoria' || f.frente === 'Ambas'));
    const cozinhaJapa = funcionarios.filter(f => f.setor === 'Cozinha' && (f.frente === 'Japa' || f.frente === 'Ambas'));
    const cozinhaTrattoria = funcionarios.filter(f => f.setor === 'Cozinha' && (f.frente === 'Trattoria' || f.frente === 'Ambas'));
    const admin = funcionarios.filter(f => f.setor === 'Administrativo');

    const result: RateioItem[] = [];
    const addedIds = new Set<string>();

    const addToResult = (func: Funcionario, valor: number) => {
      if (addedIds.has(func.id)) {
        const idx = result.findIndex(r => r.funcionario.id === func.id);
        if (idx >= 0) result[idx].valor += valor;
      } else {
        result.push({ funcionario: func, valor });
        addedIds.add(func.id);
      }
    };

    garcomJapa.forEach(f => addToResult(f, japaGarcom / garcomJapa.length));
    garcomTrattoria.forEach(f => addToResult(f, trattoriaGarcom / garcomTrattoria.length));
    cozinhaJapa.forEach(f => addToResult(f, japaCozinha / cozinhaJapa.length));
    cozinhaTrattoria.forEach(f => addToResult(f, trattoriaCozinha / cozinhaTrattoria.length));
    admin.forEach(f => addToResult(f, (japaAdmin + trattoriaAdmin) / admin.length));

    setRateio(result.sort((a, b) => b.valor - a.valor));
  };

  const handlePrint = (item: RateioItem) => {
    const fech = fechamentos.find(f => f.id === selectedFechamento);
    const w = window.open('', '_blank');
    if (w) {
      w.document.write(`<html><head><title>Recibo</title><style>body{font-family:sans-serif;padding:40px}h1{font-size:18px}p{margin:8px 0}.line{border-bottom:1px solid #000;margin:40px 0 10px}</style></head><body>
        <h1>RECIBO DE PAGAMENTO</h1><p><strong>Data:</strong> ${formatDateBR(fech?.data || '')}</p><p><strong>Nome:</strong> ${item.funcionario.nome}</p><p><strong>Setor:</strong> ${item.funcionario.setor}</p><p><strong>Valor:</strong> ${formatCurrency(item.valor)}</p>
        <div class="line"></div><p>Assinatura do Funcionário</p></body></html>`);
      w.document.close();
      w.print();
    }
  };

  if (authLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!user) return null;

  return (
    <AppLayout title="Rateio do Dia" subtitle="Distribuição de comissões por funcionário">
      <div className="space-y-6">
        <div className="bg-card p-4 rounded-xl shadow-card flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="text-sm text-muted-foreground">Selecione o fechamento</label>
            <Select value={selectedFechamento} onValueChange={(v) => { setSelectedFechamento(v); calcularRateio(v); }}>
              <SelectTrigger><SelectValue placeholder="Escolha uma data" /></SelectTrigger>
              <SelectContent>{fechamentos.map((f) => <SelectItem key={f.id} value={f.id}>{formatDateBR(f.data)}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>

        {isLoading ? <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div> : !selectedFechamento ? (
          <div className="text-center py-16 bg-card rounded-2xl shadow-card"><DollarSign className="w-16 h-16 text-muted-foreground mx-auto mb-4" /><p className="text-muted-foreground">Selecione um fechamento para ver o rateio.</p></div>
        ) : rateio.length === 0 ? (
          <div className="text-center py-16 bg-card rounded-2xl shadow-card"><Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" /><p className="text-muted-foreground">Cadastre funcionários ativos para calcular o rateio.</p></div>
        ) : (
          <div className="bg-card rounded-2xl shadow-card overflow-hidden">
            <Table><TableHeader><TableRow><TableHead>Funcionário</TableHead><TableHead>Setor</TableHead><TableHead>Frente</TableHead><TableHead className="text-right">Valor</TableHead><TableHead>Recibo</TableHead></TableRow></TableHeader>
              <TableBody>{rateio.map((r) => (<TableRow key={r.funcionario.id}><TableCell className="font-medium">{r.funcionario.nome}</TableCell><TableCell>{r.funcionario.setor}</TableCell><TableCell>{r.funcionario.frente}</TableCell><TableCell className="text-right font-semibold text-commission-foreground">{formatCurrency(r.valor)}</TableCell><TableCell><Button variant="outline" size="sm" onClick={() => handlePrint(r)}><Printer className="w-4 h-4 mr-1" />Imprimir</Button></TableCell></TableRow>))}</TableBody>
            </Table>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default Rateio;
