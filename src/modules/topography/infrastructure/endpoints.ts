import { baseApi } from '@app/api/baseApi';

import type { Measure, SurveyText, TopographyElement, TopographyHistoryEntry, TopographySurvey } from '../domain/types';

export type TopographyElementInput = {
  service_visit: number;
  element_label: string;
  reference_label?: string;
  observation?: string;
} & Partial<Record<Measure, string | null>>;

export const topographyApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    topographySurvey: build.query<TopographySurvey, number>({
      query: (visitId) => `topography-visits/${visitId}/survey/`,
      providesTags: (_r, _e, visitId) => [{ type: 'TopographySurvey', id: visitId }],
    }),
    updateTopographySurvey: build.mutation<TopographySurvey, { visitId: number } & Partial<SurveyText>>({
      query: ({ visitId, ...body }) => ({ url: `topography-visits/${visitId}/survey/`, method: 'PATCH', body }),
      invalidatesTags: (_r, _e, { visitId }) => [{ type: 'TopographySurvey', id: visitId }],
    }),
    uploadSurveyImage: build.mutation<TopographySurvey, { visitId: number; body: FormData }>({
      query: ({ visitId, body }) => ({ url: `topography-visits/${visitId}/survey/images/`, method: 'POST', body }),
      invalidatesTags: (_r, _e, { visitId }) => [{ type: 'TopographySurvey', id: visitId }],
    }),
    removeSurveyImage: build.mutation<TopographySurvey, { visitId: number; role: 'schema' | 'plan' }>({
      query: ({ visitId, role }) => ({ url: `topography-visits/${visitId}/survey/images/${role}/`, method: 'DELETE' }),
      invalidatesTags: (_r, _e, { visitId }) => [{ type: 'TopographySurvey', id: visitId }],
    }),
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
      query: ({ id, visitId, ...body }) => {
        void visitId; // for the cache tag only, not the server
        return { url: `topography-elements/${id}/`, method: 'PATCH', body };
      },
      invalidatesTags: (_r, _e, { visitId }) => [{ type: 'TopographyElement', id: `visit-${visitId}` }],
    }),
    deleteTopographyElement: build.mutation<void, { id: number; visitId: number }>({
      query: ({ id }) => ({ url: `topography-elements/${id}/`, method: 'DELETE' }),
      invalidatesTags: (_r, _e, { visitId }) => [{ type: 'TopographyElement', id: `visit-${visitId}` }],
    }),
    uploadBoxPhoto: build.mutation<TopographyElement, { id: number; visitId: number; body: FormData }>({
      query: ({ id, body }) => ({ url: `topography-elements/${id}/photos/`, method: 'POST', body }),
      invalidatesTags: (_r, _e, { visitId }) => [{ type: 'TopographyElement', id: `visit-${visitId}` }],
    }),
    removeBoxPhoto: build.mutation<TopographyElement, { id: number; visitId: number; box: string }>({
      query: ({ id, box }) => ({ url: `topography-elements/${id}/photos/${box}/`, method: 'DELETE' }),
      invalidatesTags: (_r, _e, { visitId }) => [{ type: 'TopographyElement', id: `visit-${visitId}` }],
    }),
  }),
});

export const {
  useTopographySurveyQuery,
  useUpdateTopographySurveyMutation,
  useUploadSurveyImageMutation,
  useRemoveSurveyImageMutation,
  useTopographyElementsQuery,
  useTopographyHistoryQuery,
  useCreateTopographyElementMutation,
  useUpdateTopographyElementMutation,
  useDeleteTopographyElementMutation,
  useUploadBoxPhotoMutation,
  useRemoveBoxPhotoMutation,
} = topographyApi;
