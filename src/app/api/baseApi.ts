import {
  type BaseQueryFn,
  createApi,
  type FetchArgs,
  fetchBaseQuery,
  type FetchBaseQueryError,
} from '@reduxjs/toolkit/query/react';

import { currentLanguage } from '@app/i18n';
import { lastActivity } from '@app/session/activity';
import { shouldRenew, tokenTimes } from '@app/session/idlePolicy';
import { loggedOut } from '@app/session/sessionSlice';
import type { RootState } from '@app/store';

import { renewTokens } from './tokenRefresh';

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
 * Renews ahead of expiry while the user is working, and once more on a 401;
 * only a refused renewal ends the session.
 *
 * Renewing only on a 401 let the access and the refresh token expire at the
 * same instant, which logged out people mid-form exactly like people who had
 * walked away. Inactivity itself is the session guard's call, not this one's.
 */
const baseQueryWithAuth: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  api,
  extraOptions,
) => {
  const before = (api.getState() as RootState).session;
  if (shouldRenew(Date.now(), tokenTimes(before.accessToken), lastActivity())) {
    await renewTokens(api.dispatch, before.refreshToken);
  }

  let result = await rawBaseQuery(args, api, extraOptions);
  if (result.error?.status !== 401) return result;

  const renewed = await renewTokens(api.dispatch, (api.getState() as RootState).session.refreshToken);
  if (!renewed) {
    api.dispatch(loggedOut('expired'));
    return result;
  }
  result = await rawBaseQuery(args, api, extraOptions);
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
    'AssetGroup',
    'GroupKind',
    'Equipment',
    'Point',
    'Reading',
    'Visit',
    'FaultMode',
    'Nameplate',
    'ThresholdSet',
    'ConditionStatus',
    'Standard',
    'Magnitude',
    'Spectrum',
    'OperatingParameter',
    'Instrument',
    'Unit',
    'ServiceOrder',
    'ServiceProvider',
    'Summary',
    'User',
    'Role',
    'License',
    'Media',
    'AlignmentRecord',
    'AlignmentScale',
    'TopographyElement',
    'TopographySurvey',
    'WorkRecord',
    'RollerSheet',
    'RollerIndication',
    'RollerJournal',
    'RollerResults',
    'RollerGroupReport',
    'Workday',
    'ServiceJob',
    'Activity',
  ],
  endpoints: () => ({}),
});
