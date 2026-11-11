import { useEffect } from 'react';

import { renewTokens } from '@app/api/tokenRefresh';
import { useAppDispatch, useAppSelector } from '@app/hooks';

import { shouldRenew, tokenTimes } from './tokenPolicy';

const TICK_MS = 10_000;

/**
 * Keeps the session's access token fresh, renewing it ahead of expiry, so an
 * open screen never finds it expired. It never signs anyone out: there is no
 * inactivity logout (2026-11-11).
 */
export function SessionGuard() {
  const dispatch = useAppDispatch();
  const { accessToken, refreshToken } = useAppSelector((state) => state.session);

  useEffect(() => {
    const check = () => {
      if (shouldRenew(Date.now(), tokenTimes(accessToken))) void renewTokens(dispatch, refreshToken);
    };
    const timer = window.setInterval(check, TICK_MS);
    return () => window.clearInterval(timer);
  }, [dispatch, accessToken, refreshToken]);

  return null;
}
