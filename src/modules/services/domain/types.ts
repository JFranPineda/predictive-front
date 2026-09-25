export type ParticipantRole = 'lead_analyst' | 'assistant' | 'supervisor' | 'client_witness';

export type EntryType =
  | 'background' | 'observation' | 'failure_mode' | 'finding'
  | 'conclusion' | 'recommendation' | 'action_taken' | 'note';

export interface Participant {
  user_id: number;
  full_name: string;
  initials: string;
  role: ParticipantRole;
  is_external: boolean;
}

export interface AuthoredEntry {
  id: number;
  entry_type: EntryType;
  entry_date: string;
  text: string;
  author_id: number;
  author_name: string;
}

export interface ServiceAuthorship {
  visit_id: number;
  equipment_id: number;
  equipment_name: string;
  equipment_tag: string;
  group_name: string;
  area_label: string;
  technique_code: string;
  technique_name: string;
  visited_at: string;
  participants: Participant[];
  entries: AuthoredEntry[];
  reading_count: number;
  media_count: number;
  is_closed: boolean;
  report_issued: boolean;
  /** Server-computed: whether the current user may still edit this visit. */
  can_edit: boolean;
}

export type OrderStatus = 'planned' | 'in_progress' | 'done' | 'cancelled';

export interface NamedRef {
  id: number;
  name: string;
}

export interface ServiceOrder {
  id: number;
  code: string;
  client_work_order: string;
  technique_code: string;
  technique_name: string;
  plant: string;
  plant_id: number;
  scheduled_from: string;
  scheduled_to: string;
  status: OrderStatus;
  /** The company that executes the service (1A-MIG, a contractor). */
  provider: NamedRef | null;
  lead_analyst: NamedRef | null;
  supervisor: string | null;
  /** Equipment visited in this order. */
  visit_count: number;
}

export interface ServiceOrderPage {
  results: ServiceOrder[];
  count: number;
  next: string | null;
  previous: string | null;
  /** Over the whole filtered ledger, never just the page on screen. */
  totals: { orders: number; visits: number };
  can_change_status: boolean;
}

export interface ServiceOrderQuery {
  q?: string;
  technique?: string;
  status?: string;
  from?: string;
  to?: string;
  page?: number;
}

export interface ServiceProvider {
  id: number;
  name: string;
  tax_id: string;
  is_active: boolean;
  order_count: number;
}

export interface VisitReadingValue {
  reading_id: number;
  magnitude_code: string;
  magnitude_name: string;
  value: string | null;
  unit: string;
  decimals: number;
  aggregation: string;
  status: { code: string; name: string; color: string; kind: string } | null;
  /** False when no standard judged the value (acceleration has none). */
  graded: boolean;
  quality: string;
  not_measured_reason: string | null;
}

export interface VisitPoint {
  point_id: number;
  label: string;
  number: number;
  axis: string;
  side: string;
  values: VisitReadingValue[];
}

export interface VisitDetail {
  visit_id: number;
  equipment: {
    id: number;
    name: string;
    tag: string;
    type: string;
    asset_group: string;
    area_label: string;
    sector: string;
  };
  service_order: { code: string; client_work_order: string };
  technique_code: string;
  technique_name: string;
  visited_at: string;
  instrument: string | null;
  availability_status: { code: string; name: string; color: string } | null;
  participants: Participant[];
  points: VisitPoint[];
  entries: (AuthoredEntry & { status: string | null; from_this_visit: boolean })[];
  /** What this service found, from its technique's catalogue. */
  fault_modes: { code: string; name: string; reference: string }[];
  /** A problem outside the catalogue, described; null when "Otros" is not marked. */
  other_fault: string | null;
  is_closed: boolean;
  report_issued: boolean;
  can_edit: boolean;
}
