/**
 * The session's token pair in the browser, shared by every tab.
 *
 * One value, not two keys. A tab renewing wrote `access` and then `refresh`,
 * and another tab reading between the two writes got the new access with the
 * refresh the server had just retired; written back, that pair ended the
 * session in every tab.
 */
const KEY = 'session.tokens';
// What sessions opened before the pair was one value left behind.
const LEGACY = ['access', 'refresh'] as const;

export interface TokenPair {
  access: string;
  refresh: string;
}

export function parseTokens(value: string | null): TokenPair | null {
  if (!value) return null;
  try {
    const pair = JSON.parse(value) as Partial<TokenPair>;
    return pair.access && pair.refresh ? { access: pair.access, refresh: pair.refresh } : null;
  } catch {
    return null;
  }
}

export function readTokens(): TokenPair | null {
  const stored = parseTokens(localStorage.getItem(KEY));
  if (stored) return stored;
  const access = localStorage.getItem('access');
  const refresh = localStorage.getItem('refresh');
  return access && refresh ? { access, refresh } : null;
}

export function writeTokens(pair: TokenPair): void {
  localStorage.setItem(KEY, JSON.stringify(pair));
  LEGACY.forEach((key) => localStorage.removeItem(key));
}

export const TOKENS_KEY = KEY;
export const TOKEN_KEYS = [KEY, ...LEGACY];
