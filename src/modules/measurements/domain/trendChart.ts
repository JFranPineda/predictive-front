/**
 * The trends chart of the record of values — section VI of the customer's own
 * report, made readable.
 *
 * The sheet draws every point and every axis of the train on one chart: twenty
 * lines that nobody can read. Here the chart starts on a single series and the
 * analyst adds the ones being compared, up to six. Six is the point where a
 * comparison is still a comparison.
 *
 * Identity is carried by two encodings at once, never by colour alone: the
 * colour is the measuring point, the line style and marker are the axis. That
 * is what lets 1H, 1V and 1A read as one bearing seen three ways, and 1H, 2H,
 * 3H as three bearings seen the same way.
 */

import type { MatrixBlock, MatrixRow } from './matrix';

/** Past six lines a trend chart stops answering and starts decorating. */
export const MAX_SERIES = 6;

/**
 * Categorical palette, validated for both surfaces on the adjacent pairlist
 * (worst CVD ΔE 9.1 light / 8.4 dark, normal vision 19.6 / 19.3).
 *
 * Three light-mode hues sit under 3:1 against white, which obliges the relief
 * this chart already ships: every line is labelled at its end, the legend is
 * always on, and the numeric table sits directly above it.
 *
 * A train can hold ten points, more than the palette has slots. Past the
 * eighth the colour repeats, and the axis encoding plus the end label is what
 * keeps two same-coloured points apart — the composite encoding the palette
 * asks for rather than an invented ninth hue.
 */
const PALETTE = {
  light: ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#4a3aa7', '#e34948'],
  dark: ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300', '#9085e9', '#e66767'],
} as const;

export type ThemeMode = keyof typeof PALETTE;

/** The second encoding. Solid reads as the primary axis, as the sheet does. */
const AXIS_STYLE: Record<string, { dash: 'solid' | 'dashed' | 'dotted'; symbol: string }> = {
  H: { dash: 'solid', symbol: 'circle' },
  V: { dash: 'dashed', symbol: 'rect' },
  A: { dash: 'dotted', symbol: 'triangle' },
  N: { dash: 'solid', symbol: 'diamond' },
};

export interface SeriesPoint {
  value: number | null;
  statusCode: string | null;
  statusColor: string | null;
}

export interface ChartSeries {
  id: string;
  /** "1H" — what the analyst calls it, and what labels the line's end. */
  label: string;
  component: string;
  number: number;
  axis: string;
  color: string;
  dash: 'solid' | 'dashed' | 'dotted';
  symbol: string;
  points: SeriesPoint[];
}

/** One selectable point, with the axes actually measured on it. */
export interface PointOption {
  number: number;
  component: string;
  color: string;
  axes: { axis: string; seriesId: string }[];
}

/**
 * Every row of a magnitude block, as a drawable series.
 *
 * The colour is keyed to the point's place in the block, not to its place in
 * the selection: removing a series must never repaint the ones that stay.
 */
export function buildSeries(block: MatrixBlock, mode: ThemeMode): ChartSeries[] {
  const palette = PALETTE[mode];
  const slots = colourSlots(block.rows);
  return block.rows.map((row) => {
    const style = AXIS_STYLE[row.axis] ?? AXIS_STYLE.N!;
    return {
      id: String(row.point_id),
      label: row.label,
      component: row.component,
      number: row.number,
      axis: row.axis,
      color: palette[(slots.get(row.number) ?? 0) % palette.length]!,
      dash: style.dash,
      symbol: style.symbol,
      points: row.cells.map((cell) => ({
        value: cell?.value == null ? null : Number(cell.value),
        statusCode: cell?.status_code ?? null,
        statusColor: cell?.status_color ?? null,
      })),
    };
  });
}

/** The selector, grouped the way the machine is: component, then point. */
export function pointOptions(series: ChartSeries[]): PointOption[] {
  const byNumber = new Map<number, PointOption>();
  for (const row of series) {
    const option = byNumber.get(row.number) ?? {
      number: row.number,
      component: row.component,
      color: row.color,
      axes: [],
    };
    option.axes.push({ axis: row.axis, seriesId: row.id });
    byNumber.set(row.number, option);
  }
  for (const option of byNumber.values()) {
    option.axes.sort((a, b) => axisRank(a.axis) - axisRank(b.axis));
  }
  return [...byNumber.values()].sort((a, b) => a.number - b.number);
}

/**
 * What the chart opens on: the first point's horizontal.
 *
 * Opening on everything is the state the spreadsheet is stuck in; opening on
 * nothing makes the reader do work before seeing anything.
 */
export function defaultSelection(series: ChartSeries[]): string[] {
  if (series.length === 0) return [];
  const lowest = Math.min(...series.map((row) => row.number));
  const first =
    series.find((row) => row.number === lowest && row.axis === 'H') ??
    series.find((row) => row.number === lowest) ??
    series[0]!;
  return [first.id];
}

/** Adds or removes one series, never going past the cap. */
export function toggleSeries(selected: string[], id: string, max = MAX_SERIES): string[] {
  if (selected.includes(id)) return selected.filter((row) => row !== id);
  if (selected.length >= max) return selected;
  return [...selected, id];
}

/** Every axis of one point at once — the comparison the analyst makes most. */
export function togglePoint(
  selected: string[],
  option: PointOption,
  max = MAX_SERIES,
): string[] {
  const ids = option.axes.map((row) => row.seriesId);
  const allOn = ids.every((id) => selected.includes(id));
  if (allOn) return selected.filter((id) => !ids.includes(id));

  const missing = ids.filter((id) => !selected.includes(id));
  // Room for the whole point or nothing: adding half of it would answer a
  // question nobody asked.
  if (selected.length + missing.length > max) return selected;
  return [...selected, ...missing];
}

/** H, V, A — the order the analyst reads, not the one the alphabet gives. */
function axisRank(axis: string): number {
  const order = ['H', 'V', 'A'];
  const rank = order.indexOf(axis);
  return rank === -1 ? order.length : rank;
}

/** Colour slot per point number: stable for the block, whatever is selected. */
function colourSlots(rows: MatrixRow[]): Map<number, number> {
  const numbers = [...new Set(rows.map((row) => row.number))].sort((a, b) => a - b);
  return new Map(numbers.map((number, index) => [number, index]));
}
