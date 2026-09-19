import { baseApi } from '@app/api/baseApi';

import type {
  ConditionStatus,
  Magnitude,
  Standard,
  StandardDraft,
  ThresholdSet,
  ThresholdSetDraft,
  TechniqueRef,
  UnitRef,
} from '../domain/types';

export const thresholdsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    conditionStatuses: build.query<ConditionStatus[], void>({
      query: () => 'statuses/',
      providesTags: ['ConditionStatus'],
    }),
    standards: build.query<Standard[], void>({
      query: () => 'standards/',
      providesTags: ['Standard'],
    }),
    techniques: build.query<TechniqueRef[], void>({
      query: () => 'techniques/',
    }),
    units: build.query<UnitRef[], void>({
      query: () => 'units/',
      providesTags: ['Unit'],
    }),
    magnitudes: build.query<Magnitude[], void>({
      query: () => 'magnitudes/',
      providesTags: ['Magnitude'],
    }),
    createUnit: build.mutation<UnitRef, { code: string; name: string }>({
      query: (body) => ({ url: 'units/', method: 'POST', body }),
      invalidatesTags: ['Magnitude'],
    }),
    createMagnitude: build.mutation<Magnitude, Partial<Magnitude> & { name: string }>({
      query: (body) => ({ url: 'magnitudes/', method: 'POST', body }),
      invalidatesTags: ['Magnitude'],
    }),
    createStandard: build.mutation<Standard, StandardDraft>({
      query: (body) => ({ url: 'standards/new/', method: 'POST', body }),
      invalidatesTags: ['Standard'],
    }),
    updateStandard: build.mutation<Standard, StandardDraft & { id: number }>({
      query: ({ id, ...body }) => ({ url: `standards/${id}/`, method: 'PATCH', body }),
      invalidatesTags: ['Standard', 'ThresholdSet'],
    }),
    deleteStandard: build.mutation<void, number>({
      query: (id) => ({ url: `standards/${id}/`, method: 'DELETE' }),
      invalidatesTags: ['Standard'],
    }),
    createStatus: build.mutation<ConditionStatus, Record<string, unknown>>({
      query: (body) => ({ url: 'statuses/new/', method: 'POST', body }),
      invalidatesTags: ['ConditionStatus'],
    }),
    createThresholdSet: build.mutation<ThresholdSet, ThresholdSetDraft>({
      query: (body) => ({ url: 'threshold-sets/new/', method: 'POST', body }),
      // New limits change what every equipment would be graded as.
      invalidatesTags: ['ThresholdSet', 'Summary', 'Equipment'],
    }),
    updateThresholdSet: build.mutation<ThresholdSet, ThresholdSetDraft & { id: number }>({
      query: ({ id, ...body }) => ({ url: `threshold-sets/${id}/`, method: 'PATCH', body }),
      invalidatesTags: ['ThresholdSet', 'Summary', 'Equipment'],
    }),
    retireThresholdSet: build.mutation<{ id: number }, number>({
      query: (id) => ({ url: `threshold-sets/${id}/`, method: 'DELETE' }),
      invalidatesTags: ['ThresholdSet'],
    }),
    thresholdSets: build.query<ThresholdSet[], { magnitude?: string; scope?: string }>({
      query: (params) => ({ url: 'threshold-sets/', params }),
      providesTags: ['ThresholdSet'],
    }),
    effectiveThresholds: build.query<ThresholdSet[], number>({
      query: (equipmentId) => `equipments/${equipmentId}/effective-thresholds/`,
      providesTags: ['ThresholdSet'],
    }),
    updateUnit: build.mutation<
      { id: number; code: string; name: string },
      { id: number; code?: string; name?: string }
    >({
      query: ({ id, ...body }) => ({ url: `units/${id}/`, method: 'PATCH', body }),
      invalidatesTags: ['Unit', 'Magnitude'],
    }),
    deleteUnit: build.mutation<void, number>({
      query: (id) => ({ url: `units/${id}/`, method: 'DELETE' }),
      invalidatesTags: ['Unit'],
    }),
    deleteStatus: build.mutation<void, number>({
      query: (id) => ({ url: `statuses/${id}/`, method: 'DELETE' }),
      invalidatesTags: ['ConditionStatus', 'Summary', 'ThresholdSet'],
    }),
    updateStatus: build.mutation<
      ConditionStatus,
      {
        id: number;
        color?: string;
        names?: Record<string, string>;
        severity?: number;
        requires_action?: boolean;
        is_terminal?: boolean;
        measurable?: boolean;
      }
    >({
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
  useUpdateUnitMutation,
  useDeleteUnitMutation,
  useDeleteStatusMutation,
  useStandardsQuery,
  useTechniquesQuery,
  useUnitsQuery,
  useMagnitudesQuery,
  useCreateMagnitudeMutation,
  useCreateUnitMutation,
  useCreateStandardMutation,
  useUpdateStandardMutation,
  useDeleteStandardMutation,
  useCreateStatusMutation,
  useCreateThresholdSetMutation,
  useUpdateThresholdSetMutation,
  useRetireThresholdSetMutation,
  useConditionStatusesQuery,
  useUpdateStatusMutation,
  useThresholdSetsQuery,
  useEffectiveThresholdsQuery,
  useSimulateMutation,
} = thresholdsApi;
