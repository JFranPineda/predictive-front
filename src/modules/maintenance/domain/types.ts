export const WORK_TYPES = ['bearing_change', 'alignment', 'balancing', 'other'] as const;
export type WorkType = (typeof WORK_TYPES)[number];

export interface Responsible {
  user_id: number | null;
  name: string;
}

export interface WorkRecord {
  id: number;
  asset_group: { id: number; name: string };
  equipment: { id: number; name: string } | null;
  work_types: WorkType[];
  other_description: string;
  started_at: string | null;
  ended_at: string | null;
  duration_minutes: number | null;
  shift_date: string;
  description: string;
  spare_parts_used: string;
  client_work_order: string;
  is_closed: boolean;
  created_by: string;
  recommendation_id: number | null;
  alignment_record_id: number | null;
  responsibles: Responsible[];
}

export interface WorkRecordMarker {
  date: string;
  label: string;
}
