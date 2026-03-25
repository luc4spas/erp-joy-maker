import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/processData';
import { formatDateBR } from '@/lib/dateUtils';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Loader2, Printer, Calendar, FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks } from 'date-fns';
import { SectorTotalsSummary } from '@/components/rateio/SectorTotalsSummary';
import { CommissionInputSummary } from '@/components/rateio/CommissionInputSummary';
import { SectorDistributionTable } from '@/components/rateio/SectorDistributionTable';

interface Funcionario {
  id: string;
  nome: string;
  setor: 'Garçom' | 'Cozinha' | 'Administrativo';
  frente: 'Japa' | 'Trattoria' | 'Ambas';
  ativo: boolean;
}

interface Fechamento {
  id: string;
  data: string;
  comissao_japa: number;
  comissao_trattoria: number;
  japa_taxa: number;
  trattoria_taxa: number;
}

interface RateioItem {
  funcionario: Funcionario;
  valor: number;
  valorJapa: number;
  valorTrattoria: number;
  diasTrabalhados: number;
  totalDias: number;
  pago: boolean;
  pagamentoId?: string;
}

const Rateio = () => {
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [fechamentos, setFechamentos] = useState<Fechamento[]>([]);
  const [rateio, setRateio] = useState<RateioItem[]>([]);
  const [sectorTotals, setSectorTotals] = useState({
    garcomJapa: 0, cozinhaJapa: 0, garcomTrattoria: 0, cozinhaTrattoria: 0, caixaAdmCumins: 0, empresa: 0
  });
  const [sectorCounts, setSectorCounts] = useState({
    garcomJapa: 0, cozinhaJapa: 0, garcomTrattoria: 0, cozinhaTrattoria: 0, caixaAdmCumins: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeek(new Date(), { weekStartsOn: 0 }));
  
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 0 });

  // Funções de Estilização
  const getBadgeStyle = (func: Funcionario) => {
    if (func.setor === 'Administrativo') return "bg-slate-600 text-white border-none";
    
    switch (func.frente) {
      case 'Japa':
        return "bg-red-100 text-red-800 border-red-200";
      case 'Trattoria':
        return "bg-emerald-100 text-emerald-800 border-emerald-200";
      case 'Ambas':
        return "bg-blue-100 text-blue-800 border-blue-200";
      default:
        return "bg-secondary";
    }
  };

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) fetchData();
  }, [user, weekStart]);

  const fetchData = async () => {
    setIsLoading(true);
    const startDateStr = format(weekStart, 'yyyy-MM-dd');
    const endDateStr = format(weekEnd, 'yyyy-MM-dd');

    const [funcRes, fechRes, pagRes] = await Promise.all([
      supabase.from('funcionarios').select('*').eq('ativo', true),
      supabase.from('fechamentos')
        .select('*')
        .gte('data', startDateStr)
        .lte('data', endDateStr)
        .order('data', { ascending: true }),
      supabase.from('pagamentos_funcionarios')
        .select('*')
        .gte('data', startDateStr)
        .lte('data', endDateStr)
    ]);

    if (funcRes.data && fechRes.data) {
      setFuncionarios(funcRes.data as Funcionario[]);
      setFechamentos(fechRes.data as Fechamento[]);
      
      const pagMap: Record<string, { id: string; pago: boolean }> = {};
      if (pagRes.data) {
        pagRes.data.forEach((p) => {
          pagMap[p.funcionario_id] = { id: p.id, pago: p.pago };
        });
      }
      
      calcularRateioSemanal(fechRes.data as Fechamento[], funcRes.data as Funcionario[], pagMap);
    }
    setIsLoading(false);
  };

  const calcularRateioSemanal = (fechs: Fechamento[], funcs: Funcionario[], pagMap: any) => {
    if (fechs.length === 0) {
      setRateio([]);
      return;
    }

    const totalCJapa = fechs.reduce((sum, f) => sum + Number(f.comissao_japa || 0), 0);
    const totalCTrattoria = fechs.reduce((sum, f) => sum + Number(f.comissao_trattoria || 0), 0);
    const totalC8 = totalCJapa + totalCTrattoria;
    const totalT = fechs.reduce((sum, f) => sum + Number(f.japa_taxa || 0) + Number(f.trattoria_taxa || 0), 0);

    // Percentuais fixos do rateio
    const pGarcom = 0.475 / 0.8; 
    const pCozinha = 0.275 / 0.8; 
    const pAdmin = 0.05 / 0.8; 

    const japaG = totalCJapa * pGarcom;
    const japaC = totalCJapa * pCozinha;
    const tratG = totalCTrattoria * pGarcom;
    const tratC = totalCTrattoria * pCozinha;
    const admV = totalC8 * pAdmin;

    const gJFuncs = funcs.filter(f => f.setor === 'Garçom' && (f.frente === 'Japa' || f.frente === 'Ambas'));
    const gTFuncs = funcs.filter(f => f.setor === 'Garçom' && (f.frente === 'Trattoria' || f.frente === 'Ambas'));
    const cJFuncs = funcs.filter(f => f.setor === 'Cozinha' && (f.frente === 'Japa' || f.frente === 'Ambas'));
    const cTFuncs = funcs.filter(f => f.setor === 'Cozinha' && (f.frente === 'Trattoria' || f.frente === 'Ambas'));
    const admFuncs = funcs.filter(f => f.setor === 'Administrativo');

    setSectorCounts({
      garcomJapa: gJFuncs.length, cozinhaJapa: cJFuncs.length,
      garcomTrattoria: gTFuncs.length, cozinhaTrattoria: cTFuncs.length,
      caixaAdmCumins: admFuncs.length
    });

    setSectorTotals({
      garcomJapa: japaG, cozinhaJapa: japaC,
      garcomTrattoria: tratG, cozinhaTrattoria: tratC,
      caixaAdmCumins: admV, empresa: totalT - totalC8
    });

    const items: Map<string, RateioItem> = new Map();
    const process = (f: Funcionario, vJ: number, vT: number) => {
      const ex = items.get(f.id);
      if (ex) { ex.valorJapa += vJ; ex.valorTrattoria += vT; ex.valor = ex.valorJapa + ex.valorTrattoria; }
      else { items.set(f.id, { funcionario: f, valor: vJ + vT, valorJapa: vJ, valorTrattoria: vT, diasTrabalhados: fechs.length, totalDias: fechs.length, pago: pagMap[f.id]?.pago || false, pagamentoId: pagMap[f.id]?.id }); }
    };

    gJFuncs.forEach(f => process(f, japaG / gJFuncs.length, 0));
    gTFuncs.forEach(f => process(f, 0, tratG / gTFuncs.length));
    cJFuncs.forEach(f => process(f, japaC / cJFuncs.length, 0));
    cTFuncs.forEach(f => process(f, 0, tratC / cTFuncs.length));
    admFuncs.forEach(f => process(f, (admV / admFuncs.length) * (totalCJapa / totalC8), (admV / admFuncs.length) * (totalCTrattoria / totalC8)));

    setRateio(Array.from(items.values()).sort((a, b) => b.valor - a.valor));
  };

  const togglePago = async (item: RateioItem) => {
    const newStatus = !item.pago;
    try {
      if (item.pagamentoId) {
        await supabase.from('pagamentos_funcionarios').update({ pago: newStatus }).eq('id', item.pagamentoId);
      } else {
        await supabase.from('pagamentos_funcionarios').insert({ user_id: user?.id, funcionario_id: item.funcionario.id, valor: item.valor, data: format(weekStart, 'yyyy-MM-dd'), pago: newStatus });
      }
      fetchData();
      toast({ title: newStatus ? "Pago!" : "Pendente" });
    } catch (e) { toast({ title: "Erro", variant: "destructive" }); }
  };

  const handlePrintAll = () => {
    const w = window.open('', '_blank');
    if (!w) return;
    const content = rateio.map(item => `
      <div style="page-break-after: always; padding: 30px; font-family: sans-serif; border: 1px solid #eee;">
        <h2 style="text-align:center">RECIBO DE COMISSÃO</h2>
        <p><strong>Colaborador:</strong> ${item.funcionario.nome}</p>
        <p><strong>Setor:</strong> ${item.funcionario.setor} (${item.funcionario.frente})</p>
        <p><strong>Período:</strong> ${format(weekStart, "dd/MM")} a ${format(weekEnd, "dd/MM/yyyy")}</p>
        <div style="background:#f9f9f9; padding:15px; margin:20px 0">
          <p>Valor Japa: ${formatCurrency(item.valorJapa)}</p>
          <p>Valor Trattoria: ${formatCurrency(item.valorTrattoria)}</p>
          <p><strong>TOTAL: ${formatCurrency(item.valor)}</strong></p>
        </div>
        <div style="margin-top:50px; border-top:1px solid #000; text-align:center">Assinatura</div>
      </div>
    `).join('');
    w.document.write(`<html><body>${content}</body></html>`);
    w.document.close();
    w.print();
  };

  if (authLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>;

  return (
    <AppLayout title="Rateio Semanal" subtitle="Controle de Comissões">
      <div className="space-y-6">
        
        {/* Header de Ações */}
        <div className="bg-card p-4 rounded-xl border flex justify-between items-center shadow-sm">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => setWeekStart(subWeeks(weekStart, 1))}><ChevronLeft/></Button>
            <div className="px-4 text-center">
              <p className="text-xs text-muted-foreground font-medium uppercase">Período</p>
              <p className="font-bold">{format(weekStart, "dd/MM")} - {format(weekEnd, "dd/MM/yyyy")}</p>
            </div>
            <Button variant="outline" size="icon" onClick={() => setWeekStart(addWeeks(weekStart, 1))}><ChevronRight/></Button>
          </div>
          
          <Button onClick={handlePrintAll} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold">
            <FileText className="w-4 h-4 mr-2" /> Imprimir Todos
          </Button>
        </div>

        {fechamentos.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <CommissionInputSummary 
              comissaoJapa={fechamentos.reduce((s, f) => s + Number(f.comissao_japa || 0), 0)}
              comissaoTrattoria={fechamentos.reduce((s, f) => s + Number(f.comissao_trattoria || 0), 0)}
              totalTaxaServico={fechamentos.reduce((s, f) => s + Number(f.japa_taxa || 0) + Number(f.trattoria_taxa || 0), 0)}
            />
            <SectorDistributionTable distributions={[
              { setor: 'Garçom Japa', quantidade: sectorCounts.garcomJapa, valorPorColaborador: sectorCounts.garcomJapa > 0 ? sectorTotals.garcomJapa / sectorCounts.garcomJapa : 0, colorClass: 'bg-red-50' },
              { setor: 'Cozinha Japa', quantidade: sectorCounts.cozinhaJapa, valorPorColaborador: sectorCounts.cozinhaJapa > 0 ? sectorTotals.cozinhaJapa / sectorCounts.cozinhaJapa : 0, colorClass: 'bg-red-50' },
              { setor: 'Garçom Trattoria', quantidade: sectorCounts.garcomTrattoria, valorPorColaborador: sectorCounts.garcomTrattoria > 0 ? sectorTotals.garcomTrattoria / sectorCounts.garcomTrattoria : 0, colorClass: 'bg-emerald-50' },
              { setor: 'Cozinha Trattoria', quantidade: sectorCounts.cozinhaTrattoria, valorPorColaborador: sectorCounts.cozinhaTrattoria > 0 ? sectorTotals.cozinhaTrattoria / sectorCounts.cozinhaTrattoria : 0, colorClass: 'bg-emerald-50' },
              { setor: 'ADM/Caixa', quantidade: sectorCounts.caixaAdmCumins, valorPorColaborador: sectorCounts.caixaAdmCumins > 0 ? sectorTotals.caixaAdmCumins / sectorCounts.caixaAdmCumins : 0, colorClass: 'bg-slate-50' },
            ]} />
            <SectorTotalsSummary totals={[
              { label: 'Japa', value: sectorTotals.garcomJapa + sectorTotals.cozinhaJapa, colorClass: 'bg-red-100' },
              { label: 'Trattoria', value: sectorTotals.garcomTrattoria + sectorTotals.cozinhaTrattoria, colorClass: 'bg-emerald-100' },
              { label: 'ADM', value: sectorTotals.caixaAdmCumins, colorClass: 'bg-slate-200' },
              { label: 'Empresa (2%)', value: sectorTotals.empresa, colorClass: 'bg-blue-50' },
            ]} />
          </div>
        )}

        {/* Tabela de Rateio com Cores Restauradas */}
        <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="font-bold">Colaborador</TableHead>
                <TableHead className="font-bold">Setor / Frente</TableHead>
                <TableHead className="text-right font-bold">Valor Total</TableHead>
                <TableHead className="text-center font-bold">Status</TableHead>
                <TableHead className="text-center font-bold">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rateio.map((r) => (
                <TableRow key={r.funcionario.id} className="hover:bg-slate-50/50">
                  <TableCell className="font-semibold">{r.funcionario.nome}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Badge className={getBadgeStyle(r.funcionario)}>
                        {r.funcionario.setor}
                      </Badge>
                      {r.funcionario.setor !== 'Administrativo' && (
                        <Badge variant="outline" className="border-slate-300 text-slate-600">
                          {r.funcionario.frente}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-bold text-blue-700">
                    {formatCurrency(r.valor)}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge className={r.pago ? "bg-green-500 hover:bg-green-600" : "bg-amber-500 hover:bg-amber-600"}>
                      {r.pago ? 'PAGO' : 'PENDENTE'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex justify-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => togglePago(r)}>
                        {r.pago ? 'Desfazer' : 'Pagar'}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </AppLayout>
  );
};

export default Rateio;
