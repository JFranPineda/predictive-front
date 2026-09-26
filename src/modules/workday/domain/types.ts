export interface Workday {
  id: number;
  plant: { id: number; name: string };
  date: string;
  is_open: boolean;
  opened_at: string;
  opened_by: string;
  closed_at: string | null;
  closed_by: string;
  notes: string;
}

/** One line of the day's works: a service visit or a correctivo (F3-02). */
export interface DayWork {
  kind: 'visit' | 'maintenance';
  id: number;
  service: string;
  order: string;
  group: string;
  equipment: string;
  people: string[];
  started_at: string | null;
  ended_at: string | null;
}

/** An ATS: the safety permit, valid once its signed copy is attached. */
export interface SafetyPermit {
  id: number;
  number: string;
  asset_group: { id: number; name: string };
  document_url: string | null;
  valid: boolean;
  created_by: string;
  created_at: string;
}

export interface FieldObservation {
  id: number;
  asset_group: { id: number; name: string };
  visible: boolean;
  text: string;
  photo_url: string | null;
  photo_thumb: string | null;
  created_by: string;
  created_at: string;
}

export interface WorkdayDetail extends Workday {
  works: DayWork[];
  /** Null when the user may not see the permits. */
  permits: SafetyPermit[] | null;
  observations: FieldObservation[];
}

/** Today in the browser's calendar, as the API writes dates. */
export function todayIso(now: Date = new Date()): string {
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

export function minutesBetween(start: string | null, end: string | null): number | null {
  if (!start || !end) return null;
  return Math.round((Date.parse(end) - Date.parse(start)) / 60000);
}

/**
 * The message a refused write carries. The day's guard answers
 * `{detail, type}` (423, 428); DRF validation answers a list.
 */
export function apiError(cause: unknown): string | null {
  const data = (cause as { data?: unknown })?.data;
  if (typeof data === 'string') return data;
  if (Array.isArray(data)) return data.length ? String(data[0]) : null;
  if (data && typeof data === 'object') {
    const detail = (data as { detail?: unknown }).detail;
    if (typeof detail === 'string') return detail;
    const first = Object.values(data as Record<string, unknown>)[0];
    if (Array.isArray(first)) return String(first[0]);
    if (typeof first === 'string') return first;
  }
  return null;
}
