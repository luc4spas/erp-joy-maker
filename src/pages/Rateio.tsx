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
import { ptBR } from 'date-fns/locale';
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
  const [pagamentos, setPagamentos] = useState<Record<string, { id: string; pago: boolean }>>({});
  
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();

  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 0 });

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
        pagRes.data.forEach((p) => {
          pagMap[p.funcionario_id] = { id: p.id, pago: p.pago };
        });
      }
      setPagamentos(pagMap);
      
      calcularRateioSemanal(fechRes.data as Fechamento[], funcRes.data as Funcionario[], pagMap);
    }
    
    setIsLoading(false);
  };

  const calcularRateioSemanal = (
    fechs: Fechamento[], 
    funcs: Funcionario[],
    pagMap: Record<string, { id: string; pago: boolean }>
  ) => {
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

    const garcomJapaFuncs = funcs.filter(f => f.setor === 'Garçom' && (f.frente === 'Japa' || f.frente === 'Ambas'));
    const garcomTrattoriaFuncs = funcs.filter(f => f.setor === 'Garçom' && (f.frente === 'Trattoria' || f.frente === 'Ambas'));
    const cozinhaJapaFuncs = funcs.filter(f => f.setor === 'Cozinha' && (f.frente === 'Japa' || f.frente === 'Ambas'));
    const cozinhaTrattoriaFuncs = funcs.filter(f => f.setor === 'Cozinha' && (f.frente === 'Trattoria' || f.frente === 'Ambas'));
    const adminFuncs = funcs.filter(f => f.setor === 'Administrativo');

    setSectorCounts({
      garcomJapa: garcomJapaFuncs.length,
      cozinhaJapa: cozinhaJapaFuncs.length,
      garcomTrattoria: garcomTrattoriaFuncs.length,
      cozinhaTrattoria: cozinhaTrattoriaFuncs.length,
      caixaAdmCumins: adminFuncs.length
    });

    setSectorTotals({
      garcomJapa: japaGarcom,
      cozinhaJapa: japaCozinha,
      garcomTrattoria: trattoriaGarcom,
      cozinhaTrattoria: trattoriaCozinha,
      caixaAdmCumins: adminTotal,
      empresa: empresaValor
    });

    const result: Map<string, RateioItem> = new Map();

    const addToResult = (func: Funcionario, valorJapa: number, valorTrattoria: number) => {
      const existing = result.get(func.id);
      const pag = pagMap[func.id];
      
      if (existing) {
        existing.valorJapa += valorJapa;
        existing.valorTrattoria += valorTrattoria;
        existing.valor = existing.valorJapa + existing.valorTrattoria;
      } else {
        result.set(func.id, {
          funcionario: func,
          valor: valorJapa + valorTrattoria,
          valorJapa,
          valorTrattoria,
          diasTrabalhados: totalDias,
          totalDias,
          pago: pag?.pago || false,
          pagamentoId: pag?.id
        });
      }
    };

    garcomJapaFuncs.forEach(f => addToResult(f, japaGarcom / garcomJapaFuncs.length, 0));
    garcomTrattoriaFuncs.forEach(f => {
      const existing = result.get(f.id);
      if (existing) {
        existing.valorTrattoria += trattoriaGarcom / garcomTrattoriaFuncs.length;
        existing.valor = existing.valorJapa + existing.valorTrattoria;
      } else {
        addToResult(f, 0, trattoriaGarcom / garcomTrattoriaFuncs.length);
      }
    });
    cozinhaJapaFuncs.forEach(f => addToResult(f, japaCozinha / cozinhaJapaFuncs.length, 0));
    cozinhaTrattoriaFuncs.forEach(f => {
      const existing = result.get(f.id);
      if (existing) {
        existing.valorTrattoria += trattoriaCozinha / cozinhaTrattoriaFuncs.length;
        existing.valor = existing.valorJapa + existing.valorTrattoria;
      } else {
        addToResult(f, 0, trattoriaCozinha / cozinhaTrattoriaFuncs.length);
      }
    });
    adminFuncs.forEach(f => {
      const valorAdmin = adminTotal / adminFuncs.length;
      const propJapa = totalComissaoJapa / totalComissao8Porcento;
      const propTrattoria = totalComissaoTrattoria / totalComissao8Porcento;
      addToResult(f, valorAdmin * propJapa, valorAdmin * propTrattoria);
    });

    setRateio(Array.from(result.values()).sort((a, b) => b.valor - a.valor));
  };

  const togglePago = async (item: RateioItem) => {
    if (!user) return;
    const newStatus = !item.pago;
    const startDateStr = format(weekStart, 'yyyy-MM-dd');
    try {
      if (item.pagamentoId) {
        await supabase.from('pagamentos_funcionarios').update({ pago: newStatus }).eq('id', item.pagamentoId);
      } else {
        await supabase.from('pagamentos_funcionarios').insert({
          user_id: user.id,
          funcionario_id: item.funcionario.id,
          valor: item.valor,
          data: startDateStr,
          pago: newStatus
        });
      }
      await fetchData();
      toast({ title: newStatus ? 'Marcado como pago' : 'Marcado como pendente' });
    } catch (error) {
      toast({ title: 'Erro', variant: 'destructive' });
    }
  };

  const handlePrint = (item: RateioItem) => {
    const periodoInicio = formatDateBR(format(weekStart, 'yyyy-MM-dd'));
    const periodoFim = formatDateBR(format(weekEnd, 'yyyy-MM-dd'));
    
    const w = window.open('', '_blank');
    if (w) {
      w.document.write(`
        <html>
          <head>
            <title>Recibo - ${item.funcionario.nome}</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 40px; max-width: 600px; margin: 0 auto; }
              h1 { font-size: 20px; text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; }
              .info { margin: 20px 0; }
              .info p { margin: 8px 0; }
              .info strong { display: inline-block; width: 120px; }
              .valores { background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0; }
              .total { font-size: 18px; font-weight: bold; border-top: 2px solid #000; padding-top: 10px; }
              .assinatura { margin-top: 60px; border-top: 1px solid #000; padding-top: 10px; text-align: center; }
              .periodo { background: #e8f4f8; padding: 10px; border-radius: 5px; text-align: center; margin-bottom: 20px; }
            </style>
          </head>
          <body>
            <h1>RECIBO DE PAGAMENTO</h1>
            <div class="periodo"><strong>Referente ao período de ${periodoInicio} a ${periodoFim}</strong></div>
            <div class="info">
              <p><strong>Nome:</strong> ${item.funcionario.nome}</p>
              <p><strong>Setor:</strong> ${item.funcionario.setor}</p>
            </div>
            <div class="valores">
              <p><strong>Valor Japa:</strong> ${formatCurrency(item.valorJapa)}</p>
              <p><strong>Valor Trattoria:</strong> ${formatCurrency(item.valorTrattoria)}</p>
            </div>
            <p class="total">VALOR TOTAL: ${formatCurrency(item.valor)}</p>
            <div class="assinatura">Assinatura do Colaborador</div>
          </body>
        </html>
      `);
      w.document.close();
      w.print();
    }
  };

  const handlePrintAll = () => {
    if (rateio.length === 0) {
      toast({ title: "Aviso", description: "Não há dados para imprimir nesta semana.", variant: "destructive" });
      return;
    }

    const periodoInicio = formatDateBR(format(weekStart, 'yyyy-MM-dd'));
    const periodoFim = formatDateBR(format(weekEnd, 'yyyy-MM-dd'));
    
    const w = window.open('', '_blank');
    if (w) {
      const content = rateio.map(item => `
        <div style="page-break-after: always; padding: 40px; max-width: 800px; margin: 0 auto; font-family: Arial, sans-serif;">
          <h1 style="font-size: 20px; text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px;">RECIBO DE PAGAMENTO</h1>
          <div style="background: #e8f4f8; padding: 10px; border-radius: 5px; text-align: center; margin-bottom: 20px;">
            <strong>Referente ao período de ${periodoInicio} a ${periodoFim}</strong>
          </div>
          <div style="margin: 20px 0;">
            <p style="margin: 8px 0;"><strong>Nome:</strong> ${item.funcionario.nome}</p>
            <p style="margin: 8px 0;"><strong>Setor:</strong> ${item.funcionario.setor}</p>
          </div>
          <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Valor Japa:</strong> ${formatCurrency(item.valorJapa)}</p>
            <p><strong>Valor Trattoria:</strong> ${formatCurrency(item.valorTrattoria)}</p>
          </div>
          <p style="font-size: 18px; font-weight: bold; border-top: 2px solid #000; padding-top: 10px;">
            VALOR TOTAL: ${formatCurrency(item.valor)}
          </p>
          <div style="margin-top: 60px; border-top: 1px solid #000; padding-top: 10px; text-align: center;">
            Assinatura do Colaborador
          </div>
        </div>
      `).join('');

      w.document.write(`<html><head><title>Recibos de Comissões</title></head><body>${content}</body></html>`);
      w.document.close();
      w.print();
    }
  };

  const handlePrintSummary = () => {
    const periodoInicio = formatDateBR(format(weekStart, 'yyyy-MM-dd'));
    const periodoFim = formatDateBR(format(weekEnd, 'yyyy-MM-dd'));
    const w = window.open('', '_blank');
    if (w) {
      w.document.write(`<html><body><h1>RESUMO DO RATEIO SEMANAL</h1><p>Período: ${periodoInicio} a ${periodoFim}</p></body></html>`);
      w.document.close();
      w.print();
    }
  };

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

  const totalComissaoJapa = fechamentos.reduce((sum, f) => sum + Number(f.comissao_japa), 0);
  const totalComissaoTrattoria = fechamentos.reduce((sum, f) => sum + Number(f.comissao_trattoria), 0);
  const totalTaxaJapa = fechamentos.reduce((sum, f) => sum + Number(f.japa_taxa), 0);
  const totalTaxaTrattoria = fechamentos.reduce((sum, f) => sum + Number(f.trattoria_taxa), 0);

  if (authLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!user) return null;

  return (
    <AppLayout title="Rateio Semanal" subtitle="Distribuição de comissões por período">
      <div className="space-y-6 animate-fade-in">
        
        {/* CABEÇALHO COM OS BOTÕES - Forçado a aparecer sempre */}
        <div className="bg-card rounded-xl p-4 shadow-card border border-border flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="icon" onClick={() => setWeekStart(subWeeks(weekStart, 1))}><ChevronLeft className="w-4 h-4" /></Button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center"><Calendar className="w-5 h-5 text-primary" /></div>
              <div>
                <p className="text-xs text-muted-foreground">Semana Selecionada</p>
                <p className="text-lg font-semibold">{format(weekStart, "dd/MM")} a {format(weekEnd, "dd/MM/yyyy")}</p>
              </div>
            </div>
            <Button variant="outline" size="icon" onClick={() => setWeekStart(addWeeks(weekStart, 1))}><ChevronRight className="w-4 h-4" /></Button>
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={handlePrintSummary}>
              <Printer className="w-4 h-4 mr-2" /> Resumo
            </Button>
            <Button 
              style={{ backgroundColor: '#2563eb', color: 'white' }} 
              onClick={handlePrintAll}
            >
              <FileText className="w-4 h-4 mr-2" /> Imprimir Todos os Recibos
            </Button>
          </div>
        </div>

        {fechamentos.length > 0 && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <CommissionInputSummary comissaoJapa={totalComissaoJapa} comissaoTrattoria={totalComissaoTrattoria} totalTaxaServico={totalTaxaJapa + totalTaxaTrattoria} />
              <SectorDistributionTable distributions={sectorDistributions} />
              <SectorTotalsSummary totals={sectorTotalsList} />
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
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
                      <Badge variant="secondary">{r.funcionario.setor}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-bold">{formatCurrency(r.valor)}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={r.pago ? "default" : "secondary"}>{r.pago ? 'Pago' : 'Pendente'}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => togglePago(r)}>{r.pago ? 'Desfazer' : 'Pagar'}</Button>
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
    </AppLayout>
  );
};

export default Rateio;
