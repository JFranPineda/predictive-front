import { baseApi } from '@app/api/baseApi';

import type { TopographyElement, TopographyHistoryEntry } from '../domain/types';

export interface TopographyElementInput {
  service_visit: number;
  element_label: string;
  level_h?: string;
  level_v?: string;
  parallel_h?: string;
  parallel_v?: string;
  observation?: string;
}

export const topographyApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    topographyElements: build.query<TopographyElement[], number>({
      query: (visitId) => ({ url: 'topography-elements/', params: { visit: visitId } }),
      providesTags: (result, _e, visitId) => [
        ...(result?.map((row) => ({ type: 'TopographyElement' as const, id: row.id })) ?? []),
        { type: 'TopographyElement', id: `visit-${visitId}` },
      ],
    }),
    topographyHistory: build.query<TopographyHistoryEntry[], { group: number; element: string }>({
      query: (params) => ({ url: 'topography-elements/history/', params }),
    }),
    createTopographyElement: build.mutation<TopographyElement, TopographyElementInput>({
      query: (body) => ({ url: 'topography-elements/', method: 'POST', body }),
      invalidatesTags: (_r, _e, body) => [
        { type: 'TopographyElement', id: `visit-${body.service_visit}` },
        { type: 'Visit', id: body.service_visit },
      ],
    }),
    updateTopographyElement: build.mutation<
      TopographyElement,
      Partial<TopographyElementInput> & { id: number; visitId: number }
    >({
      query: ({ id, ...body }) => ({ url: `topography-elements/${id}/`, method: 'PATCH', body }),
      invalidatesTags: (_r, _e, { visitId }) => [{ type: 'TopographyElement', id: `visit-${visitId}` }],
    }),
    deleteTopographyElement: build.mutation<void, { id: number; visitId: number }>({
      query: ({ id }) => ({ url: `topography-elements/${id}/`, method: 'DELETE' }),
      invalidatesTags: (_r, _e, { visitId }) => [{ type: 'TopographyElement', id: `visit-${visitId}` }],
    }),
  }),
});

export const {
  useTopographyElementsQuery,
  useTopographyHistoryQuery,
  useCreateTopographyElementMutation,
  useUpdateTopographyElementMutation,
  useDeleteTopographyElementMutation,
} = topographyApi;
