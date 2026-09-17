import type { Scope, ThresholdSet } from './types';

/** Same precedence as the backend resolver. Duplicated on purpose: the UI has
 * to explain *which* set would win before anything is saved. */
const PRECEDENCE: Record<Scope, number> = {
  point: 50,
  equipment: 40,
  asset_group_kind: 30,
  equipment_type: 20,
  global: 10,
};

export function sortByPrecedence(sets: ThresholdSet[]): ThresholdSet[] {
  return [...sets].sort((a, b) => PRECEDENCE[b.scope] - PRECEDENCE[a.scope]);
}

export function effectiveSet(sets: ThresholdSet[], on = new Date()): ThresholdSet | undefined {
  const active = sets.filter((set) => {
    const from = new Date(set.valid_from);
    const to = set.valid_to ? new Date(set.valid_to) : null;
    return from <= on && (!to || to >= on);
  });
  return sortByPrecedence(active)[0];
}

/**
 * The banner shown when an equipment is stricter than the standard it
 * overrides — the EB 228 case: 6.5 mm/s against the ISO 7.1.
 *
 * Returns a translation key and its values, never a sentence: domain code that
 * builds prose is domain code that only speaks one language.
 */
export interface OverrideSummary {
  key: 'override.stricter' | 'override.looser';
  values: { a: number; b: number; unit: string; standard: string | null };
}

export function overrideSummary(
  override: ThresholdSet,
  standard: ThresholdSet | undefined,
): OverrideSummary | null {
  if (!standard) return null;
  const worst = (set: ThresholdSet) =>
    Number(set.bands.at(-1)?.min_value ?? set.bands.at(-1)?.max_value ?? NaN);
  const a = worst(override);
  const b = worst(standard);
  if (Number.isNaN(a) || Number.isNaN(b) || a === b) return null;
  return {
    key: a < b ? 'override.stricter' : 'override.looser',
    values: { a, b, unit: override.unit_code, standard: standard.standard?.name ?? null },
  };
}
