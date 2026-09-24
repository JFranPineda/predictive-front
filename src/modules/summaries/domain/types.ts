export interface Status {
  code: string;
  name: string;
  kind: 'condition' | 'availability';
  severity: number;
  color: string;
  measurable: boolean;
  requires_action: boolean;
}

export interface StatusCount {
  status: Status;
  count: number;
}

/** The number behind the colour, and the machine it belongs to. */
export interface Driver {
  value: number;
  unit: string;
  magnitude_code: string;
  /** Thickness and viscosity get worse as they fall. */
  higher_is_worse: boolean;
  equipment_id: number;
  equipment_tag: string;
  /** Who took the reading behind the colour. */
  recorded_by: string;
  /** When it entered the system — the moment the board changed. */
  recorded_at: string | null;
  /** When it was measured in the plant; earlier if typed in at the office. */
  measured_at: string | null;
}

export interface SummaryNode {
  key: string;
  label: string;
  level: 'area' | 'sector' | 'asset_group';
  total: number;
  evaluated: number;
  coverage: number;
  worst: Status;
  counts: StatusCount[];
  children: SummaryNode[];
  driver: Driver | null;
}

export interface TechniqueSummary {
  technique_code: string;
  technique_name: string;
  generated_at: string;
  nodes: SummaryNode[];
}
