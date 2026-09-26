import { baseApi } from '@app/api/baseApi';

import type { AlignmentRecord, RpmTier } from '../domain/types';

export interface AlignmentRecordInput {
  asset_group: number;
  service_visit?: number;
  driver_label?: string;
  driven_label?: string;
  rpm: string;
  standard?: number | null;
  instrument?: string;
  backlash_within_tolerance?: boolean | null;
  notes?: string;
  before_angular_h?: string;
  before_parallel_h?: string;
  before_angular_v?: string;
  before_parallel_v?: string;
  after_angular_h?: string;
  after_parallel_h?: string;
  after_angular_v?: string;
  after_parallel_v?: string;
}

export const alignmentApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    alignmentRecords: build.query<
      AlignmentRecord[],
      { month?: string; group?: number; service_visit?: number } | void
    >({
      query: (params) => ({ url: 'alignment-records/', params: params ?? undefined }),
      providesTags: (result) =>
        result
          ? [...result.map((row) => ({ type: 'AlignmentRecord' as const, id: row.id })), 'AlignmentRecord']
          : ['AlignmentRecord'],
    }),
    alignmentRecord: build.query<AlignmentRecord, number>({
      query: (id) => `alignment-records/${id}/`,
      providesTags: (_r, _e, id) => [{ type: 'AlignmentRecord', id }],
    }),
    createAlignmentRecord: build.mutation<AlignmentRecord, AlignmentRecordInput>({
      query: (body) => ({ url: 'alignment-records/', method: 'POST', body }),
      invalidatesTags: (_r, _e, body) => [
        'AlignmentRecord',
        ...(body.service_visit ? [{ type: 'Visit' as const, id: body.service_visit }] : []),
      ],
    }),
    updateAlignmentRecord: build.mutation<
      AlignmentRecord,
      Partial<AlignmentRecordInput> & { id: number }
    >({
      query: ({ id, ...body }) => ({ url: `alignment-records/${id}/`, method: 'PATCH', body }),
      invalidatesTags: (_r, _e, { id }) => [{ type: 'AlignmentRecord', id }],
    }),
    deleteAlignmentRecord: build.mutation<void, number>({
      query: (id) => ({ url: `alignment-records/${id}/`, method: 'DELETE' }),
      invalidatesTags: ['AlignmentRecord'],
    }),
    alignmentScale: build.query<RpmTier[], number>({
      query: (standardId) => `alignment-scales/${standardId}/`,
      providesTags: (_r, _e, id) => [{ type: 'AlignmentScale', id }],
    }),
    saveAlignmentScale: build.mutation<RpmTier[], { standardId: number; tiers: RpmTier[] }>({
      query: ({ standardId, tiers }) => ({ url: `alignment-scales/${standardId}/`, method: 'PUT', body: { tiers } }),
      invalidatesTags: (_r, _e, { standardId }) => [{ type: 'AlignmentScale', id: standardId }],
    }),
    uploadAlignmentPhoto: build.mutation<
      { id: number; kind: string; caption: string },
      { recordId: number; body: FormData }
    >({
      query: ({ recordId, body }) => ({
        url: `alignment-records/${recordId}/photos/`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_r, _e, { recordId }) => [{ type: 'AlignmentRecord', id: recordId }],
    }),
  }),
});

export const {
  useAlignmentScaleQuery,
  useSaveAlignmentScaleMutation,
  useAlignmentRecordsQuery,
  useAlignmentRecordQuery,
  useCreateAlignmentRecordMutation,
  useUpdateAlignmentRecordMutation,
  useDeleteAlignmentRecordMutation,
  useUploadAlignmentPhotoMutation,
} = alignmentApi;
