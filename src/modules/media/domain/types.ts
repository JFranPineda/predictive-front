/**
 * A service produces two kinds of image and they are not interchangeable:
 * the screen captures that *are* the measurement, and the photographs of the
 * equipment in operation. `kind` is what keeps them apart in the report.
 */
export type MediaKind =
  | 'photo'
  | 'spectrum_image'
  | 'thermogram'
  | 'ultrasound_capture'
  | 'blueprint'
  | 'nameplate'
  | 'document';

export interface MediaAsset {
  id: number;
  kind: MediaKind;
  owner_type: string;
  owner_id: number;
  caption: string;
  url: string;
  thumb_url: string | null;
  format: string;
  bytes: number;
  width: number | null;
  height: number | null;
  state: string;
  uploaded_by: string;
  created_at: string;
}

/** What each service captures as its measurement evidence. */
export const CAPTURE_KIND_BY_TECHNIQUE: Record<string, MediaKind> = {
  vibration: 'spectrum_image',
  thermography: 'thermogram',
  ultrasound: 'ultrasound_capture',
  oil_analysis: 'document',
  insulating_oil: 'document',
};

export interface MediaPage {
  items: MediaAsset[];
  next_cursor: string | null;
}

export interface MediaVisitRef {
  id: number;
  visited_at: string;
  order_code: string;
  technique: string;
}

export interface EquipmentMediaPage extends MediaPage {
  items: (MediaAsset & { visit?: MediaVisitRef })[];
  /** Only on the first page: what fills the filter chips. */
  counts?: Partial<Record<MediaKind, number>>;
}

export function captureKindFor(technique: string): MediaKind {
  return CAPTURE_KIND_BY_TECHNIQUE[technique] ?? 'photo';
}
