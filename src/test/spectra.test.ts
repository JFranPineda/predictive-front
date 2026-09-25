import { describe, expect, it } from 'vitest';

import { firstLine, groupByPoint } from '@modules/measurements/domain/spectra';
import type { Spectrum } from '@modules/measurements/domain/types';

function spectrum(id: number, point: number, number: number, axis: string, order: number, at: string): Spectrum {
  return {
    id, point_id: point, point_label: `${number}${axis}`, point_number: number, point_axis: axis,
    equipment_id: order + 1, equipment_name: order === 0 ? 'MOTOR' : 'BOMBA', component_order: order,
    taken_at: at, spectrum_type: 'velocity', visit_id: null, fmin_hz: null, fmax_hz: null, lines: null,
    rpm_at_capture: null, window: '', unit: 'mm/s', peak_hz: null, peak_amplitude: null,
    has_numeric_data: false, image_url: null, thumb_url: null, caption: '', diagnosis: [],
  };
}

describe('spectra of a train (V3-09)', () => {
  it('lists points in the train order, H before V before A, newest first within a point', () => {
    const groups = groupByPoint([
      spectrum(1, 30, 3, 'H', 1, '2026-09-01'),
      spectrum(2, 11, 1, 'V', 0, '2026-09-01'),
      spectrum(3, 10, 1, 'H', 0, '2026-08-01'),
      spectrum(4, 10, 1, 'H', 0, '2026-09-01'),
    ]);
    expect(groups.map((group) => group.label)).toEqual(['1H', '1V', '3H']);
    expect(groups[0]!.items.map((item) => item.id)).toEqual([4, 3]);
    expect(groups[2]!.equipmentName).toBe('BOMBA');
  });

  it('shows the first written line of a finding', () => {
    expect(firstLine('\n  Desalineamiento paralelo\nSoltura')).toBe('Desalineamiento paralelo');
    expect(firstLine('')).toBe('');
  });
});
