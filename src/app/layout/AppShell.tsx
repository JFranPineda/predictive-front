import clsx from 'clsx';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, Outlet, useLocation } from 'react-router-dom';

import { useAppDispatch } from '@app/hooks';
import { SessionGuard } from '@app/session/SessionGuard';
import { loggedOut } from '@app/session/sessionSlice';
import type { Bootstrap } from '@app/session/sessionApi';
import type { MenuEntry } from '@app/session/sessionSlice';
import { ThemeToggle } from '@shared/ui/ThemeToggle';

import { activeMenuRoute } from './activeMenu';
import { BackButton } from './BackButton';
import { BrandLogo } from './BrandLogo';
import { PlanNotice } from './PlanNotice';

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
  const { pathname } = useLocation();
  const active = activeMenuRoute(
    pathname,
    menu.map((item) => item.route),
  );
  // Below `lg` the menu is a drawer: a tablet in the plant cannot spare a
  // quarter of its width to a list of thirty links.
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState('');
  useEffect(() => setOpen(false), [pathname]);

  const term = filter.trim().toLowerCase();
  const matches = (item: MenuEntry) => !term || item.label.toLowerCase().includes(term);
  const shownTop = topLevel.filter(matches);
  const shownSettings = settings.filter(matches);
  const current = menu.find((item) => item.route === active);

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      {open && (
        <div
          aria-hidden="true"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-30 bg-slate-900/40 backdrop-blur-sm lg:hidden"
        />
      )}
      <aside
        className={clsx(
          'fixed inset-y-0 left-0 z-40 flex w-72 shrink-0 flex-col border-r border-slate-200 bg-white transition-transform dark:border-slate-800 dark:bg-slate-900 lg:static lg:w-64 lg:translate-x-0',
          open ? 'translate-x-0 shadow-xl' : '-translate-x-full',
        )}
      >
        <div className="px-5 py-5">
          <BrandLogo className="w-full" />
          {company && <p className="mt-2 truncate text-xs text-slate-500">{company.name}</p>}
        </div>

        {/* Thirty entries are found faster by typing two letters than by reading. */}
        {menu.length > 10 && (
          <div className="px-3 pb-2">
            <input
              type="search"
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              onKeyDown={(event) => event.key === 'Escape' && setFilter('')}
              placeholder={t('nav.search')}
              aria-label={t('nav.search')}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-400 dark:border-slate-700 dark:bg-slate-800"
            />
          </div>
        )}

        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3">
          {shownTop.map((item) => (
            <MenuLink key={item.route} item={item} active={item.route === active} />
          ))}

          {shownSettings.length > 0 && (
            <>
              <p className="px-3 pb-1 pt-5 text-[11px] font-medium uppercase tracking-wider text-slate-400">
                {t('nav.settings')}
              </p>
              {shownSettings.map((item) => (
                <MenuLink key={item.route} item={item} active={item.route === active} />
              ))}
            </>
          )}
          {shownTop.length === 0 && shownSettings.length === 0 && (
            <p className="px-3 py-2 text-sm text-slate-500">{t('nav.noMatch')}</p>
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
            onClick={() => dispatch(loggedOut('signed_out'))}
            className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            {t('auth.signOut')}
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <div className="sticky top-0 z-20 flex items-center gap-3 border-b border-slate-200 bg-white/90 px-4 py-2 backdrop-blur lg:hidden dark:border-slate-800 dark:bg-slate-900/90">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label={t('nav.open')}
            className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-lg leading-none dark:border-slate-700"
          >
            ☰
          </button>
          <span className="truncate text-sm font-medium">{current?.label ?? company?.name}</span>
        </div>
        {/* Same frame as <Page>, so the button lines up with the title below. */}
        <div className="mx-auto max-w-7xl px-4 pt-4 empty:hidden sm:px-6 lg:px-8">
          <PlanNotice />
          <BackButton menuRoutes={menu.map((item) => item.route)} />
        </div>
        <Outlet />
      </main>
      <SessionGuard />
    </div>
  );
}

function MenuLink({ item, active }: { item: MenuEntry; active: boolean }) {
  return (
    <Link
      to={item.route}
      aria-current={active ? 'page' : undefined}
      className={[
        'block rounded-lg px-3 py-2 text-sm transition-colors',
        active
          ? 'bg-slate-900 font-medium text-white dark:bg-slate-100 dark:text-slate-900'
          : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
      ].join(' ')}
    >
      {item.label}
    </Link>
  );
}
