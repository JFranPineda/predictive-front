export const POINTS = 6;
export const STATES = ['acceptable', 'medium', 'inaccessible', 'critical'] as const;
export type RollerState = (typeof STATES)[number];
export const INDICATION_KINDS = ['crack', 'undercut', 'other'] as const;
export type IndicationKind = (typeof INDICATION_KINDS)[number];

export interface RollerGroup {
  id: number;
  name: string;
  rollers: number;
}

export interface RollerRow {
  equipment_id: number;
  number: number;
  name: string;
  visit_id: number | null;
  is_closed: boolean;
  values: (string | null)[];
  min: string | null;
  inaccessible: boolean;
  state: RollerState | null;
  status: { code: string; label: string; color: string } | null;
  observation: string;
  indications: number;
}

export interface RollerSheet {
  order: { id: number; code: string };
  group_id: number;
  rows: RollerRow[];
  summary: Record<RollerState, number>;
}

export interface RollerDraft {
  values: string[];
  inaccessible: boolean;
  observation: string;
}

export interface Indication {
  id: number;
  equipment_id: number;
  service_visit_id: number | null;
  kind: IndicationKind;
  length_mm: string | null;
  depth_mm: string | null;
  position: string;
  notes: string;
  created_at: string;
  photos: { id: number; url: string; thumb_url: string | null; caption: string }[];
}

/** "1-28, 30" → [1, …, 28, 30]: how a crew writes the rollers of a group. */
export function parseNumbers(text: string): number[] {
  const numbers = new Set<number>();
  for (const part of text.split(',')) {
    const [from, to] = part.split('-').map((piece) => Number(piece.trim()));
    if (!Number.isInteger(from) || from! < 1) continue;
    const last = Number.isInteger(to) && to! >= from! ? to! : from!;
    for (let number = from!; number <= last && number - from! < 500; number += 1) numbers.add(number);
  }
  return [...numbers].sort((a, b) => a - b);
}

/** 9.2300 → "9.23": the column stores four decimals, a thickness has two. */
export function thickness(value: string | null): string {
  if (value === null || value === '') return '';
  const numeric = Number(value);
  return Number.isNaN(numeric) ? value : numeric.toFixed(2);
}

/** A row the crew touched, as the sheet endpoint expects it. */
export function draftFor(row: RollerRow): RollerDraft {
  return {
    values: row.values.map((value) => thickness(value)),
    inaccessible: row.inaccessible,
    observation: row.observation,
  };
}

export function isDirty(row: RollerRow, draft: RollerDraft): boolean {
  const original = draftFor(row);
  return (
    original.inaccessible !== draft.inaccessible ||
    original.observation !== draft.observation ||
    original.values.some((value, index) => value !== (draft.values[index] ?? '').trim())
  );
}
