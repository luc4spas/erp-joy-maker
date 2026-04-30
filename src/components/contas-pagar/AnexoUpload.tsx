import { useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Loader2, Upload, FileText, ExternalLink, Trash2 } from 'lucide-react';

interface AnexoUploadProps {
  label: string;
  /** Folder under contas-pagar/ — e.g. "nota-fiscal", "boleto", "comprovante" */
  kind: 'nota-fiscal' | 'boleto' | 'comprovante';
  /** Identifier used to scope the file path (conta_id or parcela_id) */
  ownerId: string;
  currentUrl: string | null | undefined;
  onChange: (url: string | null) => Promise<void> | void;
  compact?: boolean;
}

const BUCKET = 'anexos';

export function AnexoUpload({
  label,
  kind,
  ownerId,
  currentUrl,
  onChange,
  compact = false,
}: AnexoUploadProps) {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const extractPath = (url: string): string | null => {
    // URL pública assinada/format: .../object/sign/anexos/<path>?token=...
    // ou .../object/public/anexos/<path>
    const m = url.match(/\/anexos\/([^?]+)/);
    return m ? decodeURIComponent(m[1]) : null;
  };

  const openFile = async () => {
    if (!currentUrl) return;
    const path = extractPath(currentUrl);
    if (!path) {
      window.open(currentUrl, '_blank');
      return;
    }
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(path, 60 * 10);
    if (error || !data) {
      toast({ title: 'Erro ao abrir arquivo', description: error?.message, variant: 'destructive' });
      return;
    }
    window.open(data.signedUrl, '_blank');
  };

  const handleSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const ext = file.name.split('.').pop() || 'bin';
      const path = `contas-pagar/${kind}/${ownerId}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      // Salva a path completa com prefixo do bucket para podermos resignar depois
      const stored = `${supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl}`;
      await onChange(stored);
      toast({ title: `${label} anexado!` });
    } catch (err: any) {
      toast({ title: 'Erro no upload', description: err.message, variant: 'destructive' });
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleRemove = async () => {
    if (!currentUrl) return;
    const path = extractPath(currentUrl);
    setBusy(true);
    try {
      if (path) await supabase.storage.from(BUCKET).remove([path]);
      await onChange(null);
      toast({ title: `${label} removido` });
    } catch (err: any) {
      toast({ title: 'Erro ao remover', description: err.message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={compact ? 'flex items-center gap-2' : 'space-y-2'}>
      {!compact && (
        <div className="text-sm font-medium flex items-center gap-2">
          <FileText className="w-4 h-4 text-muted-foreground" />
          {label}
        </div>
      )}
      <div className="flex items-center gap-2 flex-wrap">
        {currentUrl ? (
          <>
            <Button type="button" variant="outline" size="sm" onClick={openFile} disabled={busy}>
              <ExternalLink className="w-4 h-4" /> Visualizar
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()} disabled={busy}>
              <Upload className="w-4 h-4" /> Substituir
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={handleRemove} disabled={busy}>
              <Trash2 className="w-4 h-4 text-destructive" />
            </Button>
          </>
        ) : (
          <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()} disabled={busy}>
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {compact ? label : `Anexar ${label}`}
          </Button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,image/*"
          className="hidden"
          onChange={handleSelect}
        />
      </div>
    </div>
  );
}