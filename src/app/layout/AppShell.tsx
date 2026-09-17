import { useTranslation } from 'react-i18next';
import { NavLink, Outlet } from 'react-router-dom';

import { useAppDispatch } from '@app/hooks';
import { loggedOut } from '@app/session/sessionSlice';
import type { Bootstrap } from '@app/session/sessionApi';
import type { MenuEntry } from '@app/session/sessionSlice';
import { ThemeToggle } from '@shared/ui/ThemeToggle';

interface Props {
  menu: MenuEntry[];
  user: Bootstrap['user'];
  companies: Bootstrap['companies'];
}

/** The shell knows nothing about any module: it renders the menu the server
 * assembled from the installed manifests. */
export function AppShell({ menu, user, companies }: Props) {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const topLevel = menu.filter((item) => item.parent === null);
  const settings = menu.filter((item) => item.parent === 'settings');
  const company = companies[0];

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <aside className="flex w-64 shrink-0 flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="px-5 py-5">
          <p className="text-lg font-semibold tracking-tight">{t('app.name')}</p>
          {company && <p className="mt-0.5 truncate text-xs text-slate-500">{company.name}</p>}
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3">
          {topLevel.map((item) => (
            <MenuLink key={item.route} item={item} />
          ))}

          {settings.length > 0 && (
            <>
              <p className="px-3 pb-1 pt-5 text-[11px] font-medium uppercase tracking-wider text-slate-400">
                {t('nav.settings')}
              </p>
              {settings.map((item) => (
                <MenuLink key={item.route} item={item} />
              ))}
            </>
          )}
        </nav>

        <div className="space-y-3 border-t border-slate-200 px-4 py-3 dark:border-slate-800">
          <ThemeToggle />
          <div className="flex items-center gap-2">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white dark:bg-slate-100 dark:text-slate-900">
              {user.initials || user.name.slice(0, 2).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{user.name}</p>
              <p className="truncate text-xs text-slate-500">{user.email}</p>
            </div>
          </div>
          <button
            onClick={() => dispatch(loggedOut())}
            className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            {t('auth.signOut')}
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}

function MenuLink({ item }: { item: MenuEntry }) {
  return (
    <NavLink
      to={item.route}
      end={item.route.split('/').length <= 2}
      className={({ isActive }) =>
        [
          'block rounded-lg px-3 py-2 text-sm transition-colors',
          isActive
            ? 'bg-slate-900 font-medium text-white dark:bg-slate-100 dark:text-slate-900'
            : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
        ].join(' ')
      }
    >
      {item.label}
    </NavLink>
  );
}
