import { baseApi } from '@app/api/baseApi';

import type {
  AuthoredEntry,
  EntryType,
  NamedRef,
  OrderStatus,
  ServiceAuthorship,
  ServiceOrderPage,
  ServiceOrderQuery,
  ServiceProvider,
  VisitDetail,
} from '../domain/types';

export const servicesApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    serviceOrders: build.query<ServiceOrderPage, ServiceOrderQuery>({
      query: (params) => ({ url: 'service-orders/', params }),
      providesTags: ['ServiceOrder'],
    }),
    analysts: build.query<NamedRef[], void>({
      query: () => 'service-orders/analysts/',
    }),
    serviceProviders: build.query<ServiceProvider[], { active?: boolean } | void>({
      query: (args) => ({ url: 'service-providers/', params: args?.active ? { active: 1 } : {} }),
      providesTags: ['ServiceProvider'],
    }),
    createServiceProvider: build.mutation<ServiceProvider, { name: string; tax_id?: string }>({
      query: (body) => ({ url: 'service-providers/', method: 'POST', body }),
      invalidatesTags: ['ServiceProvider'],
    }),
    updateServiceProvider: build.mutation<
      ServiceProvider,
      { id: number; name?: string; tax_id?: string; is_active?: boolean }
    >({
      query: ({ id, ...body }) => ({ url: `service-providers/${id}/`, method: 'PATCH', body }),
      invalidatesTags: ['ServiceProvider', 'ServiceOrder'],
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
    createServiceOrder: build.mutation<
      { id: number; code: string },
      {
        plant: number;
        technique: string;
        code: string;
        client_work_order?: string;
        scheduled_from?: string;
        scheduled_to?: string;
        provider?: number | null;
        lead_analyst?: number | null;
        standard?: number | null;
      }
    >({
      query: (body) => ({ url: 'service-orders/new/', method: 'POST', body }),
      invalidatesTags: ['ServiceOrder'],
    }),
    updateServiceOrder: build.mutation<
      { id: number },
      {
        id: number;
        code?: string;
        status?: OrderStatus;
        client_work_order?: string;
        scheduled_from?: string;
        scheduled_to?: string;
        provider?: number | null;
        lead_analyst?: number | null;
        standard?: number | null;
      }
    >({
      query: ({ id, ...body }) => ({ url: `service-orders/${id}/`, method: 'PATCH', body }),
      // A new norma regrades the order's readings: every view of them changes.
      invalidatesTags: ['ServiceOrder', 'Reading', 'Summary', 'Visit'],
    }),
    cancelServiceOrder: build.mutation<void, number>({
      query: (id) => ({ url: `service-orders/${id}/`, method: 'DELETE' }),
      invalidatesTags: ['ServiceOrder'],
    }),
    createVisit: build.mutation<
      { visit_id: number; equipment: string },
      { service_order: number; equipment: number; visited_at?: string; instrument?: number }
    >({
      query: (body) => ({ url: 'service-visits/', method: 'POST', body }),
      invalidatesTags: ['ServiceOrder', 'Visit', 'Reading'],
    }),
    updateVisit: build.mutation<
      { visit_id: number; is_closed: boolean },
      { id: number; close?: boolean; reopen?: boolean; visited_at?: string; instrument?: number | null }
    >({
      query: ({ id, ...body }) => ({ url: `service-visits/${id}/edit/`, method: 'PATCH', body }),
      invalidatesTags: (_r, _e, { id }) => [{ type: 'Visit', id }, 'ServiceOrder'],
    }),
    deleteVisit: build.mutation<void, number>({
      query: (id) => ({ url: `service-visits/${id}/edit/`, method: 'DELETE' }),
      invalidatesTags: ['ServiceOrder', 'Visit'],
    }),
    addParticipant: build.mutation<
      { user_id: number; role: string },
      { visitId: number; user: number; role: string }
    >({
      query: ({ visitId, ...body }) => ({
        url: `service-visits/${visitId}/participants/`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_r, _e, { visitId }) => [{ type: 'Visit', id: visitId }, 'ServiceOrder'],
    }),
    removeParticipant: build.mutation<void, { visitId: number; user: number }>({
      query: ({ visitId, user }) => ({
        url: `service-visits/${visitId}/participants/?user=${user}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_r, _e, { visitId }) => [{ type: 'Visit', id: visitId }, 'ServiceOrder'],
    }),
    updateLogEntry: build.mutation<
      { id: number },
      { id: number; visitId: number; text?: string; entry_type?: string; status?: string }
    >({
      query: ({ id, visitId, ...body }) => {
        void visitId;
        return { url: `log-entries/${id}/`, method: 'PATCH', body };
      },
      invalidatesTags: (_r, _e, { visitId }) => [{ type: 'Visit', id: visitId }, 'ServiceOrder'],
    }),
    deleteLogEntry: build.mutation<void, { id: number; visitId: number }>({
      query: ({ id }) => ({ url: `log-entries/${id}/`, method: 'DELETE' }),
      invalidatesTags: (_r, _e, { visitId }) => [{ type: 'Visit', id: visitId }, 'ServiceOrder'],
    }),
    visitOperating: build.query<
      {
        code: string;
        name: string;
        unit_code: string;
        decimals: number;
        value: string | null;
        text_value: string;
      }[],
      number
    >({
      query: (visitId) => `service-visits/${visitId}/operating/`,
      providesTags: (_r, _e, id) => [{ type: 'Visit', id }],
    }),
    saveVisitOperating: build.mutation<
      { saved: number },
      { visitId: number; values: { code: string; value: string | null }[] }
    >({
      query: ({ visitId, values }) => ({
        url: `service-visits/${visitId}/operating/`,
        method: 'PUT',
        body: { values },
      }),
      invalidatesTags: (_r, _e, { visitId }) => [{ type: 'Visit', id: visitId }],
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
  useCreateServiceOrderMutation,
  useUpdateServiceOrderMutation,
  useCancelServiceOrderMutation,
  useCreateVisitMutation,
  useUpdateVisitMutation,
  useDeleteVisitMutation,
  useAddParticipantMutation,
  useRemoveParticipantMutation,
  useUpdateLogEntryMutation,
  useDeleteLogEntryMutation,
  useVisitOperatingQuery,
  useSaveVisitOperatingMutation,
  useServiceOrdersQuery,
  useAnalystsQuery,
  useServiceProvidersQuery,
  useCreateServiceProviderMutation,
  useUpdateServiceProviderMutation,
  useAuthorshipQuery,
  useVisitQuery,
  useSaveVisitReadingsMutation,
  useAddVisitEntryMutation,
} = servicesApi;
