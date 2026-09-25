import type { Dispatch } from '@reduxjs/toolkit';

import { tokensReceived } from '@app/session/sessionSlice';

/**
 * Exchanges the refresh token for a new pair, once at a time.
 *
 * The request layer (on a 401) and the session guard (ahead of expiry) both
 * renew; sharing one in-flight promise keeps a page that fires six queries at
 * once from sending six refreshes and blacklisting its own token five times.
 */
let inFlight: Promise<boolean> | null = null;

export function renewTokens(dispatch: Dispatch, refreshToken: string | null): Promise<boolean> {
  if (!refreshToken) return Promise.resolve(false);
  inFlight ??= exchange(dispatch, refreshToken).finally(() => {
    inFlight = null;
  });
  return inFlight;
}

async function exchange(dispatch: Dispatch, refreshToken: string): Promise<boolean> {
  try {
    const response = await fetch('/api/v1/auth/refresh/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh: refreshToken }),
    });
    if (!response.ok) return false;
    const tokens = (await response.json()) as { access?: string; refresh?: string };
    if (!tokens.access) return false;
    // Rotation is on, so the server hands back a fresh refresh token too.
    dispatch(tokensReceived({ access: tokens.access, refresh: tokens.refresh ?? refreshToken }));
    return true;
  } catch {
    return false;
  }
}
