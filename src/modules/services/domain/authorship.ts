import type { AuthoredEntry, EntryType, Participant, ServiceAuthorship } from './types';

/** The order the customer's own reports use. */
export const ENTRY_ORDER: EntryType[] = [
  'background', 'observation', 'failure_mode', 'finding',
  'conclusion', 'recommendation', 'action_taken', 'note',
];

/** "LECTURAS TOMADAS POR: HT / AJ" — the signature the trend sheet carries. */
export function signature(participants: Participant[]): string {
  return participants.map((p) => p.initials || p.full_name).filter(Boolean).join(' / ');
}

export function groupEntries(entries: AuthoredEntry[]): { type: EntryType; entries: AuthoredEntry[] }[] {
  return ENTRY_ORDER.map((type) => ({
    type,
    entries: entries
      .filter((entry) => entry.entry_type === type)
      .sort((a, b) => a.entry_date.localeCompare(b.entry_date)),
  })).filter((group) => group.entries.length > 0);
}

/**
 * Why a visit is read-only. Returns a key and its values, not a sentence:
 * showing a disabled form with no reason is what makes an external inspector
 * call support, and the reason has to be readable in both languages.
 */
export interface LockReason {
  key: 'lock.issued' | 'lock.otherInspector' | 'lock.otherInspectorUnknown' | 'lock.closed' | 'lock.noPermission';
  values?: { who: string };
}

export function lockReason(visit: ServiceAuthorship, currentUserId: number): LockReason | null {
  if (visit.can_edit) return null;
  if (visit.report_issued) return { key: 'lock.issued' };
  if (!visit.participants.some((p) => p.user_id === currentUserId)) {
    const who = signature(visit.participants);
    return who ? { key: 'lock.otherInspector', values: { who } } : { key: 'lock.otherInspectorUnknown' };
  }
  if (visit.is_closed) return { key: 'lock.closed' };
  return { key: 'lock.noPermission' };
}
