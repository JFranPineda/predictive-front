import type { Dispatch } from '@reduxjs/toolkit';

import { tokensAdopted, tokensReceived } from '@app/session/sessionSlice';
import { readTokens } from '@app/session/tokenStore';

/**
 * Exchanges the refresh token for a new pair, one renewal at a time across
 * every tab.
 *
 * The server retires a refresh token the moment it is used. Two tabs renewing
 * at once used the same one: the second got a 401 and signed the user out.
 * Renewals now take turns (Web Locks), and a tab whose turn comes after
 * another tab renewed takes that pair instead of spending a retired token.
 * Inside one tab, the request layer and the session guard share one in-flight
 * renewal.
 *
 * Only `refused` ends a session. A server that could not be reached (a restart,
 * the tunnel, the plant's Wi-Fi) leaves the user signed in with what they have.
 */
export type Renewal = 'renewed' | 'refused' | 'unreachable';

const LOCK = 'predictive-session-renewal';
let inFlight: Promise<Renewal> | null = null;

export function renewTokens(dispatch: Dispatch, refreshToken: string | null): Promise<Renewal> {
  if (!refreshToken) return Promise.resolve('refused');
  inFlight ??= inTurn(() => renew(dispatch, refreshToken)).finally(() => {
    inFlight = null;
  });
  return inFlight;
}

function inTurn(work: () => Promise<Renewal>): Promise<Renewal> {
  const locks = typeof navigator === 'undefined' ? undefined : navigator.locks;
  // The lock's callback returns a promise; `then` flattens it for the types.
  return locks ? locks.request(LOCK, work).then((renewal) => renewal) : work();
}

async function renew(dispatch: Dispatch, ours: string): Promise<Renewal> {
  if (adoptNewer(dispatch, ours)) return 'renewed';
  let response: Response;
  try {
    response = await fetch('/api/v1/auth/refresh/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh: ours }),
    });
  } catch {
    return 'unreachable';
  }
  if (response.status >= 500) return 'unreachable';
  const tokens = response.ok
    ? ((await response.json().catch(() => ({}))) as { access?: string; refresh?: string })
    : {};
  if (tokens.access) {
    // Rotation is on, so the server hands back a fresh refresh token too.
    dispatch(tokensReceived({ access: tokens.access, refresh: tokens.refresh ?? ours }));
    return 'renewed';
  }
  return adoptNewer(dispatch, ours) ? 'renewed' : 'refused';
}

/** Another tab renewed after this one last did: its pair is the session's. */
function adoptNewer(dispatch: Dispatch, ours: string): boolean {
  const stored = readTokens();
  if (!stored || stored.refresh === ours) return false;
  dispatch(tokensAdopted(stored));
  return true;
}
