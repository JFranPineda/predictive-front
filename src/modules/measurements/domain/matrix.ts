/**
 * The record of values, in the shape `TABLA DE TENDENCIAS.xls` uses.
 *
 * One block per magnitude, rows grouped by component and by side of the
 * machine, one column per round. An analyst reads a row left to right for the
 * trend and a column top to bottom for the round; a flat list serves neither.
 */
export interface MatrixCell {
  reading_id: number;
  value: string | null;
  status_code: string | null;
  status_color: string | null;
  quality: string;
  visit_id: number | null;
}

export interface MatrixRow {
  point_id: number;
  label: string;
  number: number;
  axis: string;
  side: string;
  component: string;
  component_id: number;
  cells: (MatrixCell | null)[];
}

export interface MatrixBlock {
  key: string;
  magnitude_code: string;
  title: string;
  unit: string;
  aggregation: string;
  decimals: number;
  rows: MatrixRow[];
}

export interface MatrixColumn {
  key: string;
  taken_at: string;
  date: string;
  visit_id: number | null;
  order_code: string;
  technique: string;
  is_closed: boolean;
  can_edit: boolean;
}

export interface EquipmentMatrix {
  equipment: { id: number; name: string; tag: string; group: string; area: string };
  scope: string;
  columns: MatrixColumn[];
  blocks: MatrixBlock[];
}

export interface RowSpan {
  component: number;
  side: number;
}

/**
 * How many rows each component and each side covers, so the first column can
 * be merged the way the printed sheet merges it. Computed once per block
 * instead of asked per cell.
 */
export function spansOf(rows: MatrixRow[]): RowSpan[] {
  const componentRuns = runLengths(rows.map((row) => String(row.component_id)));
  const sideRuns = runLengths(rows.map((row) => `${row.component_id}|${row.side}`));
  return rows.map((_, index) => ({
    component: componentRuns[index] ?? 0,
    side: sideRuns[index] ?? 0,
  }));
}

/** First row of a run gets the full length; the rest get 0 and are skipped. */
function runLengths(keys: string[]): number[] {
  const spans = new Array<number>(keys.length).fill(0);
  let start = 0;
  for (let index = 1; index <= keys.length; index += 1) {
    if (index === keys.length || keys[index] !== keys[start]) {
      spans[start] = index - start;
      start = index;
    }
  }
  return spans;
}

/** Edits grouped by the visit that owns them: the visit is what carries the
 * ownership rule, so each group is saved through its own endpoint. */
export function groupByVisit(
  edits: { cell: MatrixCell; value: string }[],
): Map<number, { reading_id: number; value: string | null }[]> {
  const grouped = new Map<number, { reading_id: number; value: string | null }[]>();
  for (const { cell, value } of edits) {
    if (cell.visit_id === null) continue;
    const bucket = grouped.get(cell.visit_id) ?? [];
    bucket.push({ reading_id: cell.reading_id, value: value === '' ? null : value });
    grouped.set(cell.visit_id, bucket);
  }
  return grouped;
}

/** `0.8700` for a two-decimal magnitude is the column's precision, not the
 * measurement's. */
export function trimValue(value: string | null, decimals: number): string {
  if (value === null || value === '') return '';
  const numeric = Number(value);
  return Number.isNaN(numeric) ? value : String(Number(numeric.toFixed(decimals)));
}
