import { baseApi } from '@app/api/baseApi';

import type { Indication, IndicationKind, RollerGroup, RollerSheet } from '../domain/types';

export interface SheetRowInput {
  equipment: number;
  values: string[];
  inaccessible: boolean;
  observation: string;
}

export interface IndicationInput {
  equipment: number;
  kind: IndicationKind;
  length_mm?: string;
  depth_mm?: string;
  position?: string;
  notes?: string;
}

export const utRollersApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    rollerGroups: build.query<RollerGroup[], void>({
      query: () => 'ut-rollers/groups/',
      providesTags: ['RollerSheet'],
    }),
    addRollers: build.mutation<{ created: number[]; skipped: number[] }, { group: number; numbers: number[] }>({
      query: ({ group, numbers }) => ({
        url: `ut-rollers/groups/${group}/rollers/`,
        method: 'POST',
        body: { numbers },
      }),
      invalidatesTags: ['RollerSheet', 'Equipment', 'License'],
    }),
    rollerSheet: build.query<RollerSheet, { order: number; group: number }>({
      query: ({ order, group }) => ({ url: `ut-rollers/orders/${order}/sheet/`, params: { group } }),
      providesTags: ['RollerSheet'],
    }),
    saveRollerSheet: build.mutation<RollerSheet, { order: number; group: number; rows: SheetRowInput[] }>({
      query: ({ order, group, rows }) => ({
        url: `ut-rollers/orders/${order}/sheet/`,
        method: 'POST',
        body: { group, rows },
      }),
      invalidatesTags: ['RollerSheet', 'Summary', 'Visit'],
    }),
    indications: build.query<Indication[], { equipment: number }>({
      query: (params) => ({ url: 'ut-rollers/indications/', params }),
      providesTags: ['RollerIndication'],
    }),
    createIndication: build.mutation<Indication, IndicationInput>({
      query: (body) => ({ url: 'ut-rollers/indications/', method: 'POST', body }),
      invalidatesTags: ['RollerIndication', 'RollerSheet'],
    }),
    deleteIndication: build.mutation<void, number>({
      query: (id) => ({ url: `ut-rollers/indications/${id}/`, method: 'DELETE' }),
      invalidatesTags: ['RollerIndication', 'RollerSheet'],
    }),
  }),
});

export const {
  useRollerGroupsQuery,
  useAddRollersMutation,
  useRollerSheetQuery,
  useSaveRollerSheetMutation,
  useIndicationsQuery,
  useCreateIndicationMutation,
  useDeleteIndicationMutation,
} = utRollersApi;
