import type { KindComponent, PointTemplateRow } from './types';

/**
 * Editing a kind's point template.
 *
 * The rules mirror the server's (`assets/domain/template_rules.py`), so the
 * editor can show a drift before the save instead of after it. Numbering runs
 * across the whole train, and each machine contributes as many points as it
 * declares.
 */

/** Envelope and temperature are read once per bearing, on the horizontal. */
export const AXIS_MAGNITUDES: Record<string, string[]> = {
  H: ['vel_rms', 'env_accel', 'temp'],
  V: ['vel_rms'],
  A: ['vel_rms'],
};

const CANONICAL_SIDES: Record<string, string[]> = {
  driver: ['free_end', 'coupling_end'],
  driven: ['coupling_end', 'opposite_coupling'],
};

function pointRows(number: number, component: KindComponent, offset: number): PointTemplateRow[] {
  const side = CANONICAL_SIDES[component.position]?.[offset] ?? 'custom';
  return Object.entries(AXIS_MAGNITUDES).map(([axis, magnitudes]) => ({
    number,
    axis,
    side,
    point_type: 'bearing',
    magnitudes,
    component_label: component.label,
  }));
}

/** The layout of the customer's own vibration report, for these components. */
export function layoutFor(components: KindComponent[], firstNumber = 1): PointTemplateRow[] {
  const rows: PointTemplateRow[] = [];
  let number = firstNumber;
  for (const component of components) {
    for (let offset = 0; offset < Math.max(component.point_count, 1); offset += 1) {
      rows.push(...pointRows(number, component, offset));
      number += 1;
    }
  }
  return rows;
}

/**
 * A whole point — H, V and A — at the end of one component.
 *
 * Numbering runs across the train, so the points of the machines after it
 * move up by one. Adding one axis at a time with a fixed "H" is how 1H ended
 * up twice: making 1V meant retyping the number and forgetting the axis.
 */
export function insertPoint(
  templates: PointTemplateRow[],
  components: KindComponent[],
  label: string,
): PointTemplateRow[] {
  const component = components.find((row) => row.label === label) ?? {
    label,
    equipment_type: 'other',
    position: 'driven',
    point_count: 1,
  };
  const own = templates.filter((row) => row.component_label === label).map((row) => row.number);
  // A component without points yet goes right after the ones before it.
  const position = components.findIndex((row) => row.label === label);
  const earlier = components.slice(0, Math.max(position, 0)).map((row) => row.label);
  const preceding = templates
    .filter((row) => position < 0 || earlier.includes(row.component_label ?? ''))
    .map((row) => row.number);
  const next = Math.max(0, ...(own.length ? own : preceding)) + 1;
  const shifted = templates.map((row) => (row.number >= next ? { ...row, number: row.number + 1 } : row));
  return sortRows([...shifted, ...pointRows(next, component, new Set(own).size)]);
}

/** Drops every axis of one point and closes the gap it leaves in the numbering. */
export function removePoint(templates: PointTemplateRow[], number: number): PointTemplateRow[] {
  return templates
    .filter((row) => row.number !== number)
    .map((row) => (row.number > number ? { ...row, number: row.number - 1 } : row));
}

/** The magnitudes a new axis starts with: what the canonical layout reads there. */
export function defaultMagnitudes(axis: string): string[] {
  return AXIS_MAGNITUDES[axis] ?? [];
}

/** One more axis on an existing point, in reading order (1H, 1V, 1A, 2H…). */
export function addAxis(templates: PointTemplateRow[], number: number, axis: string): PointTemplateRow[] {
  const model = templates.find((row) => row.number === number);
  if (!model) return templates;
  return sortRows([...templates, { ...model, id: undefined, axis, magnitudes: defaultMagnitudes(axis) }]);
}

/** Each component declares as many points as its template now carries. */
export function syncPointCounts(components: KindComponent[], templates: PointTemplateRow[]): KindComponent[] {
  return components.map((component) => {
    const actual = new Set(
      templates.filter((row) => row.component_label === component.label).map((row) => row.number),
    ).size;
    return actual > 0 && actual !== component.point_count ? { ...component, point_count: actual } : component;
  });
}

/** One measuring point of the template: the rows that share its number. */
export interface TemplatePoint {
  number: number;
  component_label: string;
  side: string;
  /** Index into the template of the row for each axis it is read on. */
  axes: Record<string, number>;
  indexes: number[];
}

/**
 * The template as people read it: by component, then point by point.
 *
 * Seventy rows of "1 H, 1 V, 1 A…" made the editor a wall; a point is one line
 * with its axes side by side. Rows of a component the kind no longer has are
 * kept, last, so they can still be removed.
 */
export function groupPoints(
  templates: PointTemplateRow[],
  components: KindComponent[],
): { label: string; known: boolean; points: TemplatePoint[] }[] {
  const byNumber = new Map<number, TemplatePoint>();
  templates.forEach((row, index) => {
    const point = byNumber.get(row.number) ?? {
      number: row.number,
      component_label: row.component_label ?? '',
      side: row.side,
      axes: {},
      indexes: [],
    };
    point.axes[row.axis] = index;
    point.indexes.push(index);
    byNumber.set(row.number, point);
  });
  const points = [...byNumber.values()].sort((a, b) => a.number - b.number);
  const labels = components.map((component) => component.label);
  const sections = labels.map((label) => ({
    label,
    known: true,
    points: points.filter((point) => point.component_label === label),
  }));
  const orphans = points.filter((point) => !labels.includes(point.component_label));
  return orphans.length ? [...sections, { label: '', known: false, points: orphans }] : sections;
}

const AXIS_ORDER = ['H', 'V', 'A', 'N'];

function sortRows(rows: PointTemplateRow[]): PointTemplateRow[] {
  return [...rows].sort(
    (a, b) => a.number - b.number || AXIS_ORDER.indexOf(a.axis) - AXIS_ORDER.indexOf(b.axis),
  );
}

export interface ComponentDrift {
  label: string;
  declared: number;
  actual: number;
}

/** Components whose template no longer carries the points they declare. */
export function componentDrifts(
  templates: PointTemplateRow[],
  components: KindComponent[],
): ComponentDrift[] {
  return components
    .map((component) => ({
      label: component.label,
      declared: component.point_count,
      actual: new Set(
        templates.filter((row) => row.component_label === component.label).map((row) => row.number),
      ).size,
    }))
    .filter((drift) => drift.label && drift.declared !== drift.actual);
}

/**
 * Rebuilds one component's rows and leaves every other row as edited.
 *
 * The rebuilt component gets its canonical points; the machines after it keep
 * their rows but shift their numbers, because the run is continuous across
 * the train.
 */
export function rebuildComponent(
  templates: PointTemplateRow[],
  components: KindComponent[],
  label: string,
): PointTemplateRow[] {
  const rows: PointTemplateRow[] = [];
  let start = 1;
  for (const component of components) {
    const own = templates.filter((row) => row.component_label === component.label);
    if (component.label === label || own.length === 0) {
      rows.push(...layoutFor([component], start));
    } else {
      const shift = start - Math.min(...own.map((row) => row.number));
      rows.push(...own.map((row) => ({ ...row, number: row.number + shift })));
    }
    start += Math.max(component.point_count, 1);
  }
  const unassigned = templates.filter(
    (row) => !row.component_label || !components.some((c) => c.label === row.component_label),
  );
  return [...rows, ...unassigned];
}
