import { describe, expect, it } from 'vitest';

import { deltaPercent, toMatrix, type TrendSeries } from '@modules/measurements/domain/trend';
import {
  groupByVisit,
  spansOf,
  trimValue,
  type MatrixCell,
  type MatrixRow,
} from '@modules/measurements/domain/matrix';

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

describe('record-of-values grid', () => {
  const row = (componentId: number, side: string, label: string): MatrixRow => ({
    point_id: Number(label.replace(/\D/g, '')) * 10 + label.charCodeAt(1),
    label,
    number: Number(label[0]),
    axis: label[1]!,
    side,
    component: componentId === 1 ? 'MOTOR' : 'BOMBA',
    component_id: componentId,
    cells: [],
  });

  const rows = [
    row(1, 'free_end', '1H'),
    row(1, 'free_end', '1V'),
    row(1, 'coupling_end', '2H'),
    row(2, 'coupling_end', '3H'),
  ];

  it('merges the component and side columns the way the sheet prints them', () => {
    const spans = spansOf(rows);
    expect(spans[0]).toEqual({ component: 3, side: 2 });
    expect(spans[1]).toEqual({ component: 0, side: 0 });
    expect(spans[2]).toEqual({ component: 0, side: 1 });
    expect(spans[3]).toEqual({ component: 1, side: 1 });
  });

  it('groups edits by the visit that owns them', () => {
    // Each visit carries its own ownership rule, so edits cannot be saved in
    // one blind batch across rounds.
    const cell = (id: number, visit: number): MatrixCell => ({
      reading_id: id,
      value: null,
      status_code: null,
      status_color: null,
      quality: 'ok',
      visit_id: visit,
    });
    const grouped = groupByVisit([
      { cell: cell(1, 10), value: '4.5' },
      { cell: cell(2, 10), value: '' },
      { cell: cell(3, 11), value: '2.2' },
    ]);
    expect([...grouped.keys()].sort()).toEqual([10, 11]);
    expect(grouped.get(10)).toEqual([
      { reading_id: 1, value: '4.5' },
      // An emptied cell means "not measured", not zero.
      { reading_id: 2, value: null },
    ]);
  });

  it('drops edits on a cell with no visit behind it', () => {
    const orphan: MatrixCell = {
      reading_id: 9, value: null, status_code: null, status_color: null,
      quality: 'ok', visit_id: null,
    };
    expect(groupByVisit([{ cell: orphan, value: '1' }]).size).toBe(0);
  });

  it('shows the precision of the magnitude, not of the column', () => {
    expect(trimValue('0.8700', 2)).toBe('0.87');
    expect(trimValue('45.0000', 0)).toBe('45');
    expect(trimValue(null, 2)).toBe('');
  });
});
