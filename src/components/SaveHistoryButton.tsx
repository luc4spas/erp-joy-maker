import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Save, Check, Loader2 } from 'lucide-react';
import { DashboardData } from '@/lib/processData';

interface SaveHistoryButtonProps {
  data: DashboardData;
}

export function SaveHistoryButton({ data }: SaveHistoryButtonProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const handleSave = async () => {
    if (!user) {
      toast({ title: "Erro", description: "Você precisa estar logado.", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    try {
      const getValidISODate = (raw: any): string => {
        const today = new Date().toISOString().split('T')[0];
        if (!raw) return today;

        const datePart = String(raw).split(' ')[0];

        if (datePart.includes('/')) {
          const [d, m, y] = datePart.split('/');
          if (y && m && d) {
            return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
          }
        }

        if (datePart.match(/^\d{4}-\d{2}-\d{2}$/)) {
          return datePart;
        }

        return today;
      };

      const reportDate = getValidISODate(data.dataRelatorio);

      // Agregação dos pagamentos (JSONB)
      const pagamentosJapa: Record<string, number> = {};
      const pagamentosTrattoria: Record<string, number> = {};

      Object.entries(data.japa.porFormaPagamento).forEach(([method, values]) => {
        pagamentosJapa[method] = values.frValor;
      });

      Object.entries(data.trattoria.porFormaPagamento).forEach(([method, values]) => {
        pagamentosTrattoria[method] = values.frValor;
      });

      const payload = {
        user_id: user.id,
        data: reportDate,
        japa_total: data.japa.totalGeral,
        japa_taxa: data.japa.totalAcrescimo,
        japa_valor_itens: data.japa.totalValor,
        trattoria_total: data.trattoria.totalGeral,
        trattoria_taxa: data.trattoria.totalAcrescimo,
        trattoria_valor_itens: data.trattoria.totalValor,
        total_geral: data.trattoria.totalGeral + data.japa.totalGeral,
        comissao_japa: data.japa.comissaoGarcom,
        comissao_trattoria: data.trattoria.comissaoGarcom,
        pagamentos_japa: pagamentosJapa,
        pagamentos_trattoria: pagamentosTrattoria,
      };

      const { error } = await supabase.from('fechamentos').insert(payload);

      if (error) throw error;

      setIsSaved(true);
      toast({ title: "Sucesso!", description: `Salvo com a data: ${reportDate}` });
    } catch (error: any) {
      console.error('Erro crítico ao salvar:', error);
      toast({
        title: "Erro ao salvar",
        description: "A data da planilha está em formato inválido. Verifique a coluna 'data'.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Button onClick={handleSave} disabled={isSaving || isSaved} className="gap-2">
      {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : isSaved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
      {isSaving ? "Salvando..." : isSaved ? "Salvo no Banco" : "Salvar no Histórico"}
    </Button>
  );
}
