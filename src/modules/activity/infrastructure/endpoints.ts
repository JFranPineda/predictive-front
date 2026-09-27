import { baseApi } from '@app/api/baseApi';

import type { ActivityActors, ActivityFilters, ActivityPage, ClientEvent } from '../domain/types';

export const activityApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    activity: build.query<ActivityPage, ActivityFilters>({
      query: (params) => ({ url: 'activity/', params }),
      providesTags: ['Activity'],
    }),
    activityActors: build.query<ActivityActors, void>({
      query: () => 'activity/actors/',
      providesTags: ['Activity'],
    }),
    reportActivity: build.mutation<void, ClientEvent[]>({
      query: (events) => ({ url: 'activity/events/', method: 'POST', body: { events } }),
    }),
  }),
});

export const { useActivityQuery, useActivityActorsQuery, useReportActivityMutation } = activityApi;
