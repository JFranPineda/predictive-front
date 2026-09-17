import { baseApi } from '@app/api/baseApi';

import type {
  AuthoredEntry,
  EntryType,
  ServiceAuthorship,
  ServiceOrder,
  VisitDetail,
} from '../domain/types';

export const servicesApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    serviceOrders: build.query<{ results: ServiceOrder[]; count: number }, { status?: string }>({
      query: (params) => ({ url: 'service-orders/', params }),
      providesTags: ['ServiceOrder'],
    }),
    authorship: build.query<
      { results: ServiceAuthorship[]; next: string | null },
      { equipment?: number; technique?: string; performed_by?: number; from?: string; to?: string }
    >({
      query: (params) => ({ url: 'service-visits/authorship/', params }),
      providesTags: ['ServiceOrder'],
    }),
    visit: build.query<VisitDetail, number>({
      query: (id) => `service-visits/${id}/`,
      providesTags: (_r, _e, id) => [{ type: 'Visit', id }],
    }),
    saveVisitReadings: build.mutation<
      { saved: number },
      { visitId: number; readings: { reading_id: number; value: string | null }[] }
    >({
      query: ({ visitId, readings }) => ({
        url: `service-visits/${visitId}/readings/`,
        method: 'PATCH',
        body: { readings },
      }),
      // Saving a value re-runs the threshold cascade, so the equipment status
      // and every summary built on it are stale.
      invalidatesTags: (_r, _e, { visitId }) => [
        { type: 'Visit', id: visitId },
        'Reading',
        'Equipment',
        'Summary',
      ],
    }),
    addVisitEntry: build.mutation<
      AuthoredEntry,
      { visitId: number; entry_type: EntryType; text: string }
    >({
      query: ({ visitId, ...body }) => ({
        url: `service-visits/${visitId}/entries/`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_r, _e, { visitId }) => [{ type: 'Visit', id: visitId }, 'ServiceOrder'],
    }),
  }),
});

export const {
  useServiceOrdersQuery,
  useAuthorshipQuery,
  useVisitQuery,
  useSaveVisitReadingsMutation,
  useAddVisitEntryMutation,
} = servicesApi;
