import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { formatDate, toDate } from '@app/i18n/format';

describe('calendar days', () => {
  // West of Greenwich is where the bug lived: Lima is UTC−5.
  beforeAll(() => {
    vi.stubEnv('TZ', 'America/Lima');
  });
  afterAll(() => {
    vi.unstubAllEnvs();
  });

  it("prints a round's date as that day, not the one before", () => {
    expect(new Date('2025-08-27').getDate()).toBe(26);
    expect(toDate('2025-08-27').getDate()).toBe(27);
    expect(formatDate('2025-08-27', 'es-PE')).toContain('27');
  });

  it('still reads instants as instants', () => {
    expect(toDate('2025-08-27T14:00:00Z').getUTCHours()).toBe(14);
  });
});
