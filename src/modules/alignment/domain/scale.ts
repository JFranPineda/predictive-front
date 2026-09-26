import type { RpmTier } from './types';

/** `< 1000 rpm`, `1000 – 2000 rpm`, `≥ 4000 rpm`: a tier reads from the one above it. */
export function tierRange(previous: number | null, ceiling: number | null): string {
  if (previous === null && ceiling === null) return 'cualquier RPM';
  if (previous === null) return `< ${ceiling} rpm`;
  if (ceiling === null) return `≥ ${previous} rpm`;
  return `${previous} – ${ceiling} rpm`;
}

/**
 * The same rules the server applies (Q10), checked before saving so the
 * message comes at once: ceilings that climb, only the last one open, and
 * tolerances above zero. Returns the i18n key of what is wrong, or null.
 */
export function tierProblem(tiers: RpmTier[]): string | null {
  if (tiers.length === 0) return 'scale.needsTier';
  const ceilings = tiers.map((tier) => tier.rpm_ceiling);
  if (ceilings.slice(0, -1).some((ceiling) => ceiling === null)) return 'scale.onlyLastOpen';
  const closed = ceilings.filter((ceiling): ceiling is number => ceiling !== null);
  if (closed.some((ceiling, index) => index > 0 && ceiling <= closed[index - 1]!)) return 'scale.climbing';
  const positive = (value: string) => Number(value.replace(',', '.')) > 0;
  if (tiers.some((tier) => !positive(tier.parallel_mm) || !positive(tier.angular_mm_per_100mm))) {
    return 'scale.positive';
  }
  return null;
}
