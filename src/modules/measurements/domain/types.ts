

/** The device a round is taken with. An expired calibration invalidates it. */
export interface Instrument {
  id: number;
  code: string;
  name: string;
  manufacturer: string;
  serial_number: string;
  last_calibration: string | null;
  next_calibration: string | null;
  is_expired: boolean;
}


/** A spectrum, as both realities have it: a capture, numbers, or both. */
export interface Spectrum {
  id: number;
  point_id: number;
  point_label: string;
  equipment_id: number;
  taken_at: string;
  spectrum_type: string;
  visit_id: number | null;
  fmin_hz: number | null;
  fmax_hz: number | null;
  lines: number | null;
  rpm_at_capture: number | null;
  window: string;
  unit: string;
  peak_hz: number | null;
  peak_amplitude: number | null;
  has_numeric_data: boolean;
  image_url: string | null;
  thumb_url: string | null;
  caption: string;
  diagnosis: { id: number; code: string; name: string }[];
}

export interface SpectrumCurve {
  freq: number[];
  amp: number[];
  unit: string;
}
