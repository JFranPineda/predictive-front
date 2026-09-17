import { baseApi } from '@app/api/baseApi';

import type { EquipmentMatrix } from '../domain/matrix';
import type { TrendSeries } from '../domain/trend';

export const measurementsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
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
  useTrendQuery,
  useMatrixQuery,
  useSaveMatrixColumnMutation,
  useRecordReadingsMutation,
} = measurementsApi;
