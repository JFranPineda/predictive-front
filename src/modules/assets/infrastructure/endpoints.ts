import { baseApi } from '@app/api/baseApi';

import type {
  Area,
  AssetGroup,
  Equipment,
  EquipmentDraft,
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
    deleteSector: build.mutation<void, number>({
      query: (id) => ({ url: `sectors/${id}/`, method: 'DELETE' }),
      invalidatesTags: ['Area', 'AssetGroup'],
    }),
    createAssetGroup: build.mutation<
      AssetGroup,
      { sector: number; name: string; kind: string }
    >({
      query: (body) => ({ url: 'asset-groups/', method: 'POST', body }),
      invalidatesTags: ['AssetGroup'],
    }),
    deleteAssetGroup: build.mutation<void, number>({
      query: (id) => ({ url: `asset-groups/${id}/`, method: 'DELETE' }),
      invalidatesTags: ['AssetGroup'],
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
  useCreateEquipmentMutation,
  useUpdateEquipmentMutation,
  useDeleteEquipmentMutation,
} = assetsApi;
