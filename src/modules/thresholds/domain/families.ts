import type { TechniqueFamily } from './types';

/** The families a service can be ordered in, in the order they are shown. */
export const OFFERED_FAMILIES: TechniqueFamily[] = ['mpd', 'ndt'];

/**
 * Services grouped as the customer sells them (V3-19): MPd Predictivo, then
 * END. Internal ones (maintenance, lubrication) are not services to pick.
 */
export function byFamily<T extends { family: TechniqueFamily }>(rows: T[]): [TechniqueFamily, T[]][] {
  return OFFERED_FAMILIES.map((family) => [family, rows.filter((row) => row.family === family)] as [
    TechniqueFamily,
    T[],
  ]).filter(([, members]) => members.length > 0);
}
