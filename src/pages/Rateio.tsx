import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/processData';
import { formatDateBR } from '@/lib/dateUtils';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Loader2, Printer, DollarSign, Users, Check, Clock, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
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
    garcomJapa: 0,
    cozinhaJapa: 0,
    garcomTrattoria: 0,
    cozinhaTrattoria: 0,
    caixaAdmCumins: 0,
    empresa: 0
  });
  const [sectorCounts, setSectorCounts] = useState<SectorCounts>({
    garcomJapa: 0,
    cozinhaJapa: 0,
    garcomTrattoria: 0,
    cozinhaTrattoria: 0,
    caixaAdmCumins: 0
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
        .select('id, data, comissao_japa, comissao_trattoria')
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

    // Soma total das comissões da semana (8% do total de vendas)
    const totalComissaoJapa = fechs.reduce((sum, f) => sum + Number(f.comissao_japa), 0);
    const totalComissaoTrattoria = fechs.reduce((sum, f) => sum + Number(f.comissao_trattoria), 0);
    const totalComissao8Porcento = totalComissaoJapa + totalComissaoTrattoria;
    
    // Calcular o total de 10% (taxa de serviço completa) e os 2% da empresa
    const totalTaxaServico = totalComissao8Porcento / 0.8; // 8% = 80% de 10%, então 10% = 8% / 0.8
    const empresaValor = totalTaxaServico * 0.2; // 2% do total = 20% da taxa de serviço
    
    const totalDias = fechs.length;

    // Percentuais ajustados para distribuir 100% dos 8%:
    // Original: Garçom 47.5%, Cozinha 27.5%, Admin 5% = 80%
    // Ajustado: Garçom 59.375%, Cozinha 34.375%, Admin 6.25% = 100%
    const percentGarcom = 0.475 / 0.8; // 59.375%
    const percentCozinha = 0.275 / 0.8; // 34.375%
    const percentAdmin = 0.05 / 0.8; // 6.25%
    
    const japaGarcom = totalComissaoJapa * percentGarcom;
    const japaCozinha = totalComissaoJapa * percentCozinha;
    const trattoriaGarcom = totalComissaoTrattoria * percentGarcom;
    const trattoriaCozinha = totalComissaoTrattoria * percentCozinha;
    const adminTotal = totalComissao8Porcento * percentAdmin;

    // Filtrar funcionários por setor e frente
    const garcomJapaFuncs = funcs.filter(f => f.setor === 'Garçom' && (f.frente === 'Japa' || f.frente === 'Ambas'));
    const garcomTrattoriaFuncs = funcs.filter(f => f.setor === 'Garçom' && (f.frente === 'Trattoria' || f.frente === 'Ambas'));
    const cozinhaJapaFuncs = funcs.filter(f => f.setor === 'Cozinha' && (f.frente === 'Japa' || f.frente === 'Ambas'));
    const cozinhaTrattoriaFuncs = funcs.filter(f => f.setor === 'Cozinha' && (f.frente === 'Trattoria' || f.frente === 'Ambas'));
    const adminFuncs = funcs.filter(f => f.setor === 'Administrativo');

    // Atualizar contagens
    setSectorCounts({
      garcomJapa: garcomJapaFuncs.length,
      cozinhaJapa: cozinhaJapaFuncs.length,
      garcomTrattoria: garcomTrattoriaFuncs.length,
      cozinhaTrattoria: cozinhaTrattoriaFuncs.length,
      caixaAdmCumins: adminFuncs.length
    });

    // Atualizar totais por setor
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

    // Distribuir comissões (proporcional ao número de funcionários em cada categoria)
    // Garçom Japa
    garcomJapaFuncs.forEach(f => {
      addToResult(f, japaGarcom / garcomJapaFuncs.length, 0);
    });

    // Garçom Trattoria
    garcomTrattoriaFuncs.forEach(f => {
      const existing = result.get(f.id);
      if (existing) {
        existing.valorTrattoria += trattoriaGarcom / garcomTrattoriaFuncs.length;
        existing.valor = existing.valorJapa + existing.valorTrattoria;
      } else {
        addToResult(f, 0, trattoriaGarcom / garcomTrattoriaFuncs.length);
      }
    });

    // Cozinha Japa
    cozinhaJapaFuncs.forEach(f => {
      addToResult(f, japaCozinha / cozinhaJapaFuncs.length, 0);
    });

    // Cozinha Trattoria
    cozinhaTrattoriaFuncs.forEach(f => {
      const existing = result.get(f.id);
      if (existing) {
        existing.valorTrattoria += trattoriaCozinha / cozinhaTrattoriaFuncs.length;
        existing.valor = existing.valorJapa + existing.valorTrattoria;
      } else {
        addToResult(f, 0, trattoriaCozinha / cozinhaTrattoriaFuncs.length);
      }
    });

    // Admin - recebe de ambas as frentes
    adminFuncs.forEach(f => {
      const valorAdmin = adminTotal / adminFuncs.length;
      // Distribui proporcionalmente entre Japa e Trattoria
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
        await supabase
          .from('pagamentos_funcionarios')
          .update({ pago: newStatus })
          .eq('id', item.pagamentoId);
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
      
      toast({
        title: newStatus ? 'Marcado como pago' : 'Marcado como pendente',
        description: `Pagamento de ${item.funcionario.nome} atualizado.`
      });
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o status.',
        variant: 'destructive'
      });
    }
  };

  const handlePrint = (item: RateioItem) => {
    const periodoInicio = formatDateBR(format(weekStart, 'yyyy-MM-dd'));
    const periodoFim = formatDateBR(format(weekEnd, 'yyyy-MM-dd'));
    
    // Gerar detalhamento apenas para valores > 0
    const detalhes: string[] = [];
    if (item.valorJapa > 0) {
      detalhes.push(`<p><strong>Japa:</strong> ${formatCurrency(item.valorJapa)}</p>`);
    }
    if (item.valorTrattoria > 0) {
      detalhes.push(`<p><strong>Trattoria:</strong> ${formatCurrency(item.valorTrattoria)}</p>`);
    }
    
    const w = window.open('', '_blank');
    if (w) {
      w.document.write(`
        <html>
        <head>
          <title>Recibo de Pagamento</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              padding: 40px; 
              max-width: 600px; 
              margin: 0 auto; 
            }
            h1 { 
              font-size: 20px; 
              text-align: center; 
              border-bottom: 2px solid #000; 
              padding-bottom: 10px; 
            }
            .info { margin: 20px 0; }
            .info p { margin: 8px 0; }
            .info strong { display: inline-block; width: 120px; }
            .valores { 
              background: #f5f5f5; 
              padding: 15px; 
              border-radius: 8px; 
              margin: 20px 0; 
            }
            .valores h3 { margin-top: 0; font-size: 14px; }
            .valores p { margin: 5px 0; }
            .total { 
              font-size: 18px; 
              font-weight: bold; 
              border-top: 2px solid #000; 
              padding-top: 10px; 
              margin-top: 10px; 
            }
            .assinatura { 
              margin-top: 60px; 
              border-top: 1px solid #000; 
              padding-top: 10px; 
              text-align: center; 
            }
            .periodo { 
              background: #e8f4f8; 
              padding: 10px; 
              border-radius: 5px; 
              text-align: center; 
              margin-bottom: 20px; 
            }
          </style>
        </head>
        <body>
          <h1>RECIBO DE PAGAMENTO</h1>
          
          <div class="periodo">
            <strong>Referente ao período de ${periodoInicio} a ${periodoFim}</strong>
          </div>
          
          <div class="info">
            <p><strong>Nome:</strong> ${item.funcionario.nome}</p>
            <p><strong>Setor:</strong> ${item.funcionario.setor}</p>
            <p><strong>Frente:</strong> ${item.funcionario.frente}</p>
          </div>
          
          <div class="valores">
            <h3>Detalhamento por Frente:</h3>
            ${detalhes.join('')}
            <p><strong>Dias com fechamento:</strong> ${item.totalDias} dia(s)</p>
          </div>
          
          <p class="total">VALOR TOTAL: ${formatCurrency(item.valor)}</p>
          
          <div class="assinatura">
            Assinatura do Colaborador
          </div>
        </body>
        </html>
      `);
      w.document.close();
      w.print();
    }
  };

  const goToPreviousWeek = () => setWeekStart(subWeeks(weekStart, 1));
  const goToNextWeek = () => setWeekStart(addWeeks(weekStart, 1));
  const goToCurrentWeek = () => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 0 }));

  const totalComissaoJapa = fechamentos.reduce((sum, f) => sum + Number(f.comissao_japa), 0);
  const totalComissaoTrattoria = fechamentos.reduce((sum, f) => sum + Number(f.comissao_trattoria), 0);
  const totalComissao8 = totalComissaoJapa + totalComissaoTrattoria;
  const totalTaxaServico10 = totalComissao8 / 0.8; // Total 10% (taxa de serviço completa)

  // Preparar dados para os componentes de resumo
  const sectorTotalsList = [
    { label: 'GARÇOM JAPA', value: sectorTotals.garcomJapa, colorClass: 'bg-japa-light' },
    { label: 'COZINHA JAPA', value: sectorTotals.cozinhaJapa, colorClass: 'bg-japa-light' },
    { label: 'GARÇOM TRATTORIA', value: sectorTotals.garcomTrattoria, colorClass: 'bg-trattoria-light' },
    { label: 'COZINHA TRATTORIA', value: sectorTotals.cozinhaTrattoria, colorClass: 'bg-trattoria-light' },
    { label: 'CAIXA/ADM/CUMINS', value: sectorTotals.caixaAdmCumins, colorClass: 'bg-commission-light' },
    { label: 'EMPRESA (2%)', value: sectorTotals.empresa, colorClass: 'bg-secondary' },
  ];

  const sectorDistributions = [
    { 
      setor: 'GARÇOM JAPA', 
      quantidade: sectorCounts.garcomJapa, 
      valorPorColaborador: sectorCounts.garcomJapa > 0 ? sectorTotals.garcomJapa / sectorCounts.garcomJapa : 0,
      colorClass: 'bg-japa-light'
    },
    { 
      setor: 'COZINHA JAPA', 
      quantidade: sectorCounts.cozinhaJapa, 
      valorPorColaborador: sectorCounts.cozinhaJapa > 0 ? sectorTotals.cozinhaJapa / sectorCounts.cozinhaJapa : 0,
      colorClass: 'bg-japa-light'
    },
    { 
      setor: 'GARÇOM TRATTORIA', 
      quantidade: sectorCounts.garcomTrattoria, 
      valorPorColaborador: sectorCounts.garcomTrattoria > 0 ? sectorTotals.garcomTrattoria / sectorCounts.garcomTrattoria : 0,
      colorClass: 'bg-trattoria-light'
    },
    { 
      setor: 'COZINHA TRATTORIA', 
      quantidade: sectorCounts.cozinhaTrattoria, 
      valorPorColaborador: sectorCounts.cozinhaTrattoria > 0 ? sectorTotals.cozinhaTrattoria / sectorCounts.cozinhaTrattoria : 0,
      colorClass: 'bg-trattoria-light'
    },
    { 
      setor: 'CAIXA/ADM/CUMINS', 
      quantidade: sectorCounts.caixaAdmCumins, 
      valorPorColaborador: sectorCounts.caixaAdmCumins > 0 ? sectorTotals.caixaAdmCumins / sectorCounts.caixaAdmCumins : 0,
      colorClass: 'bg-commission-light'
    },
  ];

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <AppLayout title="Rateio Semanal" subtitle="Distribuição de comissões por período">
      <div className="space-y-6 animate-fade-in">
        {/* Seletor de Semana */}
        <div className="bg-card rounded-xl p-4 shadow-card border border-border flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="icon" onClick={goToPreviousWeek}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                <Calendar className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Semana Selecionada</p>
                <p className="text-lg font-semibold text-foreground">
                  {format(weekStart, "dd/MM", { locale: ptBR })} a {format(weekEnd, "dd/MM/yyyy", { locale: ptBR })}
                </p>
                <p className="text-xs text-muted-foreground">{fechamentos.length} fechamento(s) no período</p>
              </div>
            </div>
            
            <Button variant="outline" size="icon" onClick={goToNextWeek}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          
          <Button variant="secondary" onClick={goToCurrentWeek}>
            Semana Atual
          </Button>
        </div>

        {/* Resumo de Comissões e Totalização - Layout igual à planilha */}
        {fechamentos.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Coluna 1: Input de comissões */}
            <CommissionInputSummary 
              comissaoJapa={totalComissaoJapa}
              comissaoTrattoria={totalComissaoTrattoria}
              totalTaxaServico={totalTaxaServico10}
            />

            {/* Coluna 2: Distribuição por setor com quantidade e valor por colaborador */}
            <SectorDistributionTable distributions={sectorDistributions} />

            {/* Coluna 3: Totalização por Setor */}
            <SectorTotalsSummary totals={sectorTotalsList} />
          </div>
        )}

        {/* Tabela de Rateio Individual */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : fechamentos.length === 0 ? (
          <div className="text-center py-16 bg-card rounded-2xl shadow-card">
            <DollarSign className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Nenhum fechamento encontrado no período selecionado.</p>
          </div>
        ) : rateio.length === 0 ? (
          <div className="text-center py-16 bg-card rounded-2xl shadow-card">
            <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Cadastre colaboradores ativos para calcular o rateio.</p>
          </div>
        ) : (
          <div className="bg-card rounded-2xl shadow-card overflow-hidden">
            <div className="p-4 border-b border-border">
              <h3 className="font-semibold text-lg">Rateio Individual por Colaborador</h3>
            </div>
            
            {/* Desktop Table */}
            <div className="hidden md:block">
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
                          r.funcionario.frente === 'Trattoria' ? 'bg-trattoria-light text-trattoria-foreground' :
                          'bg-secondary'
                        }>
                          {r.funcionario.setor === 'Administrativo' 
                            ? 'CAIXA/ADM/CUMINS' 
                            : `${r.funcionario.setor.toUpperCase()} ${r.funcionario.frente.toUpperCase()}`}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="space-y-1">
                          {r.valorJapa > 0 && (
                            <div className="text-xs text-japa">Japa: {formatCurrency(r.valorJapa)}</div>
                          )}
                          {r.valorTrattoria > 0 && (
                            <div className="text-xs text-trattoria">Trattoria: {formatCurrency(r.valorTrattoria)}</div>
                          )}
                          <div className="font-bold text-primary">{formatCurrency(r.valor)}</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={r.pago ? "default" : "secondary"}>
                          {r.pago ? (
                            <><Check className="w-3 h-3 mr-1" /> Pago</>
                          ) : (
                            <><Clock className="w-3 h-3 mr-1" /> Pendente</>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button 
                            variant={r.pago ? "outline" : "default"} 
                            size="sm" 
                            onClick={() => togglePago(r)}
                          >
                            {r.pago ? 'Desfazer' : 'Pagar'}
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handlePrint(r)}>
                            <Printer className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden divide-y divide-border">
              {rateio.map((r) => (
                <div key={r.funcionario.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-foreground">{r.funcionario.nome}</p>
                      <Badge variant="secondary" className={`mt-1 text-xs ${
                        r.funcionario.setor === 'Administrativo' ? 'bg-commission-light text-commission-foreground' :
                        r.funcionario.frente === 'Japa' ? 'bg-japa-light text-japa-foreground' :
                        r.funcionario.frente === 'Trattoria' ? 'bg-trattoria-light text-trattoria-foreground' :
                        'bg-secondary'
                      }`}>
                        {r.funcionario.setor === 'Administrativo' 
                          ? 'CAIXA/ADM/CUMINS' 
                          : `${r.funcionario.setor.toUpperCase()} ${r.funcionario.frente.toUpperCase()}`}
                      </Badge>
                    </div>
                    <Badge variant={r.pago ? "default" : "secondary"}>
                      {r.pago ? (
                        <><Check className="w-3 h-3 mr-1" /> Pago</>
                      ) : (
                        <><Clock className="w-3 h-3 mr-1" /> Pendente</>
                      )}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      {r.valorJapa > 0 && (
                        <p className="text-xs text-japa">Japa: {formatCurrency(r.valorJapa)}</p>
                      )}
                      {r.valorTrattoria > 0 && (
                        <p className="text-xs text-trattoria">Trattoria: {formatCurrency(r.valorTrattoria)}</p>
                      )}
                    </div>
                    <p className="text-xl font-bold text-primary">{formatCurrency(r.valor)}</p>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button 
                      variant={r.pago ? "outline" : "default"} 
                      size="sm" 
                      className="flex-1"
                      onClick={() => togglePago(r)}
                    >
                      {r.pago ? 'Desfazer' : 'Pagar'}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handlePrint(r)}>
                      <Printer className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default Rateio;
