import * as XLSX from 'xlsx';

export interface RawRow {
  tipovenda: string;
  valor: number;
  acrescimo: number;
  'FR Valor': number;
  formaPagamento?: string;
  data?: string;
}

export interface ProcessedRow {
  mesa: string;
  restaurante: 'TRATTORIA' | 'JAPA';
  valor: number;
  acrescimo: number;
  frValor: number;
  formaPagamento: string;
}

export interface PaymentMethodData {
  valor: number;
  acrescimo: number;
  frValor: number;
}

export interface RestaurantSummary {
  restaurante: 'TRATTORIA' | 'JAPA';
  totalValor: number;
  totalAcrescimo: number;
  totalGeral: number;
  comissaoGarcom: number;
  porFormaPagamento: Record<string, PaymentMethodData>;
}

export interface DashboardData {
  trattoria: RestaurantSummary;
  japa: RestaurantSummary;
  rows: ProcessedRow[];
  dataRelatorio: string | null;
}

function extractTableNumber(tipovenda: string): number | null {
  if (!tipovenda) return null;
  const match = tipovenda.match(/\d+/);
  return match ? parseInt(match[0], 10) : null;
}

function classifyRestaurant(tableNumber: number): 'TRATTORIA' | 'JAPA' {
  return tableNumber >= 1 && tableNumber <= 299 ? 'TRATTORIA' : 'JAPA';
}

function parseNumber(value: any): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const cleaned = value.replace(/[^\d,.-]/g, '').replace(',', '.');
    return parseFloat(cleaned) || 0;
  }
  return 0;
}

function findColumnKey(headers: string[], possibleNames: string[]): string | null {
  const normalizedHeaders = headers.map(h => h?.toLowerCase().trim());
  for (const name of possibleNames) {
    const index = normalizedHeaders.findIndex(h => h === name.toLowerCase());
    if (index !== -1) return headers[index];
  }
  return null;
}

function parseExcelDate(value: any): string | null {
  if (!value) return null;

  // Se for o número serial do Excel
  if (typeof value === 'number') {
    const date = XLSX.SSF.parse_date_code(value);
    return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
  }

  // Se for string (ex: "18/01/2026 23:48:24")
  if (typeof value === 'string') {
    // 1. Pega apenas os primeiros 10 caracteres (a data)
    const datePart = value.trim().substring(0, 10);

    // 2. Se estiver no formato DD/MM/YYYY, inverte para YYYY-MM-DD
    if (datePart.includes('/')) {
      const [d, m, y] = datePart.split('/');
      if (y && m && d) return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }

    // 3. Se já for YYYY-MM-DD, retorna direto
    if (datePart.includes('-')) {
      return datePart;
    }
  }

  return null;
}

export function parseFile(file: File): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array', cellDates: false });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
        resolve(jsonData);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
    reader.readAsArrayBuffer(file);
  });
}

export function processData(rawData: any[]): DashboardData {
  if (!rawData.length) throw new Error('Arquivo vazio');

  const headers = Object.keys(rawData[0]);
  const tipovendaKey = findColumnKey(headers, ['tipovenda', 'tipo venda', 'mesa', 'tipo_venda']) || 'tipovenda';
  const valorKey = findColumnKey(headers, ['valor', 'itens', 'total']) || 'valor';
  const acrescimoKey = findColumnKey(headers, ['acrescimo', 'acréscimo', 'taxa', 'taxa de serviço']) || 'acrescimo';
  const frValorKey = findColumnKey(headers, ['FR Valor', 'fr valor', 'valor recebido']) || 'FR Valor';
  const formaPagamentoKey = findColumnKey(headers, ['forma pagamento', 'Forma Recebimento', 'FR Descricao']) || 'FR Descricao';
  const dataKey = findColumnKey(headers, ['data', 'Data', 'DATA']) || 'data';

  let dataRelatorio: string | null = null;
  for (const row of rawData) {
    if (row[dataKey]) {
      dataRelatorio = parseExcelDate(row[dataKey]);
      if (dataRelatorio) break;
    }
  }

  let lastTipovenda = '';
  const filledData = rawData.map((row: any) => {
    const tipovenda = row[tipovendaKey]?.toString().trim() || '';
    if (tipovenda) lastTipovenda = tipovenda;
    return {
      tipovenda: tipovenda || lastTipovenda,
      valor: parseNumber(row[valorKey]),
      acrescimo: parseNumber(row[acrescimoKey]),
      frValor: parseNumber(row[frValorKey]),
      formaPagamento: row[formaPagamentoKey]?.toString().trim() || 'Outros',
    };
  });

  const processedRows: ProcessedRow[] = filledData
    .filter(row => row.tipovenda)
    .map(row => {
      const tableNumber = extractTableNumber(row.tipovenda);
      const restaurante = tableNumber ? classifyRestaurant(tableNumber) : 'TRATTORIA';
      return {
        mesa: row.tipovenda,
        restaurante,
        valor: row.valor,
        acrescimo: row.acrescimo,
        frValor: row.frValor,
        formaPagamento: row.formaPagamento,
      };
    });

  const createSummary = (restaurante: 'TRATTORIA' | 'JAPA'): RestaurantSummary => {
    const rows = processedRows.filter(r => r.restaurante === restaurante);
    const porFormaPagamento: Record<string, PaymentMethodData> = {};

    rows.forEach(row => {
      if (!porFormaPagamento[row.formaPagamento]) {
        porFormaPagamento[row.formaPagamento] = { valor: 0, acrescimo: 0, frValor: 0 };
      }
      porFormaPagamento[row.formaPagamento].valor += row.valor;
      porFormaPagamento[row.formaPagamento].acrescimo += row.acrescimo;
      porFormaPagamento[row.formaPagamento].frValor += row.frValor;
    });

    // NOVA LÓGICA: Subtrair TROCO do DINHEIRO
    if (porFormaPagamento['TROCO'] && porFormaPagamento['DINHEIRO']) {
      // TROCO vem negativo, então somamos para subtrair
      porFormaPagamento['DINHEIRO'].frValor += porFormaPagamento['TROCO'].frValor;
      // Remove o TROCO do objeto
      delete porFormaPagamento['TROCO'];
    } else if (porFormaPagamento['TROCO']) {
      // Se houver TROCO mas não houver DINHEIRO, apenas remove
      delete porFormaPagamento['TROCO'];
    }

    const totalValor = rows.reduce((sum, r) => sum + r.valor, 0);
    // Recalcula totalGeral após ajuste do TROCO
    const totalGeral = Object.values(porFormaPagamento).reduce((sum, p) => sum + p.frValor, 0);
    
    return {
      restaurante,
      totalValor,
      totalAcrescimo: rows.reduce((sum, r) => sum + r.acrescimo, 0),
      totalGeral,
      comissaoGarcom: totalValor * 0.08,
      porFormaPagamento,
    };
  };

  return {
    trattoria: createSummary('TRATTORIA'),
    japa: createSummary('JAPA'),
    rows: processedRows,
    dataRelatorio,
  };
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}
