import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Copy, Check } from 'lucide-react';
import { DashboardData, formatCurrency } from '@/lib/processData';

interface WhatsAppButtonProps {
  data: DashboardData;
  date?: string;
}

export function WhatsAppButton({ data, date }: WhatsAppButtonProps) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const generateWhatsAppText = () => {
    const displayDate = date || new Date().toLocaleDateString('pt-BR');
    const totalGeral = data.trattoria.totalGeral + data.japa.totalGeral;
    const totalComissao = data.trattoria.comissaoGarcom + data.japa.comissaoGarcom;

    const text = `📊 FECHAMENTO ${displayDate}

🍝 TRATTORIA: ${formatCurrency(data.trattoria.totalGeral)}
   └ Itens: ${formatCurrency(data.trattoria.totalValor)}
   └ Taxa Serviço: ${formatCurrency(data.trattoria.totalAcrescimo)}
   └ Comissão (8%): ${formatCurrency(data.trattoria.comissaoGarcom)}

🍣 JAPA: ${formatCurrency(data.japa.totalGeral)}
   └ Itens: ${formatCurrency(data.japa.totalValor)}
   └ Taxa Serviço: ${formatCurrency(data.japa.totalAcrescimo)}
   └ Comissão (8%): ${formatCurrency(data.japa.comissaoGarcom)}

💰 TOTAL GERAL: ${formatCurrency(totalGeral)}
👥 COMISSÃO TOTAL: ${formatCurrency(totalComissao)}`;

    return text;
  };

  const handleCopy = async () => {
    try {
      const text = generateWhatsAppText();
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast({
        title: "Copiado!",
        description: "Resumo copiado para a área de transferência.",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: "Erro ao copiar",
        description: "Não foi possível copiar o texto.",
        variant: "destructive",
      });
    }
  };

  return (
    <Button
      onClick={handleCopy}
      variant="outline"
      className="gap-2"
    >
      {copied ? (
        <>
          <Check className="w-4 h-4" />
          Copiado!
        </>
      ) : (
        <>
          <Copy className="w-4 h-4" />
          Copiar Resumo
        </>
      )}
    </Button>
  );
}
