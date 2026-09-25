/**
 * An operating value as the input shows it: at the parameter's precision,
 * without thousands separators (it is an input, not a report cell). The
 * server keeps "1785.0000"; the technician reads 1785.
 */
export function atPrecision(value: string | null | undefined, decimals: number): string {
  if (value === null || value === undefined || value === '') return '';
  const numeric = Number(value);
  return Number.isNaN(numeric) ? value : numeric.toFixed(decimals);
}

/** The smallest step the input accepts: 1 for whole numbers, 0.01 for two decimals. */
export function stepFor(decimals: number): string {
  return decimals > 0 ? `0.${'0'.repeat(decimals - 1)}1` : '1';
}
