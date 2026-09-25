import { describe, expect, it } from 'vitest';

import {
  addPoint,
  componentDrifts,
  layoutFor,
  rebuildComponent,
} from '@modules/assets/domain/templateLayout';
import { describeMagnitudes } from '@modules/assets/domain/magnitudeGroups';
import type { KindComponent } from '@modules/assets/domain/types';

const MOTOR: KindComponent = { label: 'MOTOR', equipment_type: 'motor', position: 'driver', point_count: 2 };
const PUMP: KindComponent = { label: 'BOMBA', equipment_type: 'pump', position: 'driven', point_count: 2 };

const points = (rows: { number: number; axis: string }[]) => rows.map((r) => `${r.number}${r.axis}`);

describe('template layout (V3-03)', () => {
  it('numbers the train in one run, three axes per point', () => {
    const rows = layoutFor([MOTOR, PUMP]);
    expect(points(rows)).toEqual(['1H', '1V', '1A', '2H', '2V', '2A', '3H', '3V', '3A', '4H', '4V', '4A']);
    expect(rows[0]!.magnitudes).toEqual(['vel_rms', 'env_accel', 'temp']);
    expect(rows[6]!.side).toBe('coupling_end');
  });

  it('adds a whole point with the next free number', () => {
    const rows = addPoint(layoutFor([MOTOR, PUMP]), [MOTOR, PUMP]);
    expect(points(rows.slice(-3))).toEqual(['5H', '5V', '5A']);
    expect(rows.at(-1)!.component_label).toBe('BOMBA');
  });

  it('adds point 1 to an empty template', () => {
    expect(points(addPoint([], [MOTOR]))).toEqual(['1H', '1V', '1A']);
  });

  it('reports a component whose template drifted from its declared count', () => {
    const grown = { ...PUMP, point_count: 4 };
    expect(componentDrifts(layoutFor([MOTOR, PUMP]), [MOTOR, grown])).toEqual([
      { label: 'BOMBA', declared: 4, actual: 2 },
    ]);
  });

  it('rebuilds one component and keeps the edits of the others, renumbered', () => {
    const edited = layoutFor([MOTOR, PUMP]).map((row) =>
      row.component_label === 'BOMBA' ? { ...row, side: 'custom' } : row,
    );
    const bigMotor = { ...MOTOR, point_count: 3 };
    const rows = rebuildComponent(edited, [bigMotor, PUMP], 'MOTOR');
    expect(points(rows.filter((r) => r.component_label === 'MOTOR'))).toEqual([
      '1H', '1V', '1A', '2H', '2V', '2A', '3H', '3V', '3A',
    ]);
    const pump = rows.filter((r) => r.component_label === 'BOMBA');
    expect(points(pump)).toEqual(['4H', '4V', '4A', '5H', '5V', '5A']);
    expect(pump.every((r) => r.side === 'custom')).toBe(true);
    expect(componentDrifts(rows, [bigMotor, PUMP])).toEqual([]);
  });
});

describe('magnitudes described to a person (V3-13)', () => {
  const catalogue = [
    { code: 'vel_rms', name: 'Velocidad', technique_code: 'vibration', technique_name: 'Vibraciones' },
    { code: 'env_accel', name: 'Envolvente', technique_code: 'vibration', technique_name: 'Vibraciones' },
    { code: 'temp', name: 'Temperatura', technique_code: 'thermography', technique_name: 'Termografía' },
  ];

  it('groups names by service and never shows an internal code it knows', () => {
    expect(describeMagnitudes(['vel_rms', 'temp', 'env_accel'], catalogue)).toBe(
      'Vibraciones: Velocidad, Envolvente · Termografía: Temperatura',
    );
  });

  it('keeps an unknown code visible instead of dropping it', () => {
    expect(describeMagnitudes(['vel_rms', 'mystery'], catalogue)).toBe('Vibraciones: Velocidad · mystery');
  });
});
