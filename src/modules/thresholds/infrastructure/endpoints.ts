import { baseApi } from '@app/api/baseApi';

import type { ConditionStatus, Standard, ThresholdSet } from '../domain/types';

export const thresholdsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    conditionStatuses: build.query<ConditionStatus[], void>({
      query: () => 'statuses/',
      providesTags: ['ConditionStatus'],
    }),
    standards: build.query<Standard[], void>({
      query: () => 'standards/',
      providesTags: ['ThresholdSet'],
    }),
    thresholdSets: build.query<ThresholdSet[], { magnitude?: string; scope?: string }>({
      query: (params) => ({ url: 'threshold-sets/', params }),
      providesTags: ['ThresholdSet'],
    }),
    effectiveThresholds: build.query<ThresholdSet[], number>({
      query: (equipmentId) => `equipments/${equipmentId}/effective-thresholds/`,
      providesTags: ['ThresholdSet'],
    }),
    updateStatus: build.mutation<ConditionStatus, { id: number; color?: string; names?: Record<string, string> }>({
      query: ({ id, ...body }) => ({ url: `statuses/${id}/`, method: 'PATCH', body }),
      // The colour is used by every screen that draws a status.
      invalidatesTags: ['ConditionStatus', 'Summary', 'Equipment', 'ThresholdSet'],
    }),
    /** Answers "how many equipments change state if I apply this" before the
     * change is committed. */
    simulate: build.mutation<{ changed: number; by_status: Record<string, number> }, number>({
      query: (id) => ({ url: `threshold-sets/${id}/simulate/`, method: 'POST' }),
    }),
  }),
});

export const {
  useStandardsQuery,
  useConditionStatusesQuery,
  useUpdateStatusMutation,
  useThresholdSetsQuery,
  useEffectiveThresholdsQuery,
  useSimulateMutation,
} = thresholdsApi;
