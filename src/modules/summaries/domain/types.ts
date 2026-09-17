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
}

export interface TechniqueSummary {
  technique_code: string;
  technique_name: string;
  generated_at: string;
  nodes: SummaryNode[];
}
