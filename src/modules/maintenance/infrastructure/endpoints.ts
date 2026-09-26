import { baseApi } from '@app/api/baseApi';

import type { WorkRecord, WorkRecordMarker, WorkType } from '../domain/types';

export interface ResponsibleInput {
  user?: number;
  external_name?: string;
}

export interface WorkRecordInput {
  asset_group: number;
  equipment?: number;
  work_types?: WorkType[];
  other_description?: string;
  started_at?: string;
  ended_at?: string;
  description?: string;
  spare_parts_used?: string;
  client_work_order?: string;
  recommendation?: number;
  alignment_record?: number;
  responsibles?: ResponsibleInput[];
  close?: boolean;
  reopen?: boolean;
}

export const maintenanceApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    workRecords: build.query<
      WorkRecord[],
      { group?: number; work_type?: WorkType; month?: string } | void
    >({
      query: (params) => ({ url: 'work-records/', params: params ?? undefined }),
      providesTags: (result) =>
        result
          ? [...result.map((row) => ({ type: 'WorkRecord' as const, id: row.id })), 'WorkRecord']
          : ['WorkRecord'],
    }),
    workRecord: build.query<WorkRecord, number>({
      query: (id) => `work-records/${id}/`,
      providesTags: (_r, _e, id) => [{ type: 'WorkRecord', id }],
    }),
    workRecordMarkers: build.query<WorkRecordMarker[], number>({
      query: (group) => ({ url: 'work-records/markers/', params: { group } }),
    }),
    createWorkRecord: build.mutation<WorkRecord, WorkRecordInput>({
      query: (body) => ({ url: 'work-records/', method: 'POST', body }),
      invalidatesTags: ['WorkRecord'],
    }),
    updateWorkRecord: build.mutation<WorkRecord, Partial<WorkRecordInput> & { id: number }>({
      query: ({ id, ...body }) => ({ url: `work-records/${id}/`, method: 'PATCH', body }),
      invalidatesTags: (_r, _e, { id }) => [{ type: 'WorkRecord', id }, 'WorkRecord'],
    }),
  }),
});

export const {
  useWorkRecordsQuery,
  useWorkRecordQuery,
  useWorkRecordMarkersQuery,
  useCreateWorkRecordMutation,
  useUpdateWorkRecordMutation,
} = maintenanceApi;
