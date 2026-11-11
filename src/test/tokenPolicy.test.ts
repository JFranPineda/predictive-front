import { describe, expect, it } from 'vitest';

import { shouldRenew, tokenTimes } from '@app/session/tokenPolicy';

const MINUTE = 60_000;

function jwt(iat: number, exp: number): string {
  const payload = btoa(JSON.stringify({ iat, exp, token_type: 'access' }))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return `header.${payload}.signature`;
}

describe('session tokens over time (no inactivity logout, 2026-11-11)', () => {
  const start = 1_800_000_000_000;

  it('reads iat and exp from a JWT', () => {
    expect(tokenTimes(jwt(100, 400))).toEqual({ issuedAt: 100_000, expiresAt: 400_000 });
    expect(tokenTimes('not-a-token')).toBeNull();
    expect(tokenTimes(null)).toBeNull();
  });

  it('renews ahead of expiry, whether or not anyone touched anything', () => {
    const token = { issuedAt: start, expiresAt: start + 5 * MINUTE };
    expect(shouldRenew(start + 4 * MINUTE, token)).toBe(true);
    expect(shouldRenew(start + MINUTE, token)).toBe(false);
  });

  it('keeps a screen nobody touches open through a whole day', () => {
    // Simulates the guard: every 10 s, renew if due; no activity at all.
    let token = { issuedAt: start, expiresAt: start + 5 * MINUTE };
    for (let now = start; now <= start + 24 * 60 * MINUTE; now += 10_000) {
      expect(now).toBeLessThan(token.expiresAt);
      if (shouldRenew(now, token)) token = { issuedAt: now, expiresAt: now + 5 * MINUTE };
    }
  });
});
