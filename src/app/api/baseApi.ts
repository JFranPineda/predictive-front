import {
  type BaseQueryFn,
  createApi,
  type FetchArgs,
  fetchBaseQuery,
  type FetchBaseQueryError,
} from '@reduxjs/toolkit/query/react';

import { currentLanguage } from '@app/i18n';
import { loggedOut, tokensReceived } from '@app/session/sessionSlice';
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
 * An expired access token is refreshed once and the request retried; only a
 * refusal to refresh ends the session.
 *
 * The session is meant to survive thirty minutes of *inactivity*, and the
 * server rotates the refresh token on every use, so somebody who keeps
 * working never sees this happen. Without the retry, the access token simply
 * expiring mid-form threw the user back to the login screen.
 *
 * A single in-flight refresh is shared: a page that fires six queries at once
 * must not send six refreshes and blacklist its own token five times over.
 */
let refreshing: Promise<boolean> | null = null;

const baseQueryWithAuth: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  api,
  extraOptions,
) => {
  let result = await rawBaseQuery(args, api, extraOptions);
  if (result.error?.status !== 401) return result;

  const state = api.getState() as RootState;
  if (!state.session.refreshToken) {
    api.dispatch(loggedOut());
    return result;
  }

  refreshing ??= renewSession(api);
  const renewed = await refreshing;
  refreshing = null;

  if (!renewed) {
    api.dispatch(loggedOut());
    return result;
  }
  result = await rawBaseQuery(args, api, extraOptions);
  return result;
};

async function renewSession(api: Parameters<typeof rawBaseQuery>[1]): Promise<boolean> {
  const state = api.getState() as RootState;
  const response = await rawBaseQuery(
    { url: 'auth/refresh/', method: 'POST', body: { refresh: state.session.refreshToken } },
    api,
    {},
  );
  const tokens = response.data as { access?: string; refresh?: string } | undefined;
  if (!tokens?.access) return false;
  api.dispatch(
    tokensReceived({
      access: tokens.access,
      // Rotation is on, so the server hands back a fresh refresh token too.
      refresh: tokens.refresh ?? state.session.refreshToken!,
    }),
  );
  return true;
}

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
    'AssetGroup',
    'GroupKind',
    'Equipment',
    'Point',
    'Reading',
    'Visit',
    'ThresholdSet',
    'ConditionStatus',
    'Standard',
    'Magnitude',
    'ServiceOrder',
    'Summary',
    'User',
    'Role',
    'License',
    'Media',
  ],
  endpoints: () => ({}),
});
