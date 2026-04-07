import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/processData';
import { Button } from '@/components/ui/button';
import { Loader2, Save, CheckCircle2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { format, startOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const RateioMensal = () => {
  const [rows, setRows] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [monthStart] = useState(() => startOfMonth(new Date()));
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, [monthStart]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // 1. Busca funcionários
      const { data: funcs } = await supabase.from('funcionarios').select('*').eq('ativo', true);
      
      // 2. Busca fechamentos do mês para calcular o rateio (Lógica baseada no seu Rateio.tsx)
      const { data: fechamentos } = await supabase
        .from('fechamentos')
        .select('*')
        .gte('data', format(monthStart, 'yyyy-MM-01'))
        .lte('data', format(new Date(), 'yyyy-MM-dd'));

      // --- Lógica de Cálculo do Rateio (Simplificada para o exemplo) ---
      // Aqui o sistema processa os valores de comissao_japa e comissao_trattoria
      // e distribui conforme os setores. 
      // NOTA: Use a sua lógica interna de cálculo para popular a variável 'processedRows'
      
      const processedRows = (funcs || []).map(f => ({
        funcionarioId: f.id,
        nome: f.nome,
        setor: f.setor,
        valorJapa: 0, // Vincular lógica de cálculo aqui
        valorTrattoria: 0, // Vincular lógica de cálculo aqui
        totalMes: 0 // Soma dos valores calculados
      }));

      setRows(processedRows);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  // FUNÇÃO PARA SALVAR NO BANCO DE DADOS
  const handleEfetivarComissoes = async () => {
    if (rows.length === 0) return;
    setIsSaving(true);
    
    const refMonth = format(monthStart, 'yyyy-MM-01');

    try {
      // 1. Deleta comissões antigas do mês para evitar duplicidade
      const { error: deleteError } = await supabase
        .from('payroll_transactions')
        .delete()
        .eq('reference_month', refMonth)
        .eq('transaction_type', 'comissao');

      if (deleteError) throw deleteError;

      // 2. Prepara os dados para o insert
      // Filtramos apenas quem tem valor de comissão > 0
      const transactionsToInsert = rows
        .filter(r => r.totalMes > 0)
        .map(r => ({
          employee_id: r.funcionarioId,
          transaction_type: 'comissao',
          amount: r.totalMes,
          reference_month: refMonth,
          transaction_date: new Date().toISOString(),
          description: `Comissão Rateio Mensal - ${format(monthStart, 'MMMM/yyyy', { locale: ptBR })}`
        }));

      if (transactionsToInsert.length > 0) {
        const { error: insertError } = await supabase
          .from('payroll_transactions')
          .insert(transactionsToInsert);

        if (insertError) throw insertError;
      }

      toast({
        title: "Comissões Efetivadas!",
        description: "Os valores foram salvos e já aparecem no Fechamento de Folha.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao salvar",
        description: error.message,
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Resumo Mensal de Comissões</h3>
        <Button 
          onClick={handleEfetivarComissoes} 
          disabled={isSaving}
          className="bg-green-600 hover:bg-green-700 text-white gap-2"
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {isSaving ? "Salvando..." : "Efetivar Comissões na Folha"}
        </Button>
      </div>

      <div className="bg-card rounded-xl border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Colaborador</TableHead>
              <TableHead>Setor</TableHead>
              <TableHead className="text-right">Total Mês</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r, i) => (
              <TableRow key={i}>
                <TableCell className="font-medium">{r.nome}</TableCell>
                <TableCell>{r.setor}</TableCell>
                <TableCell className="text-right font-bold text-primary">
                  {formatCurrency(r.totalMes)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell colSpan={2}>Total Geral</TableCell>
              <TableCell className="text-right">
                {formatCurrency(rows.reduce((acc, curr) => acc + curr.totalMes, 0))}
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </div>
    </div>
  );
};
