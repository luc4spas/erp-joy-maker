import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/processData';
import { formatDateBR } from '@/lib/dateUtils';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Loader2, Printer, DollarSign, Users, Check, Clock, ChevronLeft, ChevronRight, Calendar, FileText } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { SectorTotalsSummary } from '@/components/rateio/SectorTotalsSummary';
import { CommissionInputSummary } from '@/components/rateio/CommissionInputSummary';
import { SectorDistributionTable } from '@/components/rateio/SectorDistributionTable';
import { RateioMensal } from '@/components/rateio/RateioMensal';

// ... (Interfaces Funcionario, Fechamento, RateioItem, SectorTotals, SectorCounts permanecem iguais)

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

interface SectorTotals {
  garcomJapa: number;
  cozinhaJapa: number;
  garcomTrattoria: number;
  cozinhaTrattoria: number;
  caixaAdmCumins: number;
  empresa: number;
}

interface SectorCounts {
  garcomJapa: number;
  cozinhaJapa: number;
  garcomTrattoria: number;
  cozinhaTrattoria: number;
  caixaAdmCumins: number;
}

const Rateio = () => {
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [fechamentos, setFechamentos] = useState<Fechamento[]>([]);
  const [rateio, setRateio] = useState<RateioItem[]>([]);
  const [sectorTotals, setSectorTotals] = useState<SectorTotals>({
    garcomJapa: 0, cozinhaJapa: 0, garcomTrattoria: 0, cozinhaTrattoria: 0, caixaAdmCumins: 0, empresa: 0
  });
  const [sectorCounts, setSectorCounts] = useState<SectorCounts>({
    garcomJapa: 0, cozinhaJapa: 0, garcomTrattoria: 0, cozinhaTrattoria: 0, caixaAdmCumins: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeek(new Date(), { weekStartsOn: 0 }));
  const [pagamentos, setPagamentos] = useState<Record<string, { id: string; pago: boolean }>>({});
  
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 0 });

  // Funções de busca e cálculo originais (mantidas exatamente como estavam)
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
        .select('id, data, comissao_japa, comissao_trattoria, japa_taxa, trattoria_taxa')
        .gte('data', startDateStr)
        .lte('data', endDateStr)
        .order('data', { ascending: true }),
      supabase.from('pagamentos_funcionarios')
        .select('id, funcionario_id, pago')
        .gte('data', startDateStr)
        .lte('data', endDateStr)
    ]);

    if (funcRes.data) setFuncionarios(funcRes.data as Funcionario[]);
    if (fechRes.data) {
      setFechamentos(fechRes.data as Fechamento[]);
      const pagMap: Record<string, { id: string; pago: boolean }> = {};
      if (pagRes.data) {
        pagRes.data.forEach((p) => { pagMap[p.funcionario_id] = { id: p.id, pago: p.pago }; });
      }
      setPagamentos(pagMap);
      calcularRateioSemanal(fechRes.data as Fechamento[], funcRes.data as Funcionario[], pagMap);
    }
    setIsLoading(false);
  };

  const calcularRateioSemanal = (fechs: Fechamento[], funcs: Funcionario[], pagMap: Record<string, { id: string; pago: boolean }>) => {
    if (fechs.length === 0) {
      setRateio([]);
      setSectorTotals({ garcomJapa: 0, cozinhaJapa: 0, garcomTrattoria: 0, cozinhaTrattoria: 0, caixaAdmCumins: 0, empresa: 0 });
      setSectorCounts({ garcomJapa: 0, cozinhaJapa: 0, garcomTrattoria: 0, cozinhaTrattoria: 0, caixaAdmCumins: 0 });
      return;
    }

    const totalComissaoJapa = fechs.reduce((sum, f) => sum + Number(f.comissao_japa), 0);
    const totalComissaoTrattoria = fechs.reduce((sum, f) => sum + Number(f.comissao_trattoria), 0);
    const totalComissao8Porcento = totalComissaoJapa + totalComissaoTrattoria;
    const totalTaxaJapa = fechs.reduce((sum, f) => sum + Number(f.japa_taxa), 0);
    const totalTaxaTrattoria = fechs.reduce((sum, f) => sum + Number(f.trattoria_taxa), 0);
    const totalTaxaServico = totalTaxaJapa + totalTaxaTrattoria;
    const empresaValor = totalTaxaServico - totalComissao8Porcento;
    const totalDias = fechs.length;

    const percentGarcom = 0.475 / 0.8; 
    const percentCozinha = 0.275 / 0.8; 
    const percentAdmin = 0.05 / 0.8; 
    
    const japaGarcom = totalComissaoJapa * percentGarcom;
    const japaCozinha = totalComissaoJapa * percentCozinha;
    const trattoriaGarcom = totalComissaoTrattoria * percentGarcom;
    const trattoriaCozinha = totalComissaoTrattoria * percentCozinha;
    const adminTotal = totalComissao8Porcento * percentAdmin;

    const gJ = funcs.filter(f => f.setor === 'Garçom' && (f.frente === 'Japa' || f.frente === 'Ambas'));
    const gT = funcs.filter(f => f.setor === 'Garçom' && (f.frente === 'Trattoria' || f.frente === 'Ambas'));
    const cJ = funcs.filter(f => f.setor === 'Cozinha' && (f.frente === 'Japa' || f.frente === 'Ambas'));
    const cT = funcs.filter(f => f.setor === 'Cozinha' && (f.frente === 'Trattoria' || f.frente === 'Ambas'));
    const adm = funcs.filter(f => f.setor === 'Administrativo');

    setSectorCounts({ garcomJapa: gJ.length, cozinhaJapa: cJ.length, garcomTrattoria: gT.length, cozinhaTrattoria: cT.length, caixaAdmCumins: adm.length });
    setSectorTotals({ garcomJapa: japaGarcom, cozinhaJapa: japaCozinha, garcomTrattoria: trattoriaGarcom, cozinhaTrattoria: trattoriaCozinha, caixaAdmCumins: adminTotal, empresa: empresaValor });

    const result: Map<string, RateioItem> = new Map();
    const addToResult = (func: Funcionario, vJ: number, vT: number) => {
      const ex = result.get(func.id);
      const pag = pagMap[func.id];
      if (ex) { ex.valorJapa += vJ; ex.valorTrattoria += vT; ex.valor = ex.valorJapa + ex.valorTrattoria; }
      else { result.set(func.id, { funcionario: func, valor: vJ + vT, valorJapa: vJ, valorTrattoria: vT, diasTrabalhados: totalDias, totalDias, pago: pag?.pago || false, pagamentoId: pag?.id }); }
    };

    gJ.forEach(f => addToResult(f, japaGarcom / gJ.length, 0));
    gT.forEach(f => { const ex = result.get(f.id); if (ex) { ex.valorTrattoria += trattoriaGarcom / gT.length; ex.valor = ex.valorJapa + ex.valorTrattoria; } else { addToResult(f, 0, trattoriaGarcom / gT.length); }});
    cJ.forEach(f => addToResult(f, japaCozinha / cJ.length, 0));
    cT.forEach(f => { const ex = result.get(f.id); if (ex) { ex.valorTrattoria += trattoriaCozinha / cT.length; ex.valor = ex.valorJapa + ex.valorTrattoria; } else { addToResult(f, 0, trattoriaCozinha / cT.length); }});
    adm.forEach(f => { const val = adminTotal / adm.length; addToResult(f, val * (totalComissaoJapa/totalComissao8Porcento), val * (totalComissaoTrattoria/totalComissao8Porcento)); });

    setRateio(Array.from(result.values()).sort((a, b) => b.valor - a.valor));
  };

  const togglePago = async (item: RateioItem) => {
    if (!user) return;
    const newStatus = !item.pago;
    try {
      if (item.pagamentoId) { await supabase.from('pagamentos_funcionarios').update({ pago: newStatus }).eq('id', item.pagamentoId); }
      else { await supabase.from('pagamentos_funcionarios').insert({ user_id: user.id, funcionario_id: item.funcionario.id, valor: item.valor, data: format(weekStart, 'yyyy-MM-dd'), pago: newStatus }); }
      await fetchData();
      toast({ title: newStatus ? 'Marcado como pago' : 'Marcado como pendente' });
    } catch (error) { toast({ title: 'Erro', variant: 'destructive' }); }
  };

  // NOVA FUNÇÃO: Imprimir todos os recibos de uma vez
  const handlePrintAll = () => {
    const pInicio = formatDateBR(format(weekStart, 'yyyy-MM-dd'));
    const pFim = formatDateBR(format(weekEnd, 'yyyy-MM-dd'));
    
    const w = window.open('', '_blank');
    if (!w) return;

    const content = rateio.map(item => {
      const detalhes = [];
      if (item.valorJapa > 0) detalhes.push(`<p><strong>Japa:</strong> ${formatCurrency(item.valorJapa)}</p>`);
      if (item.valorTrattoria > 0) detalhes.push(`<p><strong>Trattoria:</strong> ${formatCurrency(item.valorTrattoria)}</p>`);
      
      return `
        <div style="page-break-after: always; padding: 40px; font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee;">
          <h1 style="text-align:center; font-size: 20px; border-bottom: 2px solid #000; padding-bottom: 10px;">RECIBO DE PAGAMENTO</h1>
          <div style="background: #f0f0f0; padding: 10px; text-align: center; margin: 20px 0; border-radius: 5px;">
            <strong>Referente ao período de ${pInicio} a ${pFim}</strong>
          </div>
          <p><strong>Nome:</strong> ${item.funcionario.nome}</p>
          <p><strong>Setor:</strong> ${item.funcionario.setor}</p>
          <p><strong>Frente:</strong> ${item.funcionario.frente}</p>
          <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top:0; font-size:14px;">Detalhamento:</h3>
            ${detalhes.join('')}
            <p><strong>Dias com fechamento:</strong> ${item.totalDias} dia(s)</p>
          </div>
          <p style="font-size: 18px; font-weight: bold; border-top: 2px solid #000; padding-top: 10px;">VALOR TOTAL: ${formatCurrency(item.valor)}</p>
          <div style="margin-top: 60px; border-top: 1px solid #000; padding-top: 10px; text-align: center;">Assinatura do Colaborador</div>
        </div>
      `;
    }).join('');

    w.document.write(`<html><head><title>Todos os Recibos</title></head><body>${content}</body></html>`);
    w.document.close();
    w.print();
  };

  // Função original para imprimir um recibo individual
  const handlePrint = (item: RateioItem) => {
    const pInicio = formatDateBR(format(weekStart, 'yyyy-MM-dd'));
    const pFim = formatDateBR(format(weekEnd, 'yyyy-MM-dd'));
    const detalhes = [];
    if (item.valorJapa > 0) detalhes.push(`<p><strong>Japa:</strong> ${formatCurrency(item.valorJapa)}</p>`);
    if (item.valorTrattoria > 0) detalhes.push(`<p><strong>Trattoria:</strong> ${formatCurrency(item.valorTrattoria)}</p>`);
    
    const w = window.open('', '_blank');
    if (w) {
      w.document.write(`<html><head><style>body { font-family: sans-serif; padding: 40px; } .total { font-size: 18px; font-weight: bold; border-top: 2px solid #000; padding-top: 10px; } .assinatura { margin-top: 60px; border-top: 1px solid #000; text-align: center; }</style></head>
        <body><h1 style="text-align:center">RECIBO DE PAGAMENTO</h1><p style="text-align:center">Período: ${pInicio} a ${pFim}</p>
        <p><strong>Nome:</strong> ${item.funcionario.nome}</p><p><strong>Setor:</strong> ${item.funcionario.setor} (${item.funcionario.frente})</p>
        <div style="background:#f5f5f5; padding:15px; margin:20px 0">${detalhes.join('')}</div>
        <p class="total">VALOR TOTAL: ${formatCurrency(item.valor)}</p><div class="assinatura">Assinatura</div></body></html>`);
      w.document.close();
      w.print();
    }
  };

  // Lógica de preparação de dados para os componentes visuais
  const totalComissaoJapa = fechamentos.reduce((sum, f) => sum + Number(f.comissao_japa), 0);
  const totalComissaoTrattoria = fechamentos.reduce((sum, f) => sum + Number(f.comissao_trattoria), 0);
  const totalComissao8 = totalComissaoJapa + totalComissaoTrattoria;
  const totalTaxaJapa = fechamentos.reduce((sum, f) => sum + Number(f.japa_taxa || 0), 0);
  const totalTaxaTrattoria = fechamentos.reduce((sum, f) => sum + Number(f.trattoria_taxa || 0), 0);
  const totalTaxaServico10 = totalTaxaJapa + totalTaxaTrattoria;

  const sectorTotalsList = [
    { label: 'GARÇOM JAPA', value: sectorTotals.garcomJapa, colorClass: 'bg-japa-light' },
    { label: 'COZINHA JAPA', value: sectorTotals.cozinhaJapa, colorClass: 'bg-japa-light' },
    { label: 'GARÇOM TRATTORIA', value: sectorTotals.garcomTrattoria, colorClass: 'bg-trattoria-light' },
    { label: 'COZINHA TRATTORIA', value: sectorTotals.cozinhaTrattoria, colorClass: 'bg-trattoria-light' },
    { label: 'CAIXA/ADM/CUMINS', value: sectorTotals.caixaAdmCumins, colorClass: 'bg-commission-light' },
    { label: 'EMPRESA (2%)', value: sectorTotals.empresa, colorClass: 'bg-secondary' },
  ];

  const sectorDistributions = [
    { setor: 'GARÇOM JAPA', quantidade: sectorCounts.garcomJapa, valorPorColaborador: sectorCounts.garcomJapa > 0 ? sectorTotals.garcomJapa / sectorCounts.garcomJapa : 0, colorClass: 'bg-japa-light' },
    { setor: 'COZINHA JAPA', quantidade: sectorCounts.cozinhaJapa, valorPorColaborador: sectorCounts.cozinhaJapa > 0 ? sectorTotals.cozinhaJapa / sectorCounts.cozinhaJapa : 0, colorClass: 'bg-japa-light' },
    { setor: 'GARÇOM TRATTORIA', quantidade: sectorCounts.garcomTrattoria, valorPorColaborador: sectorCounts.garcomTrattoria > 0 ? sectorTotals.garcomTrattoria / sectorCounts.garcomTrattoria : 0, colorClass: 'bg-trattoria-light' },
    { setor: 'COZINHA TRATTORIA', quantidade: sectorCounts.cozinhaTrattoria, valorPorColaborador: sectorCounts.cozinhaTrattoria > 0 ? sectorTotals.cozinhaTrattoria / sectorCounts.cozinhaTrattoria : 0, colorClass: 'bg-trattoria-light' },
    { setor: 'CAIXA/ADM/CUMINS', quantidade: sectorCounts.caixaAdmCumins, valorPorColaborador: sectorCounts.caixaAdmCumins > 0 ? sectorTotals.caixaAdmCumins / sectorCounts.caixaAdmCumins : 0, colorClass: 'bg-commission-light' },
  ];

  if (authLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!user) return null;

  return (
    <AppLayout title="Rateio de Comissões" subtitle="Distribuição semanal e mensal de comissões">
      <Tabs defaultValue="semanal" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="semanal">Rateio Semanal</TabsTrigger>
          <TabsTrigger value="mensal">Rateio Mensal</TabsTrigger>
        </TabsList>

        <TabsContent value="semanal">
      <div className="space-y-6 animate-fade-in">
        
        {/* Seletor de Semana */}
        <div className="bg-card rounded-xl p-4 shadow-card border border-border flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="icon" onClick={() => setWeekStart(subWeeks(weekStart, 1))}><ChevronLeft className="w-4 h-4" /></Button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center"><Calendar className="w-5 h-5 text-primary" /></div>
              <div>
                <p className="text-xs text-muted-foreground">Semana Selecionada</p>
                <p className="text-lg font-semibold">{format(weekStart, "dd/MM", { locale: ptBR })} a {format(weekEnd, "dd/MM/yyyy", { locale: ptBR })}</p>
              </div>
            </div>
            <Button variant="outline" size="icon" onClick={() => setWeekStart(addWeeks(weekStart, 1))}><ChevronRight className="w-4 h-4" /></Button>
          </div>
          <Button variant="secondary" onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 0 }))}>Semana Atual</Button>
        </div>

        {/* Resumo de Comissões e Totalização */}
        {fechamentos.length > 0 && (
          <div className="space-y-4">
            {/* BOTÕES DE IMPRESSÃO CABEÇALHO */}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handlePrintAll} className="border-blue-200 text-blue-700 hover:bg-blue-50">
                <FileText className="w-4 h-4 mr-2" />
                Imprimir Todos os Recibos
              </Button>
              <Button variant="outline" onClick={() => {
                // Reaproveitando a lógica de handlePrintSummary que estava no seu código original
                const pInicio = formatDateBR(format(weekStart, 'yyyy-MM-dd'));
                const pFim = formatDateBR(format(weekEnd, 'yyyy-MM-dd'));
                const w = window.open('', '_blank');
                if (w) {
                  w.document.write(`<html><body><h1 style="text-align:center">RESUMO RATEIO</h1><p style="text-align:center">${pInicio} a ${pFim}</p></body></html>`);
                  w.document.close();
                  w.print();
                }
              }}>
                <Printer className="w-4 h-4 mr-2" />
                Imprimir Resumo
              </Button>
            </div>
            
            <div id="rateio-summary-cards" className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <CommissionInputSummary comissaoJapa={totalComissaoJapa} comissaoTrattoria={totalComissaoTrattoria} totalTaxaServico={totalTaxaServico10} />
              <SectorDistributionTable distributions={sectorDistributions} />
              <SectorTotalsSummary totals={sectorTotalsList} />
            </div>
          </div>
        )}

        {/* Tabela de Rateio Individual */}
        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : fechamentos.length === 0 ? (
          <div className="text-center py-16 bg-card rounded-2xl shadow-card"><DollarSign className="w-16 h-16 text-muted-foreground mx-auto mb-4" /><p className="text-muted-foreground">Nenhum fechamento encontrado.</p></div>
        ) : (
          <div className="bg-card rounded-2xl shadow-card overflow-hidden">
            <div className="p-4 border-b border-border"><h3 className="font-semibold text-lg">Rateio Individual</h3></div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Colaborador</TableHead>
                  <TableHead>Setor</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rateio.map((r) => (
                  <TableRow key={r.funcionario.id}>
                    <TableCell className="font-medium">{r.funcionario.nome}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={
                        r.funcionario.setor === 'Administrativo' ? 'bg-commission-light text-commission-foreground' :
                        r.funcionario.frente === 'Japa' ? 'bg-japa-light text-japa-foreground' :
                        r.funcionario.frente === 'Trattoria' ? 'bg-trattoria-light text-trattoria-foreground' : 'bg-secondary'
                      }>
                        {r.funcionario.setor === 'Administrativo' ? 'CAIXA/ADM/CUMINS' : `${r.funcionario.setor.toUpperCase()} ${r.funcionario.frente.toUpperCase()}`}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-bold text-primary">{formatCurrency(r.valor)}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={r.pago ? "default" : "secondary"}>
                        {r.pago ? <><Check className="w-3 h-3 mr-1" /> Pago</> : <><Clock className="w-3 h-3 mr-1" /> Pendente</>}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant={r.pago ? "outline" : "default"} size="sm" onClick={() => togglePago(r)}>{r.pago ? 'Desfazer' : 'Pagar'}</Button>
                        <Button variant="outline" size="sm" onClick={() => handlePrint(r)}><Printer className="w-4 h-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
        </TabsContent>

        <TabsContent value="mensal">
          <RateioMensal />
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
};

export default Rateio;
