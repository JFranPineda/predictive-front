/**
 * When the session renews its tokens.
 *
 * No inactivity logout (decided 2026-11-11): it signed people out in the
 * middle of a demo. The session lasts while the browser holds it, and ends
 * when the user signs out or the server refuses the refresh token (thirty days,
 * SESSION_DAYS). The access token is short, so it is renewed ahead of expiry,
 * whether or not the user touched anything.
 */

/** Longer than the guard's tick, so a renewal is never missed between checks. */
export const RENEW_WITHIN_MS = 90_000;

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

export function shouldRenew(now: number, token: TokenTimes | null): boolean {
  return token !== null && token.expiresAt - now <= RENEW_WITHIN_MS;
}
