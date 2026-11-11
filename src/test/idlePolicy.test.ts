import { describe, expect, it } from 'vitest';

import {
  DEFAULT_IDLE_LIMIT_MS,
  idleLimitOf,
  idleState,
  shouldRenew,
  tokenTimes,
} from '@app/session/idlePolicy';

const MINUTE = 60_000;

function jwt(iat: number, exp: number): string {
  const payload = btoa(JSON.stringify({ iat, exp, token_type: 'access' }))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return `header.${payload}.signature`;
}

describe('idle session', () => {
  const start = 1_800_000_000_000;

  it('warns at twenty-nine minutes and ends at thirty', () => {
    expect(DEFAULT_IDLE_LIMIT_MS).toBe(30 * MINUTE);
    expect(idleState(start + 28 * MINUTE, start)).toBe('active');
    expect(idleState(start + 29 * MINUTE, start)).toBe('warning');
    expect(idleState(start + 30 * MINUTE, start)).toBe('expired');
  });

  it('takes the window from the refresh token the server issued, not from a second constant', () => {
    // The window was written twice, in the settings and here, and changing
    // one of them never changed what the user lived through.
    const iat = 1_800_000_000;
    expect(idleLimitOf(jwt(iat, iat + 30 * 60))).toBe(30 * MINUTE);
    expect(idleLimitOf(jwt(iat, iat + 45 * 60))).toBe(45 * MINUTE);
  });

  it('falls back to thirty minutes when the token cannot be read', () => {
    expect(idleLimitOf(null)).toBe(DEFAULT_IDLE_LIMIT_MS);
    expect(idleLimitOf('not-a-token')).toBe(DEFAULT_IDLE_LIMIT_MS);
  });

  it('never closes a session faster than the warning that announces it', () => {
    // A misconfigured server with a one-minute refresh would warn and close
    // at once; the window is never shorter than five minutes.
    const iat = 1_800_000_000;
    expect(idleLimitOf(jwt(iat, iat + 60))).toBe(5 * MINUTE);
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

  it('keeps a user who works every few minutes for two hours', () => {
    // Simulates the guard: every 10 s, renew if due; activity every 7 minutes.
    let token = { issuedAt: start, expiresAt: start + 5 * MINUTE };
    let refreshExpires = start + 30 * MINUTE;
    let activity = start;
    for (let now = start; now <= start + 120 * MINUTE; now += 10_000) {
      if ((now - start) % (7 * MINUTE) === 0) activity = now;
      expect(idleState(now, activity)).not.toBe('expired');
      expect(now).toBeLessThan(refreshExpires);
      if (shouldRenew(now, token, activity)) {
        token = { issuedAt: now, expiresAt: now + 5 * MINUTE };
        refreshExpires = now + 30 * MINUTE;
      }
    }
  });
});
