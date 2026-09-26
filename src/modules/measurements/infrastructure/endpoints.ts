import { baseApi } from '@app/api/baseApi';

import type { EquipmentMatrix } from '../domain/matrix';
import type { MeasurementTrainPage, TrainOrder } from '../domain/trains';
import type { TrendSeries } from '../domain/trend';
import type { Instrument, Spectrum, SpectrumCurve, SpectrumPage } from '../domain/types';

export const measurementsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    /** A train's spectra, one page at a time; pages append under one key. */
    spectra: build.query<SpectrumPage, { group?: number; equipment?: number; visit?: number; cursor?: string }>({
      query: (params) => ({ url: 'spectra/', params }),
      serializeQueryArgs: ({ queryArgs }) => JSON.stringify({ ...queryArgs, cursor: undefined }),
      merge: (cache, incoming, { arg }) => {
        if (!arg.cursor) return incoming;
        cache.items.push(...incoming.items);
        cache.next_cursor = incoming.next_cursor;
      },
      forceRefetch: ({ currentArg, previousArg }) => currentArg?.cursor !== previousArg?.cursor,
      providesTags: ['Spectrum'],
    }),
    /** The curve is its own request: a list must never carry 3200 pairs. */
    spectrumCurve: build.query<SpectrumCurve, number>({
      query: (id) => `spectra/${id}/curve/`,
    }),
    createSpectrum: build.mutation<Spectrum, FormData>({
      query: (body) => ({ url: 'spectra/', method: 'POST', body }),
      // The capture also lands in the machine's gallery.
      invalidatesTags: ['Spectrum', 'Media'],
    }),
    updateSpectrum: build.mutation<
      Spectrum,
      {
        id: number;
        caption?: string;
        spectrum_type?: string;
        rpm_at_capture?: number | null;
        diagnosis?: number[];
      }
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
    trainMatrix: build.query<EquipmentMatrix, { group: number; equipment?: number }>({
      query: ({ group, equipment }) => ({
        url: `asset-groups/${group}/matrix/`,
        params: equipment ? { equipment } : {},
      }),
      providesTags: ['Reading'],
    }),
    measurementTrains: build.query<
      MeasurementTrainPage,
      { technique: string; q?: string; order?: TrainOrder; offset?: number }
    >({
      query: (params) => ({ url: 'measurement-trains/', params }),
      serializeQueryArgs: ({ queryArgs }) => JSON.stringify({ ...queryArgs, offset: undefined }),
      merge: (cache, incoming, { arg }) => {
        if (!arg.offset) return incoming;
        cache.items.push(...incoming.items);
        cache.next_offset = incoming.next_offset;
      },
      forceRefetch: ({ currentArg, previousArg }) => currentArg?.offset !== previousArg?.offset,
      providesTags: ['Reading', 'Equipment'],
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
    /** Uploading a thermogram (V3-16): the image is the unit of work, and the
     * response carries the Tmax and ΔT it produced so the caller can update
     * without waiting for a refetch. */
    createThermogram: build.mutation<
      { image_id: number; image_url: string; tmax_reading_id: number; tmax: string | null;
        delta_reading_id: number | null; delta: string | null },
      { visitId: number; body: FormData }
    >({
      query: ({ visitId, body }) => ({
        url: `service-visits/${visitId}/thermograms/`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_r, _e, { visitId }) => [
        { type: 'Visit', id: visitId },
        'Reading',
        'Media',
      ],
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
  useTrainMatrixQuery,
  useMeasurementTrainsQuery,
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
  useSaveMatrixColumnMutation,
  useRecordReadingsMutation,
  useCreateThermogramMutation,
} = measurementsApi;
