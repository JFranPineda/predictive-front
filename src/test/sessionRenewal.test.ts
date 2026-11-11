import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { renewTokens } from '@app/api/tokenRefresh';
import { lastActivity, trackActivity } from '@app/session/activity';
import { bootstrapView } from '@app/session/bootstrapGate';
import { actionForStorageChange } from '@app/session/crossTab';
import sessionSlice, { loggedOut, tokensAdopted, tokensReceived } from '@app/session/sessionSlice';
import { readTokens, TOKENS_KEY, writeTokens } from '@app/session/tokenStore';

function respond(status: number, body: unknown = {}) {
  return vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status }));
}

describe('renewing the session', () => {
  const dispatch = vi.fn();
  beforeEach(() => {
    dispatch.mockReset();
    localStorage.clear();
  });
  afterEach(() => vi.unstubAllGlobals());

  it('stores the new pair when the server renews', async () => {
    vi.stubGlobal('fetch', respond(200, { access: 'a2', refresh: 'r2' }));
    expect(await renewTokens(dispatch, 'r1')).toBe('renewed');
    expect(dispatch).toHaveBeenCalledWith(tokensReceived({ access: 'a2', refresh: 'r2' }));
  });

  it('says refused only when the server refuses the token', async () => {
    vi.stubGlobal('fetch', respond(401, { code: 'token_not_valid' }));
    expect(await renewTokens(dispatch, 'r1')).toBe('refused');
  });

  it('never ends a session because the server could not be reached', async () => {
    // A restart of the server, the tunnel or the Wi-Fi in the plant: the
    // user did nothing wrong, and their token is still good.
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    expect(await renewTokens(dispatch, 'r1')).toBe('unreachable');
    vi.stubGlobal('fetch', respond(502));
    expect(await renewTokens(dispatch, 'r1')).toBe('unreachable');
  });

  it('takes the pair another tab already renewed instead of spending a retired token', async () => {
    // Two tabs share the tokens; the server retires a refresh token once it
    // is used. The tab whose turn comes second must not use it again.
    writeTokens({ access: 'a3', refresh: 'r3' });
    const fetch = respond(401, { code: 'token_not_valid' });
    vi.stubGlobal('fetch', fetch);
    expect(await renewTokens(dispatch, 'r1')).toBe('renewed');
    expect(fetch).not.toHaveBeenCalled();
    expect(dispatch).toHaveBeenCalledWith(tokensAdopted({ access: 'a3', refresh: 'r3' }));
  });

  it('takes the pair another tab renewed while this one was asking', async () => {
    writeTokens({ access: 'a1', refresh: 'r1' });
    vi.stubGlobal('fetch', vi.fn().mockImplementation(() => {
      writeTokens({ access: 'a4', refresh: 'r4' });
      return Promise.resolve(new Response(JSON.stringify({ code: 'token_not_valid' }), { status: 401 }));
    }));
    expect(await renewTokens(dispatch, 'r1')).toBe('renewed');
    expect(dispatch).toHaveBeenCalledWith(tokensAdopted({ access: 'a4', refresh: 'r4' }));
  });
});

describe('the pair in the browser', () => {
  beforeEach(() => localStorage.clear());

  it('is one value, so no tab reads a new access with a retired refresh', () => {
    writeTokens({ access: 'a2', refresh: 'r2' });
    expect(JSON.parse(localStorage.getItem(TOKENS_KEY)!)).toEqual({ access: 'a2', refresh: 'r2' });
    expect(readTokens()).toEqual({ access: 'a2', refresh: 'r2' });
  });

  it('keeps a session opened before the pair was one value', () => {
    localStorage.setItem('access', 'old-a');
    localStorage.setItem('refresh', 'old-r');
    expect(readTokens()).toEqual({ access: 'old-a', refresh: 'old-r' });
  });

  it('a tab that adopts another tab\'s pair never writes it back', () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    sessionSlice.reducer(undefined, tokensAdopted({ access: 'a5', refresh: 'r5' }));
    expect(setItem).not.toHaveBeenCalled();
    setItem.mockRestore();
  });
});

describe('what counts as activity', () => {
  let stop: () => void;
  beforeEach(() => {
    localStorage.setItem('session.lastActivity', '1');
    stop = trackActivity();
  });
  afterEach(() => stop());

  it('moving the mouse over a chart or a table is someone working', () => {
    window.dispatchEvent(new MouseEvent('mousemove'));
    expect(lastActivity()).toBeGreaterThan(1);
  });

  it('scrolling a long table is someone working', () => {
    const table = document.createElement('div');
    document.body.appendChild(table);
    table.dispatchEvent(new Event('scroll'));
    expect(lastActivity()).toBeGreaterThan(1);
  });
});

describe('every tab, one session', () => {
  it('adopts the pair another tab renewed, from the value it wrote', () => {
    const value = JSON.stringify({ access: 'a9', refresh: 'r9' });
    expect(actionForStorageChange(TOKENS_KEY, value)).toEqual(tokensAdopted({ access: 'a9', refresh: 'r9' }));
  });

  it('signs out with the tab that signed out', () => {
    expect(actionForStorageChange(TOKENS_KEY, null)).toEqual(loggedOut('expired'));
  });

  it('ignores everything else written to the browser', () => {
    expect(actionForStorageChange('draft.capture', 'x')).toBeNull();
    expect(actionForStorageChange('session.lastActivity', '1')).toBeNull();
  });
});

describe('what the screen shows while the session loads', () => {
  it('a server that did not answer is not a signed-out user', () => {
    expect(bootstrapView({ hasToken: true, hasData: false, loading: false, errorStatus: 'FETCH_ERROR' })).toBe(
      'retry',
    );
    expect(bootstrapView({ hasToken: true, hasData: false, loading: false, errorStatus: 502 })).toBe('retry');
  });

  it('a session that was already open stays open when a reload fails', () => {
    expect(bootstrapView({ hasToken: true, hasData: true, loading: false, errorStatus: 500 })).toBe('app');
  });

  it('only a missing token, or one the server refuses, shows the login', () => {
    expect(bootstrapView({ hasToken: false, hasData: false, loading: false, errorStatus: undefined })).toBe('login');
    expect(bootstrapView({ hasToken: true, hasData: false, loading: false, errorStatus: 401 })).toBe('login');
    expect(bootstrapView({ hasToken: true, hasData: false, loading: false, errorStatus: 403 })).toBe('login');
  });
});
