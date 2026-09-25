import type { Spectrum } from './types';

/** The spectrum types an instrument exports; "waterfall" is SKF's cascade plot. */
export const SPECTRUM_TYPES = [
  'velocity',
  'envelope',
  'acceleration',
  'demodulation',
  'waveform',
  'waterfall',
] as const;

const AXIS_ORDER: Record<string, number> = { H: 0, V: 1, A: 2 };

export interface PointSpectra {
  pointId: number;
  label: string;
  equipmentName: string;
  items: Spectrum[];
}

/**
 * A train's spectra grouped by point, in the order the report reads the
 * train: machine by machine, point by point, H before V before A. Within a
 * point the newest comes first.
 */
export function groupByPoint(spectra: Spectrum[]): PointSpectra[] {
  const groups = new Map<number, PointSpectra & { sort: [number, number, number] }>();
  for (const spectrum of spectra) {
    const group = groups.get(spectrum.point_id) ?? {
      pointId: spectrum.point_id,
      label: spectrum.point_label,
      equipmentName: spectrum.equipment_name,
      items: [],
      sort: [spectrum.component_order, spectrum.point_number, AXIS_ORDER[spectrum.point_axis] ?? 9],
    };
    group.items.push(spectrum);
    groups.set(spectrum.point_id, group);
  }
  return [...groups.values()]
    .sort((a, b) => a.sort[0] - b.sort[0] || a.sort[1] - b.sort[1] || a.sort[2] - b.sort[2])
    .map((group) => ({
      pointId: group.pointId,
      label: group.label,
      equipmentName: group.equipmentName,
      items: [...group.items].sort((a, b) => b.taken_at.localeCompare(a.taken_at)),
    }));
}

/** The first line of a finding, for the tile. */
export function firstLine(text: string): string {
  return text.split('\n').find((line) => line.trim())?.trim() ?? '';
}
