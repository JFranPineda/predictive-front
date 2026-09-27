import { describe, expect, it } from 'vitest';

import { clampWindow, earliestStart, WINDOW_DAYS } from '@shared/history/window';

describe('the fortnight a log screen shows', () => {
  it('keeps a range that already fits', () => {
    const window = { since: '2026-07-01', until: '2026-07-14' };
    expect(clampWindow(window, 'until')).toEqual(window);
  });

  it('pulls the start along when the end moves too far', () => {
    expect(clampWindow({ since: '2026-07-01', until: '2026-08-20' }, 'until')).toEqual({
      since: '2026-08-07',
      until: '2026-08-20',
    });
  });

  it('pushes the end along when the start moves back', () => {
    expect(clampWindow({ since: '2026-06-01', until: '2026-07-14' }, 'since')).toEqual({
      since: '2026-06-01',
      until: '2026-06-14',
    });
  });

  it('fills the start an end date implies', () => {
    expect(clampWindow({ since: '', until: '2026-07-14' }, 'until')).toEqual({
      since: '2026-07-01',
      until: '2026-07-14',
    });
  });

  it('leaves a start with no end alone', () => {
    expect(clampWindow({ since: '2026-07-01', until: '' }, 'since')).toEqual({
      since: '2026-07-01',
      until: '',
    });
  });

  it('offers the earliest start the window allows', () => {
    expect(earliestStart('2026-07-14')).toBe('2026-07-01');
    expect(WINDOW_DAYS).toBe(14);
  });
});
