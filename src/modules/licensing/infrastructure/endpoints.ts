import { baseApi } from '@app/api/baseApi';

import type { LicenseStatusCode } from '../domain/status';

export interface LicenseStatus {
  tenant: string;
  tenant_name: string;
  deployment: 'hosted' | 'on_premise';
  status: LicenseStatusCode;
  read_only: boolean;
  days_left: number;
  reason: string;
  should_warn: boolean;
}

export const licensingApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    licenseStatus: build.query<LicenseStatus, void>({
      query: () => 'license/status/',
    }),
  }),
});

export const { useLicenseStatusQuery } = licensingApi;
