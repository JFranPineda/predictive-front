import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { useAppSelector } from '@app/hooks';
import { usePlanUsageQuery } from '@app/plan/planApi';

/** Tells the administrator, on every screen, that the plan is almost full. */
export function PlanNotice() {
  const { t } = useTranslation();
  const canSee = useAppSelector((state) => state.session.permissions.includes('licensing.view_status'));
  const { data } = usePlanUsageQuery(undefined, { skip: !canSee });
  const full = data?.resources.find((row) => row.near_limit && row.allowed !== null);
  if (!canSee || !full) return null;

  return (
    <p role="status" className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200">
      {t('plan.nearLimit', {
        used: full.used,
        allowed: full.allowed,
        resource: t(`plan.resource.${full.resource}`, { defaultValue: full.resource }),
      })}{' '}
      <Link to="/settings/license" className="font-medium underline">
        {t('plan.see')}
      </Link>
    </p>
  );
}
