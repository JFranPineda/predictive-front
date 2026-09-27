import { baseApi } from '@app/api/baseApi';

import type { AtsDraft, FieldObservation, ServiceJob, Workday, WorkdayDetail } from '../domain/types';

export const workdayApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    workdays: build.query<Workday[], { plant?: number; date?: string }>({
      query: (params) => ({ url: 'workdays/', params }),
      providesTags: ['Workday'],
    }),
    workday: build.query<WorkdayDetail, number>({
      query: (id) => `workdays/${id}/`,
      providesTags: (_r, _e, id) => [{ type: 'Workday', id }],
    }),
    openWorkday: build.mutation<Workday, { plant: number; notes?: string }>({
      query: (body) => ({ url: 'workdays/', method: 'POST', body }),
      invalidatesTags: ['Workday'],
    }),
    closeWorkday: build.mutation<Workday, { id: number; password: string; notes?: string }>({
      query: ({ id, ...body }) => ({ url: `workdays/${id}/close/`, method: 'POST', body }),
      invalidatesTags: ['Workday'],
    }),
    reopenWorkday: build.mutation<Workday, { id: number; password: string; reason: string }>({
      query: ({ id, ...body }) => ({ url: `workdays/${id}/reopen/`, method: 'POST', body }),
      invalidatesTags: ['Workday'],
    }),
    createJob: build.mutation<
      ServiceJob,
      { workdayId: number; asset_group: number; service_order?: number; activity: string }
    >({
      query: ({ workdayId, ...body }) => ({ url: `workdays/${workdayId}/jobs/`, method: 'POST', body }),
      invalidatesTags: (_r, _e, { workdayId }) => [{ type: 'Workday', id: workdayId }],
    }),
    job: build.query<ServiceJob, number>({
      query: (id) => `workday-jobs/${id}/`,
      providesTags: (_r, _e, id) => [{ type: 'ServiceJob', id }],
    }),
    updateJob: build.mutation<ServiceJob, { id: number } & Partial<AtsDraft>>({
      query: ({ id, ...body }) => ({ url: `workday-jobs/${id}/`, method: 'PATCH', body }),
      invalidatesTags: (_r, _e, { id }) => [{ type: 'ServiceJob', id }],
    }),
    deleteJob: build.mutation<void, number>({
      query: (id) => ({ url: `workday-jobs/${id}/`, method: 'DELETE' }),
      invalidatesTags: ['Workday'],
    }),
    addCrew: build.mutation<ServiceJob, { id: number; name: string; position?: string }>({
      query: ({ id, ...body }) => ({ url: `workday-jobs/${id}/crew/`, method: 'POST', body }),
      invalidatesTags: (_r, _e, { id }) => [{ type: 'ServiceJob', id }],
    }),
    removeCrew: build.mutation<ServiceJob, { id: number; signatureId: number }>({
      query: ({ id, signatureId }) => ({ url: `workday-jobs/${id}/crew/${signatureId}/`, method: 'DELETE' }),
      invalidatesTags: (_r, _e, { id }) => [{ type: 'ServiceJob', id }],
    }),
    signJob: build.mutation<ServiceJob, { id: number; body: FormData }>({
      query: ({ id, body }) => ({ url: `workday-jobs/${id}/sign/`, method: 'POST', body }),
      invalidatesTags: (_r, _e, { id }) => [{ type: 'ServiceJob', id }, 'Workday'],
    }),
    unlockJob: build.mutation<ServiceJob, { id: number; reason: string }>({
      query: ({ id, ...body }) => ({ url: `workday-jobs/${id}/unlock/`, method: 'POST', body }),
      invalidatesTags: (_r, _e, { id }) => [{ type: 'ServiceJob', id }, 'Workday'],
    }),
    closeJob: build.mutation<ServiceJob, { id: number; password: string }>({
      query: ({ id, ...body }) => ({ url: `workday-jobs/${id}/close/`, method: 'POST', body }),
      invalidatesTags: (_r, _e, { id }) => [{ type: 'ServiceJob', id }, 'Workday'],
    }),
    addObservation: build.mutation<FieldObservation, { id: number; body: FormData }>({
      query: ({ id, body }) => ({ url: `workdays/${id}/observations/`, method: 'POST', body }),
      invalidatesTags: (_r, _e, { id }) => [{ type: 'Workday', id }],
    }),
  }),
});

export const {
  useWorkdaysQuery,
  useWorkdayQuery,
  useOpenWorkdayMutation,
  useCloseWorkdayMutation,
  useReopenWorkdayMutation,
  useAddObservationMutation,
  useCreateJobMutation,
  useJobQuery,
  useUpdateJobMutation,
  useDeleteJobMutation,
  useAddCrewMutation,
  useRemoveCrewMutation,
  useSignJobMutation,
  useUnlockJobMutation,
  useCloseJobMutation,
} = workdayApi;
