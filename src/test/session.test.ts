import { describe, expect, it } from 'vitest';

import sessionSlice, { loggedOut, tokensReceived } from '@app/session/sessionSlice';

const reducer = sessionSlice.reducer;

describe('session tokens', () => {
  it('keeps the rotated refresh token, not only the access one', () => {
    // The server rotates the refresh on every use and blacklists the old one.
    // Storing only the access token would leave the next renewal holding a
    // token the server has already retired.
    const state = reducer(undefined, tokensReceived({ access: 'a1', refresh: 'r1' }));
    const rotated = reducer(state, tokensReceived({ access: 'a2', refresh: 'r2' }));
    expect(rotated.accessToken).toBe('a2');
    expect(rotated.refreshToken).toBe('r2');
  });

  it('clears everything on logout so nothing is retried with a dead token', () => {
    const state = reducer(undefined, tokensReceived({ access: 'a1', refresh: 'r1' }));
    const out = reducer(state, loggedOut());
    expect(out.accessToken).toBeNull();
    expect(out.refreshToken).toBeNull();
    expect(out.permissions).toEqual([]);
    expect(out.userId).toBeNull();
  });
});
