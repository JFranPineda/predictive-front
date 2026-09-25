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
 * A whole point — H, V and A — with the next free number.
 *
 * Adding one axis at a time with a fixed "H" is how 1H ended up twice: making
 * 1V meant retyping the number and forgetting the axis.
 */
export function addPoint(templates: PointTemplateRow[], components: KindComponent[]): PointTemplateRow[] {
  const next = Math.max(0, ...templates.map((row) => row.number)) + 1;
  const label = templates.at(-1)?.component_label ?? components[0]?.label ?? '';
  const component = components.find((row) => row.label === label) ?? {
    label,
    equipment_type: 'other',
    position: 'driven',
    point_count: 1,
  };
  return [...templates, ...pointRows(next, component, Number.POSITIVE_INFINITY)];
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
