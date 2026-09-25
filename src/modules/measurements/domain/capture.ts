/**
 * What a round reads on each point (V3-11).
 *
 * Opening a visit seeds one row per point and magnitude the round reads —
 * acceleration only where the kind's template asks for it — so the seeded
 * rows are the plan: a cell is offered only where one exists, and a column
 * only if some point reads it.
 */
export interface PlannedPoint {
  point_id: number;
  values: { magnitude_code: string }[];
}

export function readsOn(point: PlannedPoint, magnitudeCode: string): boolean {
  return point.values.some((value) => value.magnitude_code === magnitudeCode);
}

export function plannedColumns<T extends { code: string }>(magnitudes: T[], points: PlannedPoint[]): T[] {
  return magnitudes.filter((magnitude) => points.some((point) => readsOn(point, magnitude.code)));
}
