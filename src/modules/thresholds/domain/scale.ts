/**
 * How a band of a norma's scale reads: `< 82`, `82 – 121`, `≥ 148`. Bands are
 * half-open like the cascade that applies them: the minimum belongs to the
 * band, the maximum to the next one.
 */
export function bandRange(min: string | null, max: string | null, unit = ''): string {
  const tail = unit ? ` ${unit}` : '';
  if (min === null && max === null) return 'cualquier valor';
  if (min === null) return `< ${max}${tail}`;
  if (max === null) return `≥ ${min}${tail}`;
  return `${min} – ${max}${tail}`;
}

/** A norma judges the magnitudes of the services it names; none named means any. */
export function magnitudesForNorma<T extends { technique_code: string }>(
  magnitudes: T[],
  techniques: { code: string }[],
): T[] {
  if (techniques.length === 0) return magnitudes;
  const codes = new Set(techniques.map((technique) => technique.code));
  return magnitudes.filter((magnitude) => codes.has(magnitude.technique_code));
}
