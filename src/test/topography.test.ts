import { describe, expect, it } from 'vitest';

import { BOXES, signed, suggestedDisplacement } from '@modules/topography/domain/types';

describe('topography sheet (Q11)', () => {
  it('writes a displacement with its direction, as the plan does', () => {
    expect(signed('3')).toBe('+3 mm');
    expect(signed('-1')).toBe('−1 mm');
    expect(signed('0')).toBe('0 mm');
    expect(signed(null)).toBe('—');
  });

  it('suggests transmission minus drive', () => {
    expect(suggestedDisplacement('347', '350')).toBe('3');
    expect(suggestedDisplacement('1547', '1544')).toBe('-3');
    expect(suggestedDisplacement('1962', null)).toBeNull();
  });

  it('has the four boxes of the sheet', () => {
    expect(BOXES).toEqual(['parallel_drive', 'parallel_transmission', 'level_drive', 'level_transmission']);
  });
});
