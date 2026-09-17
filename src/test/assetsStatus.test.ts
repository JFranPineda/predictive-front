import { describe, expect, it } from 'vitest';

import { displayStatus, overdueDays } from '@modules/assets/domain/status';
import type { Equipment } from '@modules/assets/domain/types';

const base: Equipment = {
  id: 1,
  asset_code: 'eq-1',
  client_tag: 'MB101001A',
  name: 'MOTOR',
  equipment_type: 'motor',
  monitoring_frequency: 'monthly',
  area: { id: 1, code: '101', name: 'ETA' },
  asset_group: { id: 1, name: 'BBA. AGUA CRUDA - TAG:A', kind: 'motor_pump' },
  condition_status: { code: 'normal', name: 'Normal', color: '#16a34a' },
  availability_status: { code: 'running', name: 'En marcha', measurable: true },
  condition_updated_at: '2026-09-01T10:00:00Z',
};

describe('status display', () => {
  it('shows the condition when the equipment could be measured', () => {
    expect(displayStatus(base)).toMatchObject({ label: 'Normal', measured: true });
  });

  it('does not report a stale condition for an equipment that was off', () => {
    // The source RGP marks 62 equipments "APAGADO" while still carrying an old
    // NORMAL. Showing green there is how a KPI starts lying.
    const off = {
      ...base,
      availability_status: { code: 'off', name: 'Apagado', measurable: false },
    };
    expect(displayStatus(off)).toMatchObject({ label: 'Apagado', measured: false });
  });

  it('never invents a status for an equipment with no evaluation', () => {
    // Null, not a Spanish sentence: the wording belongs to the locale files.
    expect(displayStatus({ ...base, condition_status: null })).toMatchObject({
      label: null,
      measured: false,
    });
  });
});

describe('overdue against the monitoring plan', () => {
  it('counts the days past the planned interval', () => {
    const today = new Date('2026-10-16T10:00:00Z'); // 45 days later, plan is 30
    expect(overdueDays(base, today)).toBe(15);
  });

  it('is zero while inside the interval', () => {
    expect(overdueDays(base, new Date('2026-09-20T00:00:00Z'))).toBe(0);
  });

  it('does not apply to on-demand equipment', () => {
    expect(overdueDays({ ...base, monitoring_frequency: 'on_demand' })).toBeNull();
  });
});
