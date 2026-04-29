import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/processData';
import { Button } from '@/components/ui/button';
import { Loader2, Printer, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Funcionario {
  id: string;
  nome: string;
  setor: 'Garçom' | 'Cozinha' | 'Administrativo';
  frente: 'Japa' | 'Trattoria' | 'Ambas';
  ativo: boolean;
}

interface Fechamento {
  data: string;
  comissao_japa: number | null;
  comissao_trattoria: number | null;
  japa_taxa: number | null;
  trattoria_taxa: number | null;
}

interface RateioRow {
  funcionarioId: string;
  nome: string;
  setor: string;
  frente: string;
  valorJapa: number;
  valorTrattoria: number;
  totalMes: number;
}

const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export const RateioMensal = () => {
  const [rows, setRows] = useState<RateioRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [monthStart, setMonthStart] = useState<Date>(() => startOfMonth(new Date()));
  const [diasComFechamento, setDiasComFechamento] = useState(0);

  const monthEnd = endOfMonth(monthStart);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthStart]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const startStr = format(monthStart, 'yyyy-MM-dd');
      const endStr = format(monthEnd, 'yyyy-MM-dd');

      const [funcRes, fechRes] = await Promise.all([
        supabase.from('funcionarios').select('*').eq('ativo', true),
        supabase
          .from('fechamentos')
          .select('data, comissao_japa, comissao_trattoria, japa_taxa, trattoria_taxa')
          .gte('data', startStr)
          .lte('data', endStr)
          .order('data', { ascending: true }),
      ]);

      const funcs = (funcRes.data || []) as Funcionario[];
      const fechs = (fechRes.data || []) as Fechamento[];

      setDiasComFechamento(fechs.length);

      if (fechs.length === 0 || funcs.length === 0) {
        setRows([]);
        setIsLoading(false);
        return;
      }

      // Mesmas fórmulas usadas no Rateio.tsx (semanal), aplicadas ao mês
      const totalComissaoJapa = fechs.reduce((s, f) => s + num(f.comissao_japa), 0);
      const totalComissaoTrattoria = fechs.reduce((s, f) => s + num(f.comissao_trattoria), 0);
      const totalComissao8 = totalComissaoJapa + totalComissaoTrattoria;

      const percentGarcom = 0.475 / 0.8;
      const percentCozinha = 0.275 / 0.8;
      const percentAdmin = 0.05 / 0.8;

      const japaGarcom = totalComissaoJapa * percentGarcom;
      const japaCozinha = totalComissaoJapa * percentCozinha;
      const trattoriaGarcom = totalComissaoTrattoria * percentGarcom;
      const trattoriaCozinha = totalComissaoTrattoria * percentCozinha;
      const adminTotal = totalComissao8 * percentAdmin;

      const garcomJapaFuncs = funcs.filter(f => f.setor === 'Garçom' && (f.frente === 'Japa' || f.frente === 'Ambas'));
      const garcomTrattoriaFuncs = funcs.filter(f => f.setor === 'Garçom' && (f.frente === 'Trattoria' || f.frente === 'Ambas'));
      const cozinhaJapaFuncs = funcs.filter(f => f.setor === 'Cozinha' && (f.frente === 'Japa' || f.frente === 'Ambas'));
      const cozinhaTrattoriaFuncs = funcs.filter(f => f.setor === 'Cozinha' && (f.frente === 'Trattoria' || f.frente === 'Ambas'));
      const adminFuncs = funcs.filter(f => f.setor === 'Administrativo');

      const map = new Map<string, RateioRow>();
      const ensure = (f: Funcionario): RateioRow => {
        let r = map.get(f.id);
        if (!r) {
          r = {
            funcionarioId: f.id,
            nome: f.nome,
            setor: f.setor,
            frente: f.frente,
            valorJapa: 0,
            valorTrattoria: 0,
            totalMes: 0,
          };
          map.set(f.id, r);
        }
        return r;
      };

      if (garcomJapaFuncs.length > 0) {
        const v = japaGarcom / garcomJapaFuncs.length;
        garcomJapaFuncs.forEach(f => { ensure(f).valorJapa += v; });
      }
      if (garcomTrattoriaFuncs.length > 0) {
        const v = trattoriaGarcom / garcomTrattoriaFuncs.length;
        garcomTrattoriaFuncs.forEach(f => { ensure(f).valorTrattoria += v; });
      }
      if (cozinhaJapaFuncs.length > 0) {
        const v = japaCozinha / cozinhaJapaFuncs.length;
        cozinhaJapaFuncs.forEach(f => { ensure(f).valorJapa += v; });
      }
      if (cozinhaTrattoriaFuncs.length > 0) {
        const v = trattoriaCozinha / cozinhaTrattoriaFuncs.length;
        cozinhaTrattoriaFuncs.forEach(f => { ensure(f).valorTrattoria += v; });
      }
      if (adminFuncs.length > 0 && totalComissao8 > 0) {
        const valorAdmin = adminTotal / adminFuncs.length;
        const propJapa = totalComissaoJapa / totalComissao8;
        const propTrattoria = totalComissaoTrattoria / totalComissao8;
        adminFuncs.forEach(f => {
          const r = ensure(f);
          r.valorJapa += valorAdmin * propJapa;
          r.valorTrattoria += valorAdmin * propTrattoria;
        });
      }

      const processed = Array.from(map.values())
        .map(r => ({ ...r, totalMes: r.valorJapa + r.valorTrattoria }))
        .sort((a, b) => b.totalMes - a.totalMes);

      setRows(processed);
    } catch (err) {
      console.error('[RateioMensal] erro ao calcular:', err);
      setRows([]);
    } finally {
      setIsLoading(false);
    }
  };

  const totalGeral = rows.reduce((acc, r) => acc + num(r.totalMes), 0);
  const totalJapa = rows.reduce((acc, r) => acc + num(r.valorJapa), 0);
  const totalTrattoria = rows.reduce((acc, r) => acc + num(r.valorTrattoria), 0);

  const handlePrintMonthly = () => {
    const mesRef = format(monthStart, "MMMM 'de' yyyy", { locale: ptBR });
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`<html><head><title>Rateio Mensal - ${mesRef}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 30px; max-width: 900px; margin: 0 auto; }
        h1 { font-size: 20px; text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background: #f0f0f0; } .text-right { text-align: right; }
        tfoot td { font-weight: bold; background: #f9f9f9; }
      </style></head><body>
      <h1>RATEIO MENSAL DE COMISSÕES</h1>
      <p style="text-align:center">${mesRef.toUpperCase()} • ${diasComFechamento} dia(s) com fechamento</p>
      <table>
        <thead><tr>
          <th>Colaborador</th><th>Setor</th><th>Frente</th>
          <th class="text-right">Japa</th><th class="text-right">Trattoria</th><th class="text-right">Total Mês</th>
        </tr></thead>
        <tbody>${rows.map(r => `<tr>
          <td>${r.nome}</td><td>${r.setor}</td><td>${r.frente}</td>
          <td class="text-right">${formatCurrency(r.valorJapa)}</td>
          <td class="text-right">${formatCurrency(r.valorTrattoria)}</td>
          <td class="text-right">${formatCurrency(r.totalMes)}</td>
        </tr>`).join('')}</tbody>
        <tfoot><tr>
          <td colspan="3">Total Geral</td>
          <td class="text-right">${formatCurrency(totalJapa)}</td>
          <td class="text-right">${formatCurrency(totalTrattoria)}</td>
          <td class="text-right">${formatCurrency(totalGeral)}</td>
        </tr></tfoot>
      </table></body></html>`);
    w.document.close();
    w.print();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setMonthStart(subMonths(monthStart, 1))}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-muted">
            <Calendar className="w-4 h-4" />
            <span className="font-medium capitalize">
              {format(monthStart, "MMMM 'de' yyyy", { locale: ptBR })}
            </span>
          </div>
          <Button variant="outline" size="icon" onClick={() => setMonthStart(addMonths(monthStart, 1))}>
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setMonthStart(startOfMonth(new Date()))}>
            Mês atual
          </Button>
        </div>

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

      {isLoading ? (
        <div className="flex justify-center p-10">
          <Loader2 className="animate-spin" />
        </div>
      ) : rows.length === 0 ? (
        <div className="bg-card rounded-xl border p-10 text-center text-muted-foreground">
          Nenhum fechamento encontrado para este mês.
        </div>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {diasComFechamento} dia(s) com fechamento neste mês.
          </p>
          <div className="bg-card rounded-xl border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Colaborador</TableHead>
                  <TableHead>Setor</TableHead>
                  <TableHead>Frente</TableHead>
                  <TableHead className="text-right">Japa</TableHead>
                  <TableHead className="text-right">Trattoria</TableHead>
                  <TableHead className="text-right">Total Mês</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.funcionarioId}>
                    <TableCell className="font-medium">{r.nome}</TableCell>
                    <TableCell>{r.setor}</TableCell>
                    <TableCell>{r.frente}</TableCell>
                    <TableCell className="text-right tabular-nums text-japa">
                      {formatCurrency(r.valorJapa)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-trattoria">
                      {formatCurrency(r.valorTrattoria)}
                    </TableCell>
                    <TableCell className="text-right font-bold text-primary tabular-nums">
                      {formatCurrency(r.totalMes)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={3}>Total Geral</TableCell>
                  <TableCell className="text-right tabular-nums">{formatCurrency(totalJapa)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatCurrency(totalTrattoria)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatCurrency(totalGeral)}</TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        </>
      )}
    </div>
  );
};
