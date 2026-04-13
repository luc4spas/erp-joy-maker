import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/processData';
import { Button } from '@/components/ui/button';
import { Loader2, Printer } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { format, startOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const RateioMensal = () => {
  const [rows, setRows] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
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

  const handlePrintMonthly = () => {
    const mesRef = format(monthStart, 'MMMM/yyyy', { locale: ptBR });
    const w = window.open('', '_blank');
    if (w) {
      w.document.write(`<html><head><title>Rateio Mensal - ${mesRef}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 30px; max-width: 800px; margin: 0 auto; }
          h1 { font-size: 20px; text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background: #f0f0f0; } .text-right { text-align: right; }
          tfoot td { font-weight: bold; background: #f9f9f9; }
        </style></head><body>
        <h1>RATEIO MENSAL DE COMISSÕES</h1>
        <p style="text-align:center">${mesRef.toUpperCase()}</p>
        <table>
          <thead><tr><th>Colaborador</th><th>Setor</th><th class="text-right">Total Mês</th></tr></thead>
          <tbody>${rows.map(r => `<tr><td>${r.nome}</td><td>${r.setor}</td><td class="text-right">${formatCurrency(r.totalMes)}</td></tr>`).join('')}</tbody>
          <tfoot><tr><td colspan="2">Total Geral</td><td class="text-right">${formatCurrency(rows.reduce((a, c) => a + c.totalMes, 0))}</td></tr></tfoot>
        </table></body></html>`);
      w.document.close();
      w.print();
    }
  };

  if (isLoading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Resumo Mensal de Comissões</h3>
        <Button 
          variant="outline"
          onClick={handlePrintMonthly} 
          disabled={rows.length === 0}
          className="gap-2"
        >
          <Printer className="w-4 h-4" />
          Imprimir Relatório
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
