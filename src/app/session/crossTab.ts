import type { UnknownAction } from '@reduxjs/toolkit';

import { baseApi } from '@app/api/baseApi';

import { loggedOut, tokensAdopted } from './sessionSlice';
import { parseTokens, TOKENS_KEY } from './tokenStore';

/**
 * One session for every tab of the app. A tab that signs in or renews tells
 * the others through the browser's storage, and they take the new pair instead
 * of later renewing with the one the server already retired; a tab that signs
 * out signs out the rest.
 */
export function actionForStorageChange(key: string | null, newValue: string | null): UnknownAction | null {
  if (key !== TOKENS_KEY) return null;
  const pair = parseTokens(newValue);
  return pair ? tokensAdopted(pair) : loggedOut('expired');
}

export function followOtherTabs(dispatch: (action: UnknownAction) => void, signedIn: () => boolean): () => void {
  const onStorage = (event: StorageEvent) => {
    if (event.storageArea !== localStorage) return;
    const action = actionForStorageChange(event.key, event.newValue);
    if (!action) return;
    const wasSignedOut = !signedIn();
    dispatch(action);
    // Signed in from another tab: what this one cached was fetched as nobody.
    if (wasSignedOut && signedIn()) dispatch(baseApi.util.resetApiState());
  };
  window.addEventListener('storage', onStorage);
  return () => window.removeEventListener('storage', onStorage);
}
