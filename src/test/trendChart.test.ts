import { describe, expect, it } from 'vitest';

import type { MatrixBlock, MatrixRow } from '@modules/measurements/domain/matrix';
import {
  buildSeries,
  defaultSelection,
  MAX_SERIES,
  pointOptions,
  togglePoint,
  toggleSeries,
} from '@modules/measurements/domain/trendChart';

/** A motor-pump train as the record of values returns it: four points, three
 *  axes each — the shape of report `MPd-AV-N°006-13`. */
function block(points: { number: number; component: string }[] = FOUR_POINTS): MatrixBlock {
  const rows: MatrixRow[] = points.flatMap(({ number, component }, index) =>
    ['H', 'V', 'A'].map((axis, axisIndex) => ({
      point_id: index * 3 + axisIndex + 1,
      label: `${number}${axis}`,
      number,
      axis,
      side: 'free_end',
      component,
      component_id: component === 'MOTOR' ? 1 : 2,
      cells: [
        { reading_id: 1, value: '2.10', status_code: 'operational', status_color: '#16a34a', quality: 'ok', visit_id: 1 },
        { reading_id: 2, value: '4.80', status_code: 'alarm', status_color: '#f59e0b', quality: 'ok', visit_id: 2 },
        null,
      ],
    })),
  );
  return {
    key: 'vel_rms:rms',
    magnitude_code: 'vel_rms',
    title: 'Velocidad vibracional',
    unit: 'mm/s',
    aggregation: 'rms',
    decimals: 2,
    rows,
  };
}

const FOUR_POINTS = [
  { number: 1, component: 'MOTOR' },
  { number: 2, component: 'MOTOR' },
  { number: 3, component: 'BOMBA' },
  { number: 4, component: 'BOMBA' },
];

describe('trend chart series', () => {
  it('opens on the first point horizontal, not on everything', () => {
    const series = buildSeries(block(), 'dark');

    const selected = defaultSelection(series);

    expect(selected).toHaveLength(1);
    expect(series.find((row) => row.id === selected[0])?.label).toBe('1H');
  });

  it('gives every axis of one point the same colour and its own line style', () => {
    const series = buildSeries(block(), 'dark');
    const point1 = series.filter((row) => row.number === 1);

    expect(new Set(point1.map((row) => row.color)).size).toBe(1);
    expect(point1.map((row) => row.dash)).toEqual(['solid', 'dashed', 'dotted']);
  });

  it('keeps a point its colour whatever else is selected', () => {
    // Colour follows the entity: removing a series must not repaint the rest.
    const series = buildSeries(block(), 'dark');
    const third = series.find((row) => row.label === '3H')!;

    expect(third.color).toBe(buildSeries(block(), 'dark').find((r) => r.label === '3H')!.color);
    expect(third.color).not.toBe(series.find((row) => row.label === '1H')!.color);
  });

  it('adapts to the machine: a pump has four points, a gearbox train eight', () => {
    const pump = pointOptions(buildSeries(block(), 'dark'));
    const train = pointOptions(
      buildSeries(
        block(
          Array.from({ length: 8 }, (_, index) => ({
            number: index + 1,
            component: index < 2 ? 'MOTOR' : 'REDUCTOR',
          })),
        ),
        'dark',
      ),
    );

    expect(pump).toHaveLength(4);
    expect(train).toHaveLength(8);
    expect(train[0]!.axes.map((row) => row.axis)).toEqual(['H', 'V', 'A']);
  });
});

describe('selection cap', () => {
  it('holds six series and refuses the seventh', () => {
    const series = buildSeries(block(), 'dark');
    let selected: string[] = [];
    for (const row of series) selected = toggleSeries(selected, row.id);

    expect(selected).toHaveLength(MAX_SERIES);
  });

  it('turns a series off again', () => {
    const series = buildSeries(block(), 'dark');
    const id = series[0]!.id;

    expect(toggleSeries(toggleSeries([], id), id)).toEqual([]);
  });

  it('takes a whole point in one press: three axes of point one and of point two', () => {
    const series = buildSeries(block(), 'dark');
    const [first, second] = pointOptions(series);

    const selected = togglePoint(togglePoint([], first!), second!);

    expect(selected).toHaveLength(6);
    expect(
      selected.map((id) => series.find((row) => row.id === id)!.label).sort(),
    ).toEqual(['1A', '1H', '1V', '2A', '2H', '2V']);
  });

  it('adds a whole point or none of it', () => {
    // Half a point answers a question nobody asked.
    const series = buildSeries(block(), 'dark');
    const options = pointOptions(series);
    const full = togglePoint(togglePoint([], options[0]!), options[1]!);

    expect(togglePoint(full, options[2]!)).toEqual(full);
  });

  it('releases the whole point when it is already on', () => {
    const series = buildSeries(block(), 'dark');
    const first = pointOptions(series)[0]!;

    expect(togglePoint(togglePoint([], first), first)).toEqual([]);
  });
});
