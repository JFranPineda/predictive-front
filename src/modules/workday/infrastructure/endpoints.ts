import { baseApi } from '@app/api/baseApi';

import type { FieldObservation, SafetyPermit, Workday, WorkdayDetail } from '../domain/types';

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
    registerPermit: build.mutation<SafetyPermit, { id: number; body: FormData }>({
      query: ({ id, body }) => ({ url: `workdays/${id}/permits/`, method: 'POST', body }),
      invalidatesTags: (_r, _e, { id }) => [{ type: 'Workday', id }],
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
  useRegisterPermitMutation,
  useAddObservationMutation,
} = workdayApi;
