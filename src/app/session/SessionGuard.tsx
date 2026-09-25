import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { renewTokens } from '@app/api/tokenRefresh';
import { useAppDispatch, useAppSelector } from '@app/hooks';
import { Button } from '@shared/ui/Button';
import { Modal } from '@shared/ui/Modal';

import { lastActivity, markActivity, trackActivity } from './activity';
import { idleState, shouldRenew, tokenTimes } from './idlePolicy';
import { loggedOut } from './sessionSlice';

const TICK_MS = 10_000;

/**
 * Ends the session after ten minutes without activity, and keeps it alive —
 * renewing ahead of expiry — while there is activity, even if the user is
 * typing a long round without sending anything.
 */
export function SessionGuard() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { accessToken, refreshToken } = useAppSelector((state) => state.session);
  const [warning, setWarning] = useState(false);

  useEffect(() => {
    markActivity();
    return trackActivity();
  }, []);

  useEffect(() => {
    const check = () => {
      const now = Date.now();
      const state = idleState(now, lastActivity());
      if (state === 'expired') {
        dispatch(loggedOut('idle'));
        return;
      }
      setWarning(state === 'warning');
      if (shouldRenew(now, tokenTimes(accessToken), lastActivity())) {
        void renewTokens(dispatch, refreshToken);
      }
    };
    const timer = window.setInterval(check, TICK_MS);
    return () => window.clearInterval(timer);
  }, [dispatch, accessToken, refreshToken]);

  if (!warning) return null;

  const stay = () => {
    markActivity();
    setWarning(false);
    void renewTokens(dispatch, refreshToken);
  };

  return (
    <Modal
      title={t('session.idleTitle')}
      onClose={stay}
      footer={
        <Button variant="primary" onClick={stay}>
          {t('session.stay')}
        </Button>
      }
    >
      <p className="text-sm">{t('session.idleBody')}</p>
    </Modal>
  );
}
