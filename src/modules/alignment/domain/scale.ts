import type { RpmTier, RpmTierInput } from './types';

/** `< 1000 rpm`, `1000 – 2000 rpm`, `≥ 4000 rpm`: a tier reads from the one above it. */
export function tierRange(previous: number | null, ceiling: number | null): string {
  if (previous === null && ceiling === null) return 'cualquier RPM';
  if (previous === null) return `< ${ceiling} rpm`;
  if (ceiling === null) return `≥ ${previous} rpm`;
  return `${previous} – ${ceiling} rpm`;
}

const number = (value: string) => Number(value.replace(',', '.'));

/**
 * The same rules the server applies (Q10), checked before saving so the
 * message comes at once. Returns the i18n key of what is wrong, or null.
 */
export function tierProblem(tiers: RpmTier[]): string | null {
  if (tiers.length === 0) return 'scale.needsTier';
  const ceilings = tiers.map((tier) => tier.rpm_ceiling);
  if (ceilings.slice(0, -1).some((ceiling) => ceiling === null)) return 'scale.onlyLastOpen';
  const closed = ceilings.filter((ceiling): ceiling is number => ceiling !== null);
  if (closed.some((ceiling, index) => index > 0 && ceiling <= closed[index - 1]!)) return 'scale.climbing';
  for (const tier of tiers) {
    if (tier.bands.length === 0) return 'scale.needsBand';
    if (tier.bands.some((band) => !(number(band.parallel_mm) > 0) || !(number(band.angular_mm_per_100mm) > 0))) {
      return 'scale.positive';
    }
    const ordered = [...tier.bands].sort((a, b) => number(a.parallel_mm) - number(b.parallel_mm));
    const climbs = (key: 'parallel_mm' | 'angular_mm_per_100mm') =>
      ordered.every((band, index) => index === 0 || number(band[key]) > number(ordered[index - 1]![key]));
    if (!climbs('parallel_mm') || !climbs('angular_mm_per_100mm')) return 'scale.bandsClimb';
    const codes = [...tier.bands.map((band) => band.status_code), tier.beyond?.status_code].filter(Boolean);
    if (new Set(codes).size !== codes.length) return 'scale.stateOnce';
  }
  return null;
}

export function toInput(tiers: RpmTier[]): RpmTierInput[] {
  return tiers.map((tier) => ({
    rpm_ceiling: tier.rpm_ceiling,
    bands: tier.bands.map((band) => ({
      status_code: band.status_code,
      parallel_mm: band.parallel_mm,
      angular_mm_per_100mm: band.angular_mm_per_100mm,
    })),
    beyond_status_code: tier.beyond?.status_code ?? null,
  }));
}
