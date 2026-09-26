export interface TopographyElement {
  id: number;
  service_visit_id: number;
  element_label: string;
  level_h: string | null;
  level_v: string | null;
  parallel_h: string | null;
  parallel_v: string | null;
  observation: string;
}

export interface TopographyHistoryEntry extends TopographyElement {
  visited_at: string;
}
