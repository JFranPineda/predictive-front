import { type Language, LOCALES } from './config';
import { currentLocale } from './index';

/**
 * Formatting goes through `Intl`, never through hand-rolled string work.
 *
 * Careful with the obvious assumption: `es-PE` writes 1,234.50 exactly like
 * `en-US` — dot for decimals, comma for thousands. It is `es-ES` that uses
 * 1234,50. So "Spanish means comma decimals" is false here, and hardcoding a
 * comma would corrupt every number a Peruvian user reads. Ask `Intl`.
 */
export function formatNumber(
  value: number | string | null | undefined,
  decimals = 2,
  locale = currentLocale(),
): string {
  if (value === null || value === undefined || value === '') return '—';
  const numeric = typeof value === 'string' ? Number(value) : value;
  if (Number.isNaN(numeric)) return '—';
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(numeric);
}

export function formatMeasurement(
  value: number | string | null | undefined,
  unit: string,
  decimals = 2,
  locale = currentLocale(),
): string {
  const formatted = formatNumber(value, decimals, locale);
  return formatted === '—' ? formatted : `${formatted} ${unit}`;
}

export function formatDate(value: string | Date | null, locale = currentLocale()): string {
  if (!value) return '—';
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(value));
}

export function formatDateTime(value: string | Date | null, locale = currentLocale()): string {
  if (!value) return '—';
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(value),
  );
}

export function formatPercent(ratio: number, locale = currentLocale()): string {
  return new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 0 }).format(ratio);
}

/** Days overdue and similar counters read better as a relative phrase. */
export function formatRelativeDays(days: number, locale = currentLocale()): string {
  return new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(-days, 'day');
}

export function localeOf(language: Language): string {
  return LOCALES[language];
}
