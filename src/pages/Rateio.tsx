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

// ... (Interfaces mantidas iguais)

const Rateio = () => {
  const [rateio, setRateio] = useState<any[]>([]);
  const [fechamentos, setFechamentos] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeek(new Date(), { weekStartsOn: 0 }));
  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 0 });
  
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // ... (Lógica de fetchData e calcularRateio mantida)

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
        <div style="page-break-after: always; border-bottom: 1px dashed #000; padding: 30px; font-family: sans-serif;">
          <h1 style="text-align:center; font-size: 20px;">RECIBO DE COMISSÃO</h1>
          <p style="text-align:center;">Período: ${periodoInicio} a ${periodoFim}</p>
          <hr/>
          <p><strong>Colaborador:</strong> ${item.funcionario.nome}</p>
          <p><strong>Setor:</strong> ${item.funcionario.setor}</p>
          <div style="background: #f0f0f0; padding: 10px; margin: 20px 0;">
            <p>Japa: ${formatCurrency(item.valorJapa)}</p>
            <p>Trattoria: ${formatCurrency(item.valorTrattoria)}</p>
            <p><strong>TOTAL: ${formatCurrency(item.valor)}</strong></p>
          </div>
          <br/><br/>
          <div style="text-align:center; border-top: 1px solid #000; margin-top: 40px; padding-top: 10px;">
            Assinatura: ${item.funcionario.nome}
          </div>
        </div>
      `).join('');

      w.document.write(`<html><head><title>Recibos</title></head><body>${content}</body></html>`);
      w.document.close();
      w.print();
    }
  };

  if (authLoading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin" /></div>;

  return (
    <AppLayout title="Rateio Semanal" subtitle="Gestão de Comissões">
      <div className="space-y-6">
        {/* Header de Navegação */}
        <div className="bg-card p-4 rounded-xl border flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setWeekStart(subWeeks(weekStart, 1))}><ChevronLeft/></Button>
            <span className="font-bold">{format(weekStart, "dd/MM")} - {format(weekEnd, "dd/MM/yyyy")}</span>
            <Button variant="outline" size="sm" onClick={() => setWeekStart(addWeeks(weekStart, 1))}><ChevronRight/></Button>
          </div>
          
          {/* BOTÕES DE AÇÃO - Fora de condicionais complexas para garantir visibilidade */}
          <div className="flex gap-2">
            <Button 
              onClick={handlePrintAll} 
              className="bg-blue-600 hover:bg-blue-700 text-white shadow-md"
            >
              <FileText className="w-4 h-4 mr-2" /> 
              Imprimir Todos os Recibos
            </Button>
          </div>
        </div>

        {/* ... Restante das tabelas e resumos ... */}
      </div>
    </AppLayout>
  );
};

export default Rateio;
