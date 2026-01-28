import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

/**
 * Format a date string to Brazilian format DD/MM/YYYY
 */
export function formatDateBR(dateString: string | null | undefined): string {
  if (!dateString) return 'Data não informada';

  try {
    // Parse the date string (handles both yyyy-mm-dd and ISO formats)
    const date = new Date(dateString + 'T12:00:00');
    if (isNaN(date.getTime())) return dateString;

    return format(date, 'dd/MM/yyyy', { locale: ptBR });
  } catch {
    return dateString;
  }
}

/**
 * Format a date string for display with day name
 */
export function formatDateLongBR(dateString: string | null | undefined): string {
  if (!dateString) return 'Data não informada';

  try {
    const date = new Date(dateString + 'T12:00:00');
    if (isNaN(date.getTime())) return dateString;

    return format(date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  } catch {
    return dateString;
  }
}

/**
 * Get date-only string (yyyy-MM-dd) from any date input
 */
export function toDateOnlyString(value: Date | string): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  return format(date, 'yyyy-MM-dd');
}
