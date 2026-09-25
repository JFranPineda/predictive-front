import { describe, expect, it } from 'vitest';

import { formatDateRange } from '@app/i18n/format';
import { reachableStatuses } from '@modules/services/domain/orderStatus';

describe('order status moves (V3-27)', () => {
  it('never offers a way out of cancelled', () => {
    expect(reachableStatuses('cancelled')).toEqual(['cancelled']);
  });

  it('reopens a done order instead of re-planning it', () => {
    expect(reachableStatuses('done')).toEqual(['done', 'in_progress']);
  });
});

describe('service date (V3-25)', () => {
  it('prints one date for a one-day service', () => {
    expect(formatDateRange('2026-09-18', '2026-09-18', 'es-PE')).toBe(
      new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium' }).format(new Date('2026-09-18T12:00:00')),
    );
  });

  it('prints a window as a range, not as two dates and an arrow', () => {
    const text = formatDateRange('2026-09-18', '2026-09-20', 'es-PE');
    expect(text).toMatch(/18.+20/);
    expect(text).not.toContain('→');
  });
});

describe('operating values at their precision (V3-30)', () => {
  it('shows a stored 1785.4000 rpm as 1785', async () => {
    const { atPrecision } = await import('@modules/services/domain/operatingValue');
    expect(atPrecision('1785.4000', 0)).toBe('1785');
    expect(atPrecision('0.8600', 2)).toBe('0.86');
    expect(atPrecision(null, 0)).toBe('');
  });

  it('steps whole numbers by one and the power factor by a hundredth', async () => {
    const { stepFor } = await import('@modules/services/domain/operatingValue');
    expect(stepFor(0)).toBe('1');
    expect(stepFor(2)).toBe('0.01');
  });
});
