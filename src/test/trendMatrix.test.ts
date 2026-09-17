import { describe, expect, it } from 'vitest';

import { deltaPercent, toMatrix, type TrendSeries } from '@modules/measurements/domain/trend';

// Values from `TABLA DE TENDENCIAS.xls`, point 1H of EB 228.
const series: TrendSeries[] = [
  {
    point_label: '1H',
    magnitude_code: 'vel_rms',
    unit: 'mm/s',
    readings: [
      { taken_at: '2013-02-08', value: 0.7, status_code: 'normal', not_measured_reason: null },
      { taken_at: '2013-03-02', value: 1.3, status_code: 'normal', not_measured_reason: null },
      { taken_at: '2013-03-20', value: 0.6, status_code: 'normal', not_measured_reason: null },
    ],
  },
  {
    point_label: '1H',
    magnitude_code: 'env_accel',
    unit: 'gE',
    readings: [
      { taken_at: '2013-02-08', value: 2.4, status_code: 'normal', not_measured_reason: null },
      // 2013-03-02 was not measured on this magnitude.
      { taken_at: '2013-03-20', value: 4.0, status_code: 'alarm', not_measured_reason: null },
    ],
  },
];

describe('trend matrix', () => {
  it('uses the union of every date so rows stay aligned', () => {
    const { dates, rows } = toMatrix(series);
    expect(dates).toEqual(['2013-02-08', '2013-03-02', '2013-03-20']);
    expect(rows[0]!.cells).toHaveLength(3);
  });

  it('leaves a hole where a magnitude was skipped instead of shifting it', () => {
    const { rows } = toMatrix(series);
    expect(rows[1]!.cells[1]).toBeNull();
    expect(rows[1]!.cells[2]?.value).toBe(4.0);
  });
});

describe('delta against the previous round', () => {
  it('catches a jump that is still inside the limits', () => {
    const readings = [
      { taken_at: '2013-02-08', value: 2.4, status_code: 'normal', not_measured_reason: null },
      { taken_at: '2013-03-20', value: 4.8, status_code: 'normal', not_measured_reason: null },
    ];
    expect(deltaPercent(readings)).toBe(100);
  });

  it('returns null when there is nothing to compare', () => {
    expect(deltaPercent(series[0]!.readings.slice(0, 1))).toBeNull();
  });
});
