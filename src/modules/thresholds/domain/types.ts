export interface ConditionStatus {
  id: number;
  code: string;
  name: string;
  /** Condition is derived from a value; availability is declared. */
  kind: 'condition' | 'availability';
  severity: number;
  color: string;
  measurable: boolean;
  requires_action: boolean;
  is_terminal: boolean;
}

export interface MachineClass {
  id?: number;
  code: string;
  name: string;
  description: string;
}

export interface TechniqueRef {
  code: string;
  name: string;
}

export interface Standard {
  id: number;
  code: string;
  name: string;
  names: Record<string, string>;
  source: string;
  description: string;
  is_builtin: boolean;
  is_active: boolean;
  /** The service types this standard judges. Empty means any — which is what
   * a company's own in-house criterion usually is. */
  techniques: TechniqueRef[];
  machine_classes: MachineClass[];
  set_count: number;
}

export interface Magnitude {
  code: string;
  name: string;
  technique_code: string;
  technique_name: string;
  unit_code: string;
  aggregation: string;
  decimals: number;
  higher_is_worse: boolean;
}

export interface UnitRef {
  id: number;
  code: string;
  name: string;
  names?: Record<string, string>;
  /** How many magnitudes are reported in it: a unit in use cannot be deleted. */
  magnitude_count?: number;
}

export interface StandardDraft {
  code?: string;
  name: string;
  source?: string;
  description?: string;
  techniques: string[];
  machine_classes: { code?: string; name: string; description?: string }[];
}

export interface ThresholdSetDraft {
  magnitude_code: string;
  standard_code: string | null;
  machine_class_code: string | null;
  scope: Scope;
  scope_ref_id: string | null;
  unit_code: string;
  aggregation: string;
  rationale: string;
  bands: { status_code: string; min_value: string | null; max_value: string | null }[];
}

export type Scope = 'global' | 'equipment_type' | 'asset_group_kind' | 'equipment' | 'point';

export interface Band {
  status: ConditionStatus;
  min_value: string | null;
  max_value: string | null;
}

export interface ThresholdSet {
  id: number;
  scope: Scope;
  scope_ref_id: string | null;
  scope_label: string;
  magnitude_code: string;
  unit_code: string;
  aggregation: string;
  machine_class: string;
  standard: { code: string; name: string } | null;
  bands: Band[];
  valid_from: string;
  valid_to: string | null;
  version: number;
  rationale: string;
  author_name: string | null;
}
