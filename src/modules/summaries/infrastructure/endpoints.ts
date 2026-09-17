import { baseApi } from '@app/api/baseApi';

import type { Status, TechniqueSummary } from '../domain/types';

export const summariesApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    plantSummary: build.query<
      TechniqueSummary[],
      { plant: number; technique?: string; from?: string; to?: string }
    >({
      query: (params) => ({ url: 'summaries/plant/', params }),
      providesTags: ['Summary'],
    }),
    statuses: build.query<Status[], void>({
      query: () => 'statuses/',
      providesTags: ['ConditionStatus'],
    }),
  }),
});

export const { usePlantSummaryQuery, useStatusesQuery } = summariesApi;
