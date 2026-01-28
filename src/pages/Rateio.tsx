import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/processData';
import { formatDateBR } from '@/lib/dateUtils';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Loader2, Printer, DollarSign, Users, Check, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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

const Rateio = () => {
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [fechamentos, setFechamentos] = useState<Fechamento[]>([]);
  const [rateio, setRateio] = useState<RateioItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [pagamentos, setPagamentos] = useState<Record<string, { id: string; pago: boolean }>>({});
  
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();

  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });

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
      
      // Map pagamentos by funcionario_id
      const pagMap: Record<string, { id: string; pago: boolean }> = {};
      if (pagRes.data) {
        pagRes.data.forEach((p) => {
          pagMap[p.funcionario_id] = { id: p.id, pago: p.pago };
        });
      }
      setPagamentos(pagMap);
      
      // Calculate rateio with the fetched data
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
      return;
    }

    // Soma total das comissões da semana
    const totalComissaoJapa = fechs.reduce((sum, f) => sum + Number(f.comissao_japa), 0);
    const totalComissaoTrattoria = fechs.reduce((sum, f) => sum + Number(f.comissao_trattoria), 0);
    const totalDias = fechs.length;

    // Percentuais: Garçons 4.75%, Cozinha 2.75%, Admin 0.5%
    const japaGarcom = totalComissaoJapa * (4.75 / 8);
    const japaCozinha = totalComissaoJapa * (2.75 / 8);
    const japaAdmin = totalComissaoJapa * (0.5 / 8);
    const trattoriaGarcom = totalComissaoTrattoria * (4.75 / 8);
    const trattoriaCozinha = totalComissaoTrattoria * (2.75 / 8);
    const trattoriaAdmin = totalComissaoTrattoria * (0.5 / 8);

    // Filtrar funcionários por setor e frente
    const garcomJapa = funcs.filter(f => f.setor === 'Garçom' && (f.frente === 'Japa' || f.frente === 'Ambas'));
    const garcomTrattoria = funcs.filter(f => f.setor === 'Garçom' && (f.frente === 'Trattoria' || f.frente === 'Ambas'));
    const cozinhaJapa = funcs.filter(f => f.setor === 'Cozinha' && (f.frente === 'Japa' || f.frente === 'Ambas'));
    const cozinhaTrattoria = funcs.filter(f => f.setor === 'Cozinha' && (f.frente === 'Trattoria' || f.frente === 'Ambas'));
    const admin = funcs.filter(f => f.setor === 'Administrativo');

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
          diasTrabalhados: totalDias, // Funcionário ativo = trabalhou todos os dias com fechamento
          totalDias,
          pago: pag?.pago || false,
          pagamentoId: pag?.id
        });
      }
    };

    // Distribuir comissões (proporcional ao número de funcionários em cada categoria)
    garcomJapa.forEach(f => addToResult(f, japaGarcom / garcomJapa.length, 0));
    garcomTrattoria.forEach(f => {
      const existing = result.get(f.id);
      if (existing) {
        existing.valorTrattoria += trattoriaGarcom / garcomTrattoria.length;
        existing.valor = existing.valorJapa + existing.valorTrattoria;
      } else {
        addToResult(f, 0, trattoriaGarcom / garcomTrattoria.length);
      }
    });

    cozinhaJapa.forEach(f => addToResult(f, japaCozinha / cozinhaJapa.length, 0));
    cozinhaTrattoria.forEach(f => {
      const existing = result.get(f.id);
      if (existing) {
        existing.valorTrattoria += trattoriaCozinha / cozinhaTrattoria.length;
        existing.valor = existing.valorJapa + existing.valorTrattoria;
      } else {
        addToResult(f, 0, trattoriaCozinha / cozinhaTrattoria.length);
      }
    });

    admin.forEach(f => addToResult(f, japaAdmin / admin.length, trattoriaAdmin / admin.length));

    setRateio(Array.from(result.values()).sort((a, b) => b.valor - a.valor));
  };

  const togglePago = async (item: RateioItem) => {
    if (!user) return;

    const newStatus = !item.pago;
    const startDateStr = format(weekStart, 'yyyy-MM-dd');

    try {
      if (item.pagamentoId) {
        // Update existing
        await supabase
          .from('pagamentos_funcionarios')
          .update({ pago: newStatus })
          .eq('id', item.pagamentoId);
      } else {
        // Create new
        await supabase.from('pagamentos_funcionarios').insert({
          user_id: user.id,
          funcionario_id: item.funcionario.id,
          valor: item.valor,
          data: startDateStr,
          pago: newStatus
        });
      }

      // Refresh data
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
            <p><strong>Japa:</strong> ${formatCurrency(item.valorJapa)}</p>
            <p><strong>Trattoria:</strong> ${formatCurrency(item.valorTrattoria)}</p>
            <p><strong>Dias com fechamento:</strong> ${item.totalDias} dia(s)</p>
          </div>
          
          <p class="total">VALOR TOTAL: ${formatCurrency(item.valor)}</p>
          
          <div class="assinatura">
            Assinatura do Funcionário
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
  const goToCurrentWeek = () => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));

  const totalComissaoJapa = fechamentos.reduce((sum, f) => sum + Number(f.comissao_japa), 0);
  const totalComissaoTrattoria = fechamentos.reduce((sum, f) => sum + Number(f.comissao_trattoria), 0);
  const totalGeral = totalComissaoJapa + totalComissaoTrattoria;

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
      <div className="space-y-6">
        {/* Seletor de Semana */}
        <div className="bg-card p-4 rounded-xl shadow-card">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={goToPreviousWeek}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              
              <div className="text-center min-w-[200px]">
                <p className="text-sm text-muted-foreground">Semana selecionada</p>
                <p className="font-semibold">
                  {format(weekStart, "dd/MM", { locale: ptBR })} a {format(weekEnd, "dd/MM/yyyy", { locale: ptBR })}
                </p>
              </div>
              
              <Button variant="outline" size="icon" onClick={goToNextWeek}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
            
            <Button variant="secondary" onClick={goToCurrentWeek}>
              Semana Atual
            </Button>
          </div>
        </div>

        {/* Resumo da Semana */}
        {fechamentos.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-card p-4 rounded-xl shadow-card">
              <p className="text-sm text-muted-foreground">Fechamentos no período</p>
              <p className="text-2xl font-bold">{fechamentos.length} dia(s)</p>
            </div>
            <div className="bg-card p-4 rounded-xl shadow-card">
              <p className="text-sm text-muted-foreground">Comissão Japa</p>
              <p className="text-2xl font-bold text-primary">{formatCurrency(totalComissaoJapa)}</p>
            </div>
            <div className="bg-card p-4 rounded-xl shadow-card">
              <p className="text-sm text-muted-foreground">Comissão Trattoria</p>
              <p className="text-2xl font-bold text-primary">{formatCurrency(totalComissaoTrattoria)}</p>
            </div>
            <div className="bg-card p-4 rounded-xl shadow-card">
              <p className="text-sm text-muted-foreground">Total a Distribuir</p>
              <p className="text-2xl font-bold text-primary">{formatCurrency(totalGeral)}</p>
            </div>
          </div>
        )}

        {/* Tabela de Rateio */}
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
            <p className="text-muted-foreground">Cadastre funcionários ativos para calcular o rateio.</p>
          </div>
        ) : (
          <div className="bg-card rounded-2xl shadow-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Funcionário</TableHead>
                  <TableHead>Setor</TableHead>
                  <TableHead>Frente</TableHead>
                  <TableHead className="text-right">Japa</TableHead>
                  <TableHead className="text-right">Trattoria</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rateio.map((r) => (
                  <TableRow key={r.funcionario.id}>
                    <TableCell className="font-medium">{r.funcionario.nome}</TableCell>
                    <TableCell>{r.funcionario.setor}</TableCell>
                    <TableCell>{r.funcionario.frente}</TableCell>
                    <TableCell className="text-right">{formatCurrency(r.valorJapa)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(r.valorTrattoria)}</TableCell>
                    <TableCell className="text-right font-semibold text-primary">
                      {formatCurrency(r.valor)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge 
                        variant={r.pago ? "default" : "secondary"}
                      >
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
        )}
      </div>
    </AppLayout>
  );
};

export default Rateio;
