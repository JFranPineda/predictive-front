import { baseApi } from '@app/api/baseApi';

export interface Nameplate {
  equipment_id: number;
  equipment_name: string;
  has_nameplate: boolean;
  manufacturer: string;
  model: string;
  serial_number: string;
  frame_size: string;
  mounting: string;
  rated_power_kw: string | null;
  rated_power_hp: number | null;
  rated_rpm: number | null;
  rated_voltage_v: number | null;
  rated_current_a: string | null;
  bearing_de: string;
  bearing_nde: string;
  lubricant: string;
  lubricant_interval_h: number | null;
  source: string;
  notes: string;
  /** What the standard would grade this machine as, given the power typed. */
  resolved_class: {
    code: string;
    name: string;
    standard: string;
    explicit: boolean;
  } | null;
}

export const nameplateApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    nameplate: build.query<Nameplate, number>({
      query: (equipmentId) => `equipments/${equipmentId}/nameplate/`,
      providesTags: (_r, _e, id) => [{ type: 'Nameplate', id }],
    }),
    saveNameplate: build.mutation<Nameplate, { equipmentId: number } & Partial<Nameplate>>({
      query: ({ equipmentId, ...body }) => ({
        url: `equipments/${equipmentId}/nameplate/`,
        method: 'PUT',
        body,
      }),
      // Power decides the ISO class, which decides the limits, which decide
      // every status drawn from them.
      invalidatesTags: (_r, _e, { equipmentId }) => [
        { type: 'Nameplate', id: equipmentId },
        'Equipment',
        'Reading',
        'Summary',
      ],
    }),
  }),
});

export const { useNameplateQuery, useSaveNameplateMutation } = nameplateApi;
