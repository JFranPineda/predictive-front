export const PHASES = ['angular_h', 'parallel_h', 'angular_v', 'parallel_v'] as const;
export type Phase = (typeof PHASES)[number];

/** A state a norma names for a range of values (Q10). */
export interface StateRef {
  code: string;
  name: string;
  color: string;
}

export interface AxisValue {
  value: string | null;
  ok: boolean | null;
  status: StateRef | null;
}

export type PhaseValues = Record<Phase, AxisValue> & { state: StateRef | null };

export type Aligner = 'skf' | 'other';

export type PhotoKind =
  | 'alignment_result'
  | 'alignment_before'
  | 'alignment_after'
  | 'alignment_group'
  | 'alignment_observation';

export interface AlignmentPhotoRole {
  id: number;
  kind: PhotoKind;
  caption: string;
  url: string;
  thumb_url: string | null;
}

export interface AlignmentRecord {
  id: number;
  asset_group: { id: number; name: string };
  service_visit_id: number | null;
  driver_label: string;
  driven_label: string;
  rpm: string;
  instrument: string;
  /** SKF prints before and after on one screen; other aligners, one per phase. */
  aligner: Aligner;
  photo_limits: Partial<Record<PhotoKind, number>>;
  backlash_within_tolerance: boolean | null;
  notes: string;
  created_at: string;
  created_by: string;
  tolerance: { parallel_mm: string; angular_mm_per_100mm: string };
  /** The norma whose RPM scale the tolerance came from (Q10). */
  standard: { id: number; name: string } | null;
  /** The tier's states as frozen with the record. */
  scale: { status: StateRef | null; parallel_mm: string | null; angular_mm_per_100mm: string | null }[];
  before: PhaseValues;
  after: PhaseValues;
  /** The equipment's state as found and as left. */
  found_state: StateRef | null;
  state: StateRef | null;
  all_ok: boolean;
  photos: AlignmentPhotoRole[];
}

/** One band of a tier: up to these limits, this state. */
export interface ScaleBand {
  status_code: string | null;
  status_name?: string;
  color?: string;
  parallel_mm: string;
  angular_mm_per_100mm: string;
}

/** One RPM tier of an alignment norma's scale (Q10): its bands, and the state above them all. */
export interface RpmTier {
  rpm_ceiling: number | null;
  bands: ScaleBand[];
  beyond: { status_code: string | null; status_name?: string; color?: string } | null;
}

export interface StatusOption {
  code: string;
  name: string;
  color: string;
  severity: number;
}

export interface AlignmentScale {
  tiers: RpmTier[];
  status_options: StatusOption[];
}

/** What the server takes: each band's state by code, and the open state's code. */
export interface RpmTierInput {
  rpm_ceiling: number | null;
  bands: { status_code: string | null; parallel_mm: string; angular_mm_per_100mm: string }[];
  beyond_status_code: string | null;
}
