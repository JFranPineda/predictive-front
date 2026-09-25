import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';

import { isTopLevel, parentRoute } from '@app/navigation/backTarget';

/** One back button for every screen below the first level of the menu. */
export function BackButton({ menuRoutes }: { menuRoutes: string[] }) {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();

  if (isTopLevel(location.pathname, menuRoutes)) return null;

  // React Router marks the entry the tab was opened on with the key "default":
  // there is no screen of ours behind it.
  const hasHistory = location.key !== 'default';
  const goBack = () => {
    void (hasHistory ? navigate(-1) : navigate(parentRoute(location.pathname, menuRoutes)));
  };

  return (
    <button
      type="button"
      onClick={goBack}
      className="mb-3 rounded-lg px-2 py-1 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
    >
      ← {t('nav.back')}
    </button>
  );
}
