export const PHASES = ['angular_h', 'parallel_h', 'angular_v', 'parallel_v'] as const;
export type Phase = (typeof PHASES)[number];

export interface AxisValue {
  value: string | null;
  ok: boolean | null;
}

export interface AlignmentPhotoRole {
  id: number;
  kind: 'alignment_before' | 'alignment_after' | 'alignment_group' | 'alignment_observation';
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
  backlash_within_tolerance: boolean | null;
  notes: string;
  created_at: string;
  created_by: string;
  tolerance: { parallel_mm: string; angular_mm_per_100mm: string };
  before: Record<Phase, AxisValue>;
  after: Record<Phase, AxisValue>;
  all_ok: boolean;
  photos: AlignmentPhotoRole[];
}
