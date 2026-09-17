import { baseApi } from '@app/api/baseApi';

import type { Area, Equipment, MeasurementPoint } from '../domain/types';

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
  }),
});

export const { useAreasQuery, useEquipmentsQuery, useEquipmentQuery, useEquipmentPointsQuery } =
  assetsApi;
