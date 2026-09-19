import { baseApi } from '@app/api/baseApi';

import type { EquipmentMatrix } from '../domain/matrix';
import type { TrendSeries } from '../domain/trend';
import type { Instrument, Spectrum, SpectrumCurve } from '../domain/types';

export const measurementsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    spectra: build.query<Spectrum[], { equipment?: number; point?: number; visit?: number }>({
      query: (params) => ({ url: 'spectra/', params }),
      providesTags: ['Spectrum'],
    }),
    /** The curve is its own request: a list must never carry 3200 pairs. */
    spectrumCurve: build.query<SpectrumCurve, number>({
      query: (id) => `spectra/${id}/curve/`,
    }),
    createSpectrum: build.mutation<Spectrum, FormData>({
      query: (body) => ({ url: 'spectra/', method: 'POST', body }),
      invalidatesTags: ['Spectrum'],
    }),
    updateSpectrum: build.mutation<
      Spectrum,
      { id: number; caption?: string; spectrum_type?: string; rpm_at_capture?: number }
    >({
      query: ({ id, ...body }) => ({ url: `spectra/${id}/`, method: 'PATCH', body }),
      invalidatesTags: ['Spectrum'],
    }),
    deleteSpectrum: build.mutation<void, number>({
      query: (id) => ({ url: `spectra/${id}/`, method: 'DELETE' }),
      invalidatesTags: ['Spectrum'],
    }),
    instruments: build.query<Instrument[], void>({
      query: () => 'instruments/',
      providesTags: ['Instrument'],
    }),
    createInstrument: build.mutation<{ id: number }, Partial<Instrument>>({
      query: (body) => ({ url: 'instruments/', method: 'POST', body }),
      invalidatesTags: ['Instrument'],
    }),
    updateInstrument: build.mutation<{ id: number }, Partial<Instrument> & { id: number }>({
      query: ({ id, ...body }) => ({ url: `instruments/${id}/`, method: 'PATCH', body }),
      invalidatesTags: ['Instrument'],
    }),
    deleteInstrument: build.mutation<void, number>({
      query: (id) => ({ url: `instruments/${id}/`, method: 'DELETE' }),
      invalidatesTags: ['Instrument'],
    }),
    trend: build.query<
      TrendSeries[],
      { equipment: number; magnitude?: string; from?: string; to?: string }
    >({
      query: ({ equipment, ...params }) => ({ url: `equipments/${equipment}/trend/`, params }),
      providesTags: ['Reading'],
    }),
    matrix: build.query<EquipmentMatrix, { equipment: number; scope?: string; technique?: string }>({
      query: ({ equipment, ...params }) => ({
        url: `equipments/${equipment}/matrix/`,
        params,
      }),
      providesTags: ['Reading'],
    }),
    saveMatrixColumn: build.mutation<
      { saved: number },
      { visitId: number; readings: { reading_id: number; value: string | null }[] }
    >({
      query: ({ visitId, readings }) => ({
        url: `service-visits/${visitId}/readings/`,
        method: 'PATCH',
        body: { readings },
      }),
      // Saving re-runs the threshold cascade, so statuses and summaries move.
      invalidatesTags: ['Reading', 'Equipment', 'Summary', 'Visit'],
    }),
    recordReadings: build.mutation<
      { recorded: number },
      { visit: number; idempotencyKey: string; readings: unknown[] }
    >({
      query: ({ visit, idempotencyKey, readings }) => ({
        url: `service-visits/${visit}/readings/bulk/`,
        method: 'POST',
        headers: { 'Idempotency-Key': idempotencyKey },
        body: { readings },
      }),
      invalidatesTags: ['Reading', 'Equipment'],
    }),
  }),
});

export const {
  useSpectraQuery,
  useSpectrumCurveQuery,
  useCreateSpectrumMutation,
  useUpdateSpectrumMutation,
  useDeleteSpectrumMutation,
  useInstrumentsQuery,
  useCreateInstrumentMutation,
  useUpdateInstrumentMutation,
  useDeleteInstrumentMutation,
  useTrendQuery,
  useMatrixQuery,
  useSaveMatrixColumnMutation,
  useRecordReadingsMutation,
} = measurementsApi;
