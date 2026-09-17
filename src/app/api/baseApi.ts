import {
  type BaseQueryFn,
  createApi,
  type FetchArgs,
  fetchBaseQuery,
  type FetchBaseQueryError,
} from '@reduxjs/toolkit/query/react';

import { currentLanguage } from '@app/i18n';
import { loggedOut } from '@app/session/sessionSlice';
import type { RootState } from '@app/store';

const rawBaseQuery = fetchBaseQuery({
  baseUrl: '/api/v1/',
  prepareHeaders: (headers, { getState }) => {
    const state = getState() as RootState;
    if (state.session.accessToken) {
      headers.set('Authorization', `Bearer ${state.session.accessToken}`);
    }
    if (state.session.companyId !== null) {
      headers.set('X-Company-Id', String(state.session.companyId));
    }
    // Catalogue text (status names, techniques, standards) is translated
    // server-side, so the language travels with every request.
    headers.set('X-Language', currentLanguage());
    return headers;
  },
});

/**
 * A rejected token ends the session instead of leaving the screen blank.
 *
 * Without this, an expired or orphaned token produced pages with headers and
 * no rows and a spinner that never stopped — the app looked broken when it was
 * simply logged out.
 */
const baseQueryWithAuth: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  api,
  extraOptions,
) => {
  const result = await rawBaseQuery(args, api, extraOptions);
  if (result.error?.status === 401) {
    api.dispatch(loggedOut());
  }
  return result;
};

/**
 * One API slice for the whole app. Modules add their endpoints with
 * `injectEndpoints`, which keeps cache invalidation coherent across modules:
 * recording a reading has to invalidate the equipment list too.
 */
export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithAuth,
  tagTypes: [
    'Bootstrap',
    'Module',
    'Plant',
    'Area',
    'Equipment',
    'Point',
    'Reading',
    'Visit',
    'ThresholdSet',
    'ConditionStatus',
    'Standard',
    'ServiceOrder',
    'Summary',
    'User',
    'License',
    'Media',
  ],
  endpoints: () => ({}),
});
