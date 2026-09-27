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

export type JobStatus = 'pending_start' | 'in_progress' | 'closed';
export type StartRole = 'production_engineer' | 'service_leader' | 'plant_supervisor';
export type RiskCategory = 'high' | 'medium' | 'low';
export type IpercLevel = 'A' | 'M' | 'B';

/** A service of the day (Q17): one job on one train, with its ATS. */
export interface ServiceJobSummary {
  id: number;
  workday_id: number;
  asset_group: { id: number; name: string };
  service_order: { id: number; code: string; technique: string } | null;
  activity: string;
  status: JobStatus;
  start_signed: StartRole[];
  unlocked: boolean;
  started_at: string | null;
  /** The service's final hour: when its close was signed (Q19). */
  closed_at: string | null;
  closed_by: string;
}

export interface JobSignature {
  id: number | null;
  role: StartRole | 'crew';
  label: string;
  name: string;
  position: string;
  signed_at: string | null;
  image_url: string | null;
}

/** One row of the ATS table: a step, one of its hazards, the IPERC and the controls. */
export interface AtsStep {
  item?: number;
  step: string;
  hazard: string;
  risk: string;
  level: IpercLevel | '';
  score: number | null;
  controls: string;
}

export interface ServiceJob extends ServiceJobSummary {
  workday: { date: string; is_open: boolean };
  holder: string;
  unit: string;
  area: string;
  zone: string;
  risk_category: RiskCategory | '';
  ppe: string;
  tools: string;
  steps: AtsStep[];
  start_signatures: JobSignature[];
  crew: JobSignature[];
  unlock: { by: string; at: string; reason: string } | null;
  /** What still keeps the ATS from being complete and signed. */
  missing: string[];
  can_close: boolean;
}

export type AtsDraft = Pick<ServiceJob, 'activity' | 'holder' | 'unit' | 'area' | 'zone' | 'risk_category' | 'ppe' | 'tools'> & {
  steps: AtsStep[];
};

export function draftOf(job: ServiceJob): AtsDraft {
  return {
    activity: job.activity,
    holder: job.holder,
    unit: job.unit,
    area: job.area,
    zone: job.zone,
    risk_category: job.risk_category,
    ppe: job.ppe,
    tools: job.tools,
    steps: job.steps.map((row) => ({
      step: row.step,
      hazard: row.hazard,
      risk: row.risk,
      level: row.level,
      score: row.score,
      controls: row.controls,
    })),
  };
}

/** A new hazard row under a step: the step text carries over, the rest is blank. */
export function blankStep(step = ''): AtsStep {
  return { step, hazard: '', risk: '', level: '', score: null, controls: '' };
}

/**
 * The ATS prints a step once however many hazards it lists: rows repeating
 * the step above share its number, and only the first shows it.
 */
export function itemNumbers(steps: AtsStep[]): number[] {
  const numbers: number[] = [];
  steps.forEach((row, index) => {
    const same = index > 0 && row.step.trim().toLowerCase() === steps[index - 1]!.step.trim().toLowerCase();
    numbers.push(same ? numbers[index - 1]! : (numbers[index - 1] ?? 0) + 1);
  });
  return numbers;
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
  /** Null when the user may not see the day's services and their ATS. */
  jobs: ServiceJobSummary[] | null;
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
