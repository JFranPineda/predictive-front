import { baseApi } from '@app/api/baseApi';

import type {
  Area,
  AssetGroup,
  AssetGroupKind,
  Equipment,
  EquipmentDraft,
  GroupPoints,
  MeasurementPoint,
  Plant,
} from '../domain/types';

interface Page<T> {
  count: number;
  results: T[];
  next: string | null;
  previous: string | null;
}

export const assetsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    areas: build.query<Page<Area>, { plant?: number } | void>({
      query: (params) => ({ url: 'areas/', params: params ?? undefined }),
      providesTags: ['Area'],
    }),
    equipments: build.query<
      Page<Equipment>,
      { area?: number; status?: string; search?: string; page?: number; page_size?: number }
    >({
      query: (params) => ({ url: 'equipments/', params }),
      providesTags: ['Equipment'],
    }),
    equipment: build.query<Equipment, number>({
      query: (id) => `equipments/${id}/`,
      providesTags: (_result, _error, id) => [{ type: 'Equipment', id }],
    }),
    equipmentPoints: build.query<MeasurementPoint[], number>({
      query: (id) => `equipments/${id}/points/`,
      providesTags: ['Point'],
    }),
    plants: build.query<Plant[], void>({
      query: () => 'plants/',
      providesTags: ['Plant'],
    }),
    assetGroups: build.query<AssetGroup[], { sector?: number } | void>({
      query: (params) => ({ url: 'asset-groups/', params: params ?? undefined }),
      providesTags: ['AssetGroup'],
    }),
    createPlant: build.mutation<Plant, { name: string; code?: string; address?: string }>({
      query: (body) => ({ url: 'plants/', method: 'POST', body }),
      invalidatesTags: ['Plant'],
    }),
    createArea: build.mutation<Area, { plant: number; code: string; name: string; criticality?: number }>({
      query: (body) => ({ url: 'areas/new/', method: 'POST', body }),
      invalidatesTags: ['Area', 'Plant'],
    }),
    updateArea: build.mutation<Area, { id: number; code?: string; name?: string; criticality?: number }>({
      query: ({ id, ...body }) => ({ url: `areas/${id}/edit/`, method: 'PATCH', body }),
      invalidatesTags: ['Area'],
    }),
    deleteArea: build.mutation<void, number>({
      query: (id) => ({ url: `areas/${id}/edit/`, method: 'DELETE' }),
      invalidatesTags: ['Area', 'Plant'],
    }),
    createSector: build.mutation<{ id: number; name: string }, { area: number; name: string }>({
      query: (body) => ({ url: 'sectors/', method: 'POST', body }),
      invalidatesTags: ['Area', 'AssetGroup'],
    }),
    updatePlant: build.mutation<
      { id: number; name: string },
      { id: number; name?: string; address?: string }
    >({
      query: ({ id, ...body }) => ({ url: `plants/${id}/`, method: 'PATCH', body }),
      invalidatesTags: ['Plant', 'Area'],
    }),
    deletePlant: build.mutation<void, number>({
      query: (id) => ({ url: `plants/${id}/`, method: 'DELETE' }),
      invalidatesTags: ['Plant', 'Area'],
    }),
    updateSector: build.mutation<{ id: number; name: string }, { id: number; name: string }>({
      query: ({ id, ...body }) => ({ url: `sectors/${id}/`, method: 'PATCH', body }),
      invalidatesTags: ['Area', 'AssetGroup'],
    }),
    updateAssetGroup: build.mutation<
      { id: number; name: string },
      { id: number; name?: string; kind?: number; criticality?: number }
    >({
      query: ({ id, ...body }) => ({ url: `asset-groups/${id}/`, method: 'PATCH', body }),
      invalidatesTags: ['AssetGroup', 'Equipment'],
    }),
    updatePoint: build.mutation<
      { id: number; label: string },
      { id: number; number?: number; axis?: string; side?: string; point_type?: string }
    >({
      query: ({ id, ...body }) => ({ url: `points/${id}/`, method: 'PATCH', body }),
      invalidatesTags: ['Point', 'AssetGroup'],
    }),
    deleteSector: build.mutation<void, number>({
      query: (id) => ({ url: `sectors/${id}/`, method: 'DELETE' }),
      invalidatesTags: ['Area', 'AssetGroup'],
    }),
    createAssetGroup: build.mutation<
      AssetGroup,
      // `kind` is a catalogue row now, not a hardcoded string.
      { sector: number; name: string; kind: number }
    >({
      query: (body) => ({ url: 'asset-groups/', method: 'POST', body }),
      invalidatesTags: ['AssetGroup'],
    }),
    deleteAssetGroup: build.mutation<void, number>({
      query: (id) => ({ url: `asset-groups/${id}/`, method: 'DELETE' }),
      invalidatesTags: ['AssetGroup'],
    }),
    groupKinds: build.query<AssetGroupKind[], void>({
      query: () => 'asset-group-kinds/',
      providesTags: ['GroupKind'],
    }),
    createGroupKind: build.mutation<AssetGroupKind, Partial<AssetGroupKind>>({
      query: (body) => ({ url: 'asset-group-kinds/', method: 'POST', body }),
      invalidatesTags: ['GroupKind'],
    }),
    updateGroupKind: build.mutation<AssetGroupKind, Partial<AssetGroupKind> & { id: number }>({
      query: ({ id, ...body }) => ({ url: `asset-group-kinds/${id}/`, method: 'PATCH', body }),
      invalidatesTags: ['GroupKind'],
    }),
    deleteGroupKind: build.mutation<void, number>({
      query: (id) => ({ url: `asset-group-kinds/${id}/`, method: 'DELETE' }),
      invalidatesTags: ['GroupKind'],
    }),
    groupPoints: build.query<GroupPoints, number>({
      query: (id) => `asset-groups/${id}/points/`,
      providesTags: ['Point'],
    }),
    applyPointTemplate: build.mutation<{ created: number; total: number }, number>({
      query: (id) => ({ url: `asset-groups/${id}/points/`, method: 'POST', body: {} }),
      invalidatesTags: ['Point', 'Equipment'],
    }),
    createPoint: build.mutation<
      { id: number; label: string },
      { equipment: number; number: number; axis: string; side?: string; point_type?: string }
    >({
      query: (body) => ({ url: 'points/', method: 'POST', body }),
      invalidatesTags: ['Point'],
    }),
    deletePoint: build.mutation<void, number>({
      query: (id) => ({ url: `points/${id}/`, method: 'DELETE' }),
      invalidatesTags: ['Point'],
    }),
    createEquipment: build.mutation<
      { id: number; asset_code: string; name: string; point_count: number },
      EquipmentDraft
    >({
      query: (body) => ({ url: 'equipments/new/', method: 'POST', body }),
      // A new equipment changes the plant totals and the traffic light.
      invalidatesTags: ['Equipment', 'Area', 'Summary', 'AssetGroup'],
    }),
    updateEquipment: build.mutation<{ id: number }, Partial<EquipmentDraft> & { id: number }>({
      query: ({ id, ...body }) => ({ url: `equipments/${id}/edit/`, method: 'PATCH', body }),
      invalidatesTags: ['Equipment', 'Summary'],
    }),
    deleteEquipment: build.mutation<void, number>({
      query: (id) => ({ url: `equipments/${id}/edit/`, method: 'DELETE' }),
      invalidatesTags: ['Equipment', 'Area', 'Summary'],
    }),
  }),
});

export const {
  useUpdatePlantMutation,
  useDeletePlantMutation,
  useUpdateSectorMutation,
  useUpdateAssetGroupMutation,
  useUpdatePointMutation,
  useAreasQuery,
  useEquipmentsQuery,
  useEquipmentQuery,
  useEquipmentPointsQuery,
  usePlantsQuery,
  useAssetGroupsQuery,
  useCreatePlantMutation,
  useCreateAreaMutation,
  useUpdateAreaMutation,
  useDeleteAreaMutation,
  useCreateSectorMutation,
  useDeleteSectorMutation,
  useCreateAssetGroupMutation,
  useDeleteAssetGroupMutation,
  useGroupKindsQuery,
  useCreateGroupKindMutation,
  useUpdateGroupKindMutation,
  useDeleteGroupKindMutation,
  useGroupPointsQuery,
  useApplyPointTemplateMutation,
  useCreatePointMutation,
  useDeletePointMutation,
  useCreateEquipmentMutation,
  useUpdateEquipmentMutation,
  useDeleteEquipmentMutation,
} = assetsApi;
