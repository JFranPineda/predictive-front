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

export const { useFaultModesQuery, useSetVisitFaultsMutation } = diagnosticsApi;
