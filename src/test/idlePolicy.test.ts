import { describe, expect, it } from 'vitest';

import { IDLE_LIMIT_MS, idleState, shouldRenew, tokenTimes } from '@app/session/idlePolicy';

const MINUTE = 60_000;

function jwt(iat: number, exp: number): string {
  const payload = btoa(JSON.stringify({ iat, exp, token_type: 'access' }))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return `header.${payload}.signature`;
}

describe('idle session (V3-35)', () => {
  const start = 1_800_000_000_000;

  it('warns at nine minutes and ends at ten', () => {
    expect(idleState(start + 8 * MINUTE, start)).toBe('active');
    expect(idleState(start + 9 * MINUTE, start)).toBe('warning');
    expect(idleState(start + IDLE_LIMIT_MS, start)).toBe('expired');
  });

  it('reads iat and exp from a JWT', () => {
    expect(tokenTimes(jwt(100, 400))).toEqual({ issuedAt: 100_000, expiresAt: 400_000 });
    expect(tokenTimes('not-a-token')).toBeNull();
    expect(tokenTimes(null)).toBeNull();
  });

  it('renews ahead of expiry when the user did something since the token was issued', () => {
    const token = { issuedAt: start, expiresAt: start + 5 * MINUTE };
    const nearExpiry = start + 4 * MINUTE;
    expect(shouldRenew(nearExpiry, token, start + 2 * MINUTE)).toBe(true);
  });

  it('does not renew for someone who has not touched anything', () => {
    const token = { issuedAt: start, expiresAt: start + 5 * MINUTE };
    expect(shouldRenew(start + 4 * MINUTE, token, start - MINUTE)).toBe(false);
  });

  it('does not renew a token that is still young', () => {
    const token = { issuedAt: start, expiresAt: start + 5 * MINUTE };
    expect(shouldRenew(start + MINUTE, token, start + 30_000)).toBe(false);
  });

  it('keeps a user who clicks every two minutes for half an hour', () => {
    // Simulates the guard: every 10 s, renew if due; activity every 2 minutes.
    let token = { issuedAt: start, expiresAt: start + 5 * MINUTE };
    let activity = start;
    for (let now = start; now <= start + 30 * MINUTE; now += 10_000) {
      if ((now - start) % (2 * MINUTE) === 0) activity = now;
      expect(idleState(now, activity)).not.toBe('expired');
      expect(now).toBeLessThan(token.expiresAt);
      if (shouldRenew(now, token, activity)) token = { issuedAt: now, expiresAt: now + 5 * MINUTE };
    }
  });
});
