/**
 * What the shell shows while the session's bootstrap loads (V3-35).
 *
 * Any error used to show the login: a server restarting or a dropped Wi-Fi
 * looked exactly like being signed out, with a valid token still in hand. Only
 * no token, or one the server refuses, is a signed-out user.
 */
export type BootstrapView = 'login' | 'loading' | 'retry' | 'app';

export function bootstrapView(state: {
  hasToken: boolean;
  hasData: boolean;
  loading: boolean;
  errorStatus: number | string | undefined;
}): BootstrapView {
  if (!state.hasToken) return 'login';
  if (state.errorStatus === 401 || state.errorStatus === 403) return 'login';
  if (state.hasData) return 'app';
  if (state.errorStatus !== undefined) return 'retry';
  return 'loading';
}
