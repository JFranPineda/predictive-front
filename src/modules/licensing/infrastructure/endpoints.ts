import { baseApi } from '@app/api/baseApi';

export interface RenewOutcome {
  status: 'renewed' | 'already';
  license_id: string;
  valid_until: string;
}

export interface TenantExport {
  id?: number;
  status: 'none' | 'pending' | 'running' | 'done' | 'failed';
  size?: number;
  rows?: number;
  files?: number;
  error?: string;
  created_at?: string;
  finished_at?: string | null;
  downloadable?: boolean;
}

export const licensingApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    exportStatus: build.query<TenantExport, void>({
      query: () => 'license/export/',
    }),
    startExport: build.mutation<TenantExport, void>({
      query: () => ({ url: 'license/export/', method: 'POST' }),
    }),
    renewalRequest: build.query<{ text: string }, void>({
      query: () => 'license/renewal/request/',
    }),
    renewLicence: build.mutation<RenewOutcome, FormData>({
      query: (body) => ({ url: 'license/renew/', method: 'POST', body }),
    }),
  }),
});

export const { useExportStatusQuery, useStartExportMutation, useLazyRenewalRequestQuery, useRenewLicenceMutation } =
  licensingApi;
