import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { FileUpload } from '@/components/FileUpload';
import { Dashboard } from '@/components/Dashboard';
import { parseFile, processData, DashboardData } from '@/lib/processData';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { AppLayout } from '@/components/AppLayout';
import { Loader2 } from 'lucide-react';

const Upload = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  const handleFileSelect = async (file: File) => {
    setIsLoading(true);
    try {
      const rawData = await parseFile(file);
      const processed = processData(rawData);
      setData(processed);
      toast({
        title: "Arquivo processado com sucesso!",
        description: `${processed.rows.length} transações encontradas.`,
      });
    } catch (error) {
      console.error('Error processing file:', error);
      toast({
        title: "Erro ao processar arquivo",
        description: error instanceof Error ? error.message : "Verifique o formato do arquivo e tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setData(null);
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
    <AppLayout
      title={data ? "Resultado do Upload" : "Novo Upload"}
      subtitle={data ? "Revise os dados antes de salvar" : "Faça upload da planilha de fechamento"}
    >
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <Loader2 className="w-12 h-12 animate-spin text-primary" />
          <p className="text-muted-foreground">Processando arquivo...</p>
        </div>
      ) : data ? (
        <Dashboard data={data} onReset={handleReset} />
      ) : (
        <div className="py-12">
          <FileUpload onFileSelect={handleFileSelect} isLoading={isLoading} />
        </div>
      )}
    </AppLayout>
  );
};

export default Upload;
