import { baseApi } from '@app/api/baseApi';

export interface ReportOrder {
  id: number;
  code: string;
  client_work_order: string;
  technique: string;
  date: string;
  trains: { id: number; name: string }[];
}

export const reportsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    reportOrders: build.query<ReportOrder[], 'mpd' | 'ndt'>({
      query: (family) => ({ url: 'reports/orders/', params: { family } }),
      providesTags: ['ServiceOrder'],
    }),
  }),
});

export const { useReportOrdersQuery } = reportsApi;
