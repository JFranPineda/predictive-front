import { baseApi } from '@app/api/baseApi';

export interface FaultMode {
  id: number;
  code: string;
  name: string;
  technique_code: string;
  /** How the fault shows up in the data; the analyst's cue. */
  signature: string;
  reference: string;
}

export const diagnosticsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    faultModes: build.query<FaultMode[], { technique?: string }>({
      query: (params) => ({ url: 'fault-modes/', params }),
      providesTags: ['FaultMode'],
    }),
    createFaultMode: build.mutation<FaultMode, Partial<FaultMode>>({
      query: (body) => ({ url: 'fault-modes/', method: 'POST', body }),
      invalidatesTags: ['FaultMode'],
    }),
    updateFaultMode: build.mutation<FaultMode, Partial<FaultMode> & { id: number }>({
      query: ({ id, ...body }) => ({ url: `fault-modes/${id}/`, method: 'PATCH', body }),
      invalidatesTags: ['FaultMode'],
    }),
    deleteFaultMode: build.mutation<void, number>({
      query: (id) => ({ url: `fault-modes/${id}/`, method: 'DELETE' }),
      invalidatesTags: ['FaultMode'],
    }),
    setVisitFaults: build.mutation<{ codes: string[] }, { visitId: number; codes: string[] }>({
      query: ({ visitId, codes }) => ({
        url: `service-visits/${visitId}/faults/`,
        method: 'PUT',
        body: { codes },
      }),
      invalidatesTags: (_r, _e, { visitId }) => [{ type: 'Visit', id: visitId }, 'ServiceOrder'],
    }),
  }),
});

export const {
  useFaultModesQuery,
  useCreateFaultModeMutation,
  useUpdateFaultModeMutation,
  useDeleteFaultModeMutation,
  useSetVisitFaultsMutation,
} = diagnosticsApi;
