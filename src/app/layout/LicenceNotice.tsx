import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { useAppSelector } from '@app/hooks';
import { useLicenceStatusQuery } from '@app/licence/licenceApi';

/**
 * Says on every screen why saving is off (v4 Phase 4), with the way out at
 * hand: the full export when the subscription lapsed, and the licence screen.
 */
export function LicenceNotice() {
  const { t } = useTranslation();
  const { data } = useLicenceStatusQuery();
  const permissions = useAppSelector((state) => state.session.permissions);
  if (!data?.read_only) return null;

  return (
    <p
      role="status"
      className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200"
    >
      {t(data.lapsed ? 'licence.lapsed' : 'licence.readOnly', { reason: data.reason })}{' '}
      {data.lapsed && permissions.includes('licensing.export_data') && (
        <>
          <Link to="/settings/license#export" className="font-medium underline">
            {t('licence.export')}
          </Link>
          {' · '}
        </>
      )}
      {permissions.includes('licensing.view_status') && (
        <Link to="/settings/license" className="font-medium underline">
          {t('licence.see')}
        </Link>
      )}
    </p>
  );
}
