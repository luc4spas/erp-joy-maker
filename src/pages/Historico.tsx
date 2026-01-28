import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/processData';
import { formatDateBR } from '@/lib/dateUtils';
import { AppLayout } from '@/components/AppLayout';
import { DateRangeFilter } from '@/components/DateRangeFilter';
import { Button } from '@/components/ui/button';
import { Trash2, Calendar, Loader2, Eye } from 'lucide-react';
import { startOfMonth, endOfMonth, format } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface Fechamento {
  id: string;
  data: string;
  japa_total: number;
  japa_taxa: number;
  japa_valor_itens: number;
  trattoria_total: number;
  trattoria_taxa: number;
  trattoria_valor_itens: number;
  total_geral: number;
  comissao_japa: number;
  comissao_trattoria: number;
  pagamentos_japa: Record<string, number>;
  pagamentos_trattoria: Record<string, number>;
  created_at: string;
}

const Historico = () => {
  const [fechamentos, setFechamentos] = useState<Fechamento[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<Date>(startOfMonth(new Date()));
  const [endDate, setEndDate] = useState<Date>(endOfMonth(new Date()));
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchFechamentos();
    }
  }, [user, startDate, endDate]);

  const fetchFechamentos = async () => {
    setIsLoading(true);
    try {
      const startStr = format(startDate, 'yyyy-MM-dd');
      const endStr = format(endDate, 'yyyy-MM-dd');

      const { data, error } = await supabase
        .from('fechamentos')
        .select('*')
        .gte('data', startStr)
        .lte('data', endStr)
        .order('data', { ascending: false });

      if (error) throw error;
      setFechamentos((data || []) as Fechamento[]);
    } catch (error) {
      console.error('Error fetching fechamentos:', error);
      toast({
        title: "Erro ao carregar histórico",
        description: "Não foi possível carregar os fechamentos anteriores.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const { error } = await supabase
        .from('fechamentos')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setFechamentos(prev => prev.filter(f => f.id !== id));
      toast({
        title: "Registro excluído",
        description: "O fechamento foi removido do histórico.",
      });
    } catch (error) {
      console.error('Error deleting fechamento:', error);
      toast({
        title: "Erro ao excluir",
        description: "Não foi possível excluir o registro.",
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

  const handleFilter = (start: Date, end: Date) => {
    setStartDate(start);
    setEndDate(end);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <AppLayout title="Histórico" subtitle="Visualize e gerencie registros anteriores">
      <div className="space-y-6">
        {/* Date Filter */}
        <DateRangeFilter
          onFilter={handleFilter}
          initialStartDate={startDate}
          initialEndDate={endDate}
        />

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : fechamentos.length === 0 ? (
          <div className="text-center py-16 bg-card rounded-2xl shadow-card">
            <Calendar className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">Nenhum fechamento encontrado</h2>
            <p className="text-muted-foreground mb-4">
              Não há registros para o período selecionado.
            </p>
            <Button onClick={() => navigate('/upload')}>
              Fazer upload de arquivo
            </Button>
          </div>
        ) : (
          <div className="bg-card rounded-2xl shadow-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Trattoria Total</TableHead>
                  <TableHead className="text-right">Japa Total</TableHead>
                  <TableHead className="text-right">Total Geral</TableHead>
                  <TableHead className="w-[120px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fechamentos.map((fechamento) => (
                  <TableRow key={fechamento.id}>
                    <TableCell className="font-medium">
                      {formatDateBR(fechamento.data)}
                    </TableCell>
                    <TableCell className="text-right text-trattoria-foreground">
                      {formatCurrency(Number(fechamento.trattoria_total))}
                    </TableCell>
                    <TableCell className="text-right text-japa-foreground">
                      {formatCurrency(Number(fechamento.japa_total))}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatCurrency(Number(fechamento.total_geral))}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => navigate(`/fechamento/${fechamento.id}`)}
                          title="Ver Detalhes"
                        >
                          <Eye className="w-4 h-4 text-primary" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              disabled={deletingId === fechamento.id}
                            >
                              {deletingId === fechamento.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Trash2 className="w-4 h-4 text-destructive" />
                              )}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir fechamento?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta ação não pode ser desfeita. O registro do dia {formatDateBR(fechamento.data)} será removido permanentemente.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(fechamento.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
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

export default Historico;
