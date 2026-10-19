import { baseApi } from '@app/api/baseApi';
import type { LicenseStatusCode } from '@modules/licensing/domain/status';

export interface LicenseStatus {
  tenant: string;
  tenant_name: string;
  deployment: 'hosted' | 'on_premise';
  status: LicenseStatusCode;
  read_only: boolean;
  /** No subscription in force: reading and exporting only (v4 Phase 4). */
  lapsed: boolean;
  days_left: number;
  reason: string;
  should_warn: boolean;
  valid_until: string | null;
  /** On-premise renews by file or online (v4 Phase 3); hosted we renew ourselves. */
  renewable: boolean;
}

/**
 * The licence status lives in the app layer, like plan usage: the shell
 * gates every save button and shows the notice on every screen, and the
 * licence page draws the detail — all from this one query. A 402 from any
 * request refreshes it (`baseApi`), so the screen follows the server.
 */
export const licenceApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    licenceStatus: build.query<LicenseStatus, void>({
      query: () => 'license/status/',
      providesTags: ['License'],
    }),
  }),
});

export const { useLicenceStatusQuery } = licenceApi;
