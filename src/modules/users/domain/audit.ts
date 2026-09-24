/**
 * The audit trail, as the maintenance manager reads it: who changed what, and
 * when. Rows are never editable — a log you can edit is a record of what
 * somebody wanted on file.
 */
export interface AuditEntry {
  id: number;
  at: string;
  action: string;
  object_type: string;
  object_id: string;
  actor: string | null;
  actor_initials: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  ip: string | null;
}

export interface AuditPage {
  items: AuditEntry[];
  next_before: number | null;
}

/** Families the filter offers; each matches every action that starts with it. */
export const AUDIT_FAMILIES = ['reading', 'user', 'role', 'auth'] as const;

/** A change as one line a manager can scan: "valor 4.8 → 9.5".
 *
 * Keys and values arrive as the API stores them; `label` and `value` turn them
 * into the plant's words, so nobody reads "worst: shutdown" on an audit. */
export function describeChange(
  entry: AuditEntry,
  label: (key: string) => string = (key) => key,
  value: (raw: string) => string = (raw) => raw,
): string {
  const before = entry.before ?? {};
  const after = entry.after ?? {};
  const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])];
  const show = (raw: unknown) => format(raw, value);
  return keys
    .map((key) => {
      const was = before[key];
      const now = after[key];
      if (was === undefined) return `${label(key)}: ${show(now)}`;
      if (now === undefined) return `${label(key)}: ${show(was)}`;
      return `${label(key)}: ${show(was)} → ${show(now)}`;
    })
    .join(' · ');
}

function format(raw: unknown, value: (raw: string) => string): string {
  if (raw === null || raw === undefined || raw === '') return '—';
  if (Array.isArray(raw)) return raw.length ? raw.map((item) => format(item, value)).join(', ') : '—';
  if (typeof raw === 'string') return value(raw);
  if (typeof raw === 'number' || typeof raw === 'boolean') return String(raw);
  return JSON.stringify(raw);
}
