export interface ReadingPoint {
  taken_at: string;
  value: number | null;
  status_code: string | null;
  not_measured_reason: string | null;
}

export interface TrendSeries {
  point_label: string;
  magnitude_code: string;
  unit: string;
  readings: ReadingPoint[];
}

/**
 * The matrix the customer keeps in `TABLA DE TENDENCIAS.xls`: one row per
 * point-magnitude, one column per date. Dates come from the union of every
 * series, so a point that was skipped on one round leaves a visible hole
 * instead of shifting the row.
 */
export function toMatrix(series: TrendSeries[]): {
  dates: string[];
  rows: { label: string; unit: string; cells: (ReadingPoint | null)[] }[];
} {
  const dates = [...new Set(series.flatMap((s) => s.readings.map((r) => r.taken_at)))].sort();
  const rows = series.map((s) => {
    const byDate = new Map(s.readings.map((r) => [r.taken_at, r]));
    return {
      label: `${s.point_label} ${s.magnitude_code}`,
      unit: s.unit,
      cells: dates.map((date) => byDate.get(date) ?? null),
    };
  });
  return { dates, rows };
}

/** A jump against the previous reading is often the real signal: the absolute
 * value can stay inside limits while doubling in a month. */
export function deltaPercent(readings: ReadingPoint[]): number | null {
  const values = readings.filter((r) => r.value !== null);
  const last = values.at(-1)?.value;
  const previous = values.at(-2)?.value;
  if (last == null || previous == null || previous === 0) return null;
  return ((last - previous) / previous) * 100;
}
