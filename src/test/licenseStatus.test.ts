import { describe, expect, it } from 'vitest';

import { STATUS_TONE } from '@modules/licensing/domain/presentation';
import { LICENSE_STATUSES } from '@modules/licensing/domain/status';
import en from '@modules/licensing/locales/en.json';
import es from '@modules/licensing/locales/es.json';

describe('licence statuses', () => {
  it('covers the installation and clock statuses the API answers since v4 Phase 2', () => {
    expect(LICENSE_STATUSES).toEqual(expect.arrayContaining(['other_installation', 'clock_behind']));
  });

  it('gives every status a label in both languages and a colour', () => {
    // A status without them shows its raw key on the licence screen.
    for (const status of LICENSE_STATUSES) {
      expect(es.status[status], `es: ${status}`).toBeTruthy();
      expect(en.status[status], `en: ${status}`).toBeTruthy();
      expect(STATUS_TONE[status], `tone: ${status}`).toBeTruthy();
    }
  });
});
