import { baseApi } from '@app/api/baseApi';

import type {
  GroupReport,
  Indication,
  IndicationKind,
  JournalDraft,
  JournalSheet,
  ResultsRow,
  RollerGroup,
  RollerSheet,
  Side,
} from '../domain/types';

export interface SheetRowInput {
  equipment: number;
  values: string[];
  inaccessible: boolean;
  observation: string;
}

export interface IndicationInput {
  equipment: number;
  kind: IndicationKind;
  side?: Side;
  service_order?: number;
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
    journals: build.query<JournalSheet, { order: number; group: number }>({
      query: ({ order, group }) => ({ url: `ut-rollers/orders/${order}/journals/`, params: { group } }),
      providesTags: ['RollerJournal'],
    }),
    saveJournals: build.mutation<
      JournalSheet,
      { order: number; group: number; side: Side; rows: (JournalDraft & { equipment: number })[] }
    >({
      query: ({ order, ...body }) => ({ url: `ut-rollers/orders/${order}/journals/`, method: 'POST', body }),
      invalidatesTags: ['RollerJournal', 'RollerResults'],
    }),
    rollerResults: build.query<{ rows: ResultsRow[] }, number>({
      query: (order) => `ut-rollers/orders/${order}/results/`,
      providesTags: ['RollerResults'],
    }),
    groupReport: build.query<GroupReport, { order: number; group: number }>({
      query: ({ order, group }) => `ut-rollers/orders/${order}/groups/${group}/report/`,
      providesTags: ['RollerGroupReport'],
    }),
    saveGroupReport: build.mutation<
      GroupReport,
      { order: number; group: number; conclusions?: string; recommendations?: string }
    >({
      query: ({ order, group, ...body }) => ({
        url: `ut-rollers/orders/${order}/groups/${group}/report/`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: ['RollerGroupReport'],
    }),
    uploadReportImage: build.mutation<GroupReport, { order: number; group: number; body: FormData }>({
      query: ({ order, group, body }) => ({
        url: `ut-rollers/orders/${order}/groups/${group}/report/images/`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['RollerGroupReport'],
    }),
    removeReportImage: build.mutation<GroupReport, { order: number; group: number; asset: number }>({
      query: ({ order, group, asset }) => ({
        url: `ut-rollers/orders/${order}/groups/${group}/report/images/${asset}/`,
        method: 'DELETE',
      }),
      invalidatesTags: ['RollerGroupReport'],
    }),
    indications: build.query<Indication[], { equipment: number; order?: number; side?: Side }>({
      query: (params) => ({ url: 'ut-rollers/indications/', params }),
      providesTags: ['RollerIndication'],
    }),
    createIndication: build.mutation<Indication, IndicationInput>({
      query: (body) => ({ url: 'ut-rollers/indications/', method: 'POST', body }),
      invalidatesTags: ['RollerIndication', 'RollerSheet', 'RollerJournal', 'RollerResults'],
    }),
    deleteIndication: build.mutation<void, number>({
      query: (id) => ({ url: `ut-rollers/indications/${id}/`, method: 'DELETE' }),
      invalidatesTags: ['RollerIndication', 'RollerSheet', 'RollerJournal', 'RollerResults'],
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
  useJournalsQuery,
  useSaveJournalsMutation,
  useRollerResultsQuery,
  useGroupReportQuery,
  useSaveGroupReportMutation,
  useUploadReportImageMutation,
  useRemoveReportImageMutation,
} = utRollersApi;
