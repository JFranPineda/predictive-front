/** Mediciones: one row per train for the chosen service (V3-06, V3-07). */
export interface MeasurementTrain {
  id: number;
  code: string;
  name: string;
  kind: string;
  area: { code: string; name: string };
  status: { code: string; name: string; color: string };
  /** Points with at least one reading of the chosen service. */
  measured_points: number;
  /** The last time anyone touched the train: a visit of any service, or maintenance. */
  last_intervention: { at: string; what: string; who: string } | null;
}

export interface MeasurementTrainPage {
  items: MeasurementTrain[];
  count: number;
  next_offset: number | null;
  areas: number;
}

export type TrainOrder = 'name' | 'last_intervention';

/** "MOTOR · MR311003": how a machine is named in the scope list. */
export function machineLabel(machine: { name: string; tag: string }): string {
  return machine.tag ? `${machine.name} · ${machine.tag}` : machine.name;
}
