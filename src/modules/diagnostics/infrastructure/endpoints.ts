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

/** A problem written under "Otros": what the catalogue grows from. */
export interface OtherFault {
  visit_id: number;
  visited_at: string;
  technique_code: string;
  technique_name: string;
  group_name: string;
  equipment_name: string;
  description: string;
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
    otherFaults: build.query<OtherFault[], { technique?: string }>({
      query: (params) => ({ url: 'fault-modes/others/', params }),
      providesTags: ['FaultMode'],
    }),
    setVisitFaults: build.mutation<
      { codes: string[]; other: string | null },
      { visitId: number; codes: string[]; other: string | null }
    >({
      query: ({ visitId, codes, other }) => ({
        url: `service-visits/${visitId}/faults/`,
        method: 'PUT',
        body: { codes, other },
      }),
      invalidatesTags: (_r, _e, { visitId }) => [
        { type: 'Visit', id: visitId },
        'ServiceOrder',
        'FaultMode',
      ],
    }),
  }),
});

export const {
  useFaultModesQuery,
  useCreateFaultModeMutation,
  useUpdateFaultModeMutation,
  useDeleteFaultModeMutation,
  useSetVisitFaultsMutation,
  useOtherFaultsQuery,
} = diagnosticsApi;
