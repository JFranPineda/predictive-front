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
  valid_until: string | null;
  /** On-premise renews by file or online (v4 Phase 3); hosted we renew ourselves. */
  renewable: boolean;
}

export interface RenewOutcome {
  status: 'renewed' | 'already';
  license_id: string;
  valid_until: string;
}

export const licensingApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    licenseStatus: build.query<LicenseStatus, void>({
      query: () => 'license/status/',
    }),
    renewalRequest: build.query<{ text: string }, void>({
      query: () => 'license/renewal/request/',
    }),
    renewLicence: build.mutation<RenewOutcome, FormData>({
      query: (body) => ({ url: 'license/renew/', method: 'POST', body }),
    }),
  }),
});

export const { useLicenseStatusQuery, useLazyRenewalRequestQuery, useRenewLicenceMutation } = licensingApi;
