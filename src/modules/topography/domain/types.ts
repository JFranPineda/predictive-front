/** The four boxes of a roller's sheet (Q11): parallelism and level, each on
 * the drive side (the reference) and on the transmission side. */
export const BOXES = ['parallel_drive', 'parallel_transmission', 'level_drive', 'level_transmission'] as const;
export type Box = (typeof BOXES)[number];

export const MEASURES = [
  'parallel_drive_mm',
  'parallel_transmission_mm',
  'horizontal_displacement_mm',
  'level_drive_mm',
  'level_transmission_mm',
  'vertical_displacement_mm',
] as const;
export type Measure = (typeof MEASURES)[number];

export interface Image {
  id: number;
  url: string;
  thumb_url: string | null;
}

export type TopographyElement = {
  id: number;
  service_visit_id: number;
  element_label: string;
  reference_label: string;
  photos: Record<Box, Image | null>;
  observation: string;
} & Record<Measure, string | null>;

export interface TopographyHistoryEntry extends TopographyElement {
  visited_at: string;
}

export interface TopographySurvey {
  id: number | null;
  service_visit_id: number;
  title: string;
  survey_date: string | null;
  reference_label: string;
  plan_number: string;
  instrument: string;
  notes: string;
  plan_notes: string;
  schema_image: Image | null;
  plan_image: Image | null;
}

export type SurveyText = Pick<
  TopographySurvey,
  'title' | 'survey_date' | 'reference_label' | 'plan_number' | 'instrument' | 'notes' | 'plan_notes'
>;

/** "+3 mm", "−1 mm", "0 mm": a displacement always says its direction. */
export function signed(value: string | null): string {
  if (value === null || value === '') return '—';
  const number = Number(value);
  if (Number.isNaN(number)) return value;
  if (number > 0) return `+${value} mm`;
  if (number < 0) return `−${value.replace('-', '')} mm`;
  return '0 mm';
}

/** Transmission minus drive: the displacement the two readings suggest. */
export function suggestedDisplacement(drive: string | null, transmission: string | null): string | null {
  if (!drive || !transmission) return null;
  const difference = Number(transmission) - Number(drive);
  if (Number.isNaN(difference)) return null;
  return String(Math.round(difference * 100) / 100);
}
