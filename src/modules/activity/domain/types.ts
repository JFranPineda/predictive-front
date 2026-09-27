export type ActivityKind =
  | 'login'
  | 'login_failed'
  | 'logout'
  | 'navigation'
  | 'click'
  | 'create'
  | 'update'
  | 'delete'
  | 'upload'
  | 'action'
  | 'denied';

export interface ActivityEvent {
  id: number;
  at: string;
  user: { id: number | null; name: string } | null;
  initials: string;
  kind: ActivityKind;
  event: string;
  description: string;
  path: string;
  method: string;
  status_code: number | null;
  ip: string | null;
}

export interface ActivityPage {
  items: ActivityEvent[];
  total: number;
  /** Rows per kind under the other filters: the numbers on the chips. */
  counts: Partial<Record<ActivityKind, number>>;
  next_before: number | null;
}

export interface ActivityFilters {
  user?: number;
  kind?: string;
  q?: string;
  since?: string;
  until?: string;
  before?: number;
}

export interface ActivityActors {
  users: { id: number; name: string }[];
  kinds: { code: ActivityKind; label: string }[];
}

/** What the browser reports: the server writes the row and its wording. */
export interface ClientEvent {
  kind: 'click' | 'navigation';
  label: string;
  path: string;
}
