/**
 * When a session renews itself and when it ends (V3-35).
 *
 * Thirty minutes without activity ends it. Activity renews it, but only
 * activity: a renewal is asked for when the access token is about to expire
 * *and* the user did something since it was issued. Renewing only on a 401 (as
 * before) let the access and refresh tokens expire together, which logged out
 * people who were working exactly like people who had left.
 *
 * The window is the refresh token's own lifetime, set once on the server
 * (IDLE_MINUTES). It used to be written here too, and changing one of the two
 * never changed what the user lived through.
 */

export const DEFAULT_IDLE_LIMIT_MS = 30 * 60_000;
export const WARNING_BEFORE_MS = 60_000;
/** A window shorter than this would warn and close at once. */
const MIN_IDLE_LIMIT_MS = 5 * 60_000;
/** Longer than the guard's tick, so a renewal is never missed between checks. */
export const RENEW_WITHIN_MS = 90_000;

export type IdleState = 'active' | 'warning' | 'expired';

/** The inactivity window the server granted: the refresh token's lifetime. */
export function idleLimitOf(refreshJwt: string | null): number {
  const times = tokenTimes(refreshJwt);
  if (!times) return DEFAULT_IDLE_LIMIT_MS;
  return Math.max(times.expiresAt - times.issuedAt, MIN_IDLE_LIMIT_MS);
}

export function idleState(now: number, lastActivity: number, limit = DEFAULT_IDLE_LIMIT_MS): IdleState {
  const idle = now - lastActivity;
  if (idle >= limit) return 'expired';
  if (idle >= limit - WARNING_BEFORE_MS) return 'warning';
  return 'active';
}

export interface TokenTimes {
  issuedAt: number;
  expiresAt: number;
}

/** `iat` and `exp` of a JWT, in milliseconds; null when it cannot be read. */
export function tokenTimes(jwt: string | null): TokenTimes | null {
  const payload = jwt?.split('.')[1];
  if (!payload) return null;
  try {
    const claims = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/'))) as {
      iat?: number;
      exp?: number;
    };
    if (typeof claims.iat !== 'number' || typeof claims.exp !== 'number') return null;
    return { issuedAt: claims.iat * 1000, expiresAt: claims.exp * 1000 };
  } catch {
    return null;
  }
}

export function shouldRenew(now: number, token: TokenTimes | null, lastActivity: number): boolean {
  if (!token) return false;
  return token.expiresAt - now <= RENEW_WITHIN_MS && lastActivity > token.issuedAt;
}
