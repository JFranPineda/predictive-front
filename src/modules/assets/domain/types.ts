export type EquipmentType =
  | 'motor' | 'pump' | 'compressor' | 'gearbox' | 'fan' | 'blower' | 'bearing_housing' | 'other';

export type MonitoringFrequency =
  | 'monthly' | 'bimonthly' | 'quarterly' | 'semiannual' | 'annual' | 'on_demand';

export interface Area {
  id: number;
  code: string;
  name: string;
  parent: number | null;
  criticality: number;
  equipment_count: number;
}

export interface Equipment {
  id: number;
  asset_code: string;
  /** The customer TAG. Repeated across motor and pump in the source data, so
   * never use it as a key. */
  client_tag: string;
  name: string;
  equipment_type: EquipmentType;
  monitoring_frequency: MonitoringFrequency;
  area: { id: number; code: string; name: string };
  asset_group: { id: number; name: string; kind: string };
  condition_status: { code: string; name: string; color: string } | null;
  availability_status: { code: string; name: string; measurable: boolean } | null;
  condition_updated_at: string | null;
}

export interface MeasurementPoint {
  id: number;
  number: number;
  axis: 'H' | 'V' | 'A' | 'N';
  side: string;
  label: string;
  point_type: string;
  blueprint_x: number | null;
  blueprint_y: number | null;
}
