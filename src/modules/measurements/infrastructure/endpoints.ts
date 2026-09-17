import { baseApi } from '@app/api/baseApi';

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

export const { useTrendQuery, useRecordReadingsMutation } = measurementsApi;
