import { describe, expect, it } from 'vitest';

import { groupEntries, lockReason, signature } from '@modules/services/domain/authorship';
import type { AuthoredEntry, Participant, ServiceAuthorship } from '@modules/services/domain/types';

const HENRY: Participant = {
  user_id: 7, full_name: 'Henry Tejada', initials: 'HT', role: 'lead_analyst', is_external: true,
};
const CARLOS: Participant = {
  user_id: 1, full_name: 'Carlos Balta', initials: 'CT', role: 'supervisor', is_external: false,
};

const entries: AuthoredEntry[] = [
  { id: 1, entry_type: 'recommendation', entry_date: '2013-12-17', text: 'Nivelar SKID', author_id: 1, author_name: 'Carlos Balta' },
  { id: 2, entry_type: 'background', entry_date: '2013-11-16', text: 'Electrobomba nueva', author_id: 7, author_name: 'Henry Tejada' },
  { id: 3, entry_type: 'conclusion', entry_date: '2013-12-17', text: 'Desalineamiento', author_id: 7, author_name: 'Henry Tejada' },
];

const visit = (over: Partial<ServiceAuthorship> = {}): ServiceAuthorship => ({
  visit_id: 1,
  equipment_id: 228,
  equipment_name: 'EB 228 MOTOR',
  equipment_tag: 'MB1141001B',
  area_label: '114 - BATERÍA',
  technique_code: 'vibration',
  technique_name: 'Vibraciones',
  visited_at: '2013-12-17T09:30:00Z',
  participants: [HENRY, CARLOS],
  entries,
  reading_count: 20,
  media_count: 6,
  is_closed: false,
  report_issued: false,
  can_edit: true,
  ...over,
});

describe('who performed the service', () => {
  it('signs the round the way the trend sheet does', () => {
    expect(signature([HENRY, CARLOS])).toBe('HT / CT');
  });

  it('falls back to the name when there are no initials', () => {
    expect(signature([{ ...HENRY, initials: '' }])).toBe('Henry Tejada');
  });
});

describe('notes, conclusions and recommendations', () => {
  it('groups entries in the order the customer reports use', () => {
    expect(groupEntries(entries).map((g) => g.type)).toEqual([
      'background', 'conclusion', 'recommendation',
    ]);
  });

  it('drops empty sections instead of printing empty headings', () => {
    expect(groupEntries([]).length).toBe(0);
  });

  it('keeps each line attributed to its own author', () => {
    const [, conclusions] = groupEntries(entries);
    expect(conclusions!.entries[0]!.author_name).toBe('Henry Tejada');
  });
});

describe('why a visit is read-only', () => {
  it('says nothing when the inspector may edit', () => {
    expect(lockReason(visit(), 7)).toBeNull();
  });

  it('names who performed a service that belongs to somebody else', () => {
    const other = visit({ can_edit: false, participants: [CARLOS] });
    expect(lockReason(other, 7)).toEqual({ key: 'lock.otherInspector', values: { who: 'CT' } });
  });

  it('falls back when nobody is recorded as the performer', () => {
    const orphan = visit({ can_edit: false, participants: [] });
    expect(lockReason(orphan, 7)?.key).toBe('lock.otherInspectorUnknown');
  });

  it('explains a closed visit', () => {
    expect(lockReason(visit({ can_edit: false, is_closed: true }), 7)?.key).toBe('lock.closed');
  });

  it('an issued report outranks every other reason', () => {
    const issued = visit({ can_edit: false, report_issued: true, is_closed: true });
    expect(lockReason(issued, 7)?.key).toBe('lock.issued');
  });
});
