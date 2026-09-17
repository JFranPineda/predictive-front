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
  sectors: { id: number; name: string }[];
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

export interface Plant {
  id: number;
  code: string;
  name: string;
  address: string;
  is_active: boolean;
  area_count: number;
}

export interface AssetGroup {
  id: number;
  code: string;
  name: string;
  /** The machine train: what gets aligned and reported together. */
  kind: string;
  sector: string;
  area_code: string;
  equipment_count: number;
}

export interface EquipmentDraft {
  asset_group: number;
  name: string;
  equipment_type: EquipmentType;
  client_tag?: string;
  position_in_group?: 'driver' | 'driven' | 'intermediate';
  monitoring_frequency?: MonitoringFrequency;
  generate_points?: boolean;
  first_point?: number;
}

export const ASSET_GROUP_KINDS = [
  'motor_pump',
  'motor_compressor',
  'motor_gearbox',
  'motor_fan',
  'motor_blower',
  'standalone',
] as const;

export const EQUIPMENT_TYPES = [
  'motor',
  'pump',
  'compressor',
  'gearbox',
  'fan',
  'blower',
  'bearing_housing',
  'other',
] as const;

export interface KindComponent {
  id?: number;
  label: string;
  equipment_type: string;
  position: string;
  order?: number;
}

export interface PointTemplateRow {
  id?: number;
  number: number;
  axis: string;
  label?: string;
  side: string;
  point_type: string;
  magnitudes: string[];
  component_label?: string;
}

/** A kind of machine train and the measuring layout its reports use. */
export interface AssetGroupKind {
  id: number;
  code: string;
  name: string;
  description: string;
  is_builtin: boolean;
  is_active: boolean;
  group_count: number;
  components: KindComponent[];
  point_templates: PointTemplateRow[];
}

export interface GroupPoint {
  id: number;
  label: string;
  number: number;
  axis: string;
  side: string;
  point_type: string;
  equipment_id: number;
  equipment_name: string;
  is_active: boolean;
  reading_count: number;
}

export interface GroupPoints {
  group: { id: number; name: string; kind: string | null };
  equipments: { id: number; name: string; tag: string; type: string; position: string }[];
  points: GroupPoint[];
}

export const POINT_SIDES = [
  'free_end',
  'coupling_end',
  'opposite_coupling',
  'inboard',
  'outboard',
  'custom',
] as const;

export const POINT_AXES = ['H', 'V', 'A', 'N'] as const;
