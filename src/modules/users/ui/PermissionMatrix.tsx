import clsx from 'clsx';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { TextInput } from '@shared/ui/Form';

import { ACTION_ORDER, type RoleCatalogue } from '../domain/roles';

type Module = RoleCatalogue['modules'][number];

/**
 * A role's permissions, module by module.
 *
 * Sixty checkboxes are only readable if you can find one, see at a glance
 * how much of a module a role holds, and grant or take a whole module in one
 * click — which is how an administrator thinks about it ("the technician
 * gets UT en rodillos").
 */
export function PermissionMatrix({
  modules,
  granted,
  editable,
  onChange,
}: {
  modules: Module[];
  granted: Set<string>;
  editable: boolean;
  onChange: (next: Set<string>) => void;
}) {
  const { t } = useTranslation('users');
  const [search, setSearch] = useState('');
  const [onlyGranted, setOnlyGranted] = useState(false);

  const shown = useMemo(() => {
    const term = search.trim().toLowerCase();
    return modules
      .map((module) => ({
        module,
        permissions: [...module.permissions]
          .sort(
            (a, b) =>
              ACTION_ORDER.indexOf(a.action as (typeof ACTION_ORDER)[number]) -
              ACTION_ORDER.indexOf(b.action as (typeof ACTION_ORDER)[number]),
          )
          .filter((permission) => !onlyGranted || granted.has(permission.code))
          .filter(
            (permission) =>
              !term ||
              [permission.description, permission.code, module.name].join(' ').toLowerCase().includes(term),
          ),
      }))
      .filter((row) => row.permissions.length > 0);
  }, [modules, search, onlyGranted, granted]);

  function setMany(codes: string[], on: boolean) {
    const next = new Set(granted);
    for (const code of codes) {
      if (on) next.add(code);
      else next.delete(code);
    }
    onChange(next);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <TextInput
          type="search"
          value={search}
          placeholder={t('roles.searchHint')}
          aria-label={t('roles.search')}
          onChange={(event) => setSearch(event.target.value)}
          className="max-w-sm"
        />
        <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
          <input type="checkbox" checked={onlyGranted} onChange={(event) => setOnlyGranted(event.target.checked)} />
          {t('roles.onlyGranted')}
        </label>
      </div>

      {shown.length === 0 && <p className="text-sm text-slate-500">{t('roles.noMatch')}</p>}

      {shown.map(({ module, permissions }) => {
        const codes = module.permissions.map((permission) => permission.code);
        const held = codes.filter((code) => granted.has(code)).length;
        return (
          <section key={module.code} className="rounded-lg border border-slate-200 dark:border-slate-800">
            <header className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-3 py-2 dark:border-slate-800">
              <h3 className="flex-1 text-sm font-medium">{t(`module.${module.code}`, { defaultValue: module.name })}</h3>
              <span
                className={clsx(
                  'rounded-full px-2 py-0.5 text-[11px] font-medium tabular-nums',
                  held === 0
                    ? 'bg-slate-100 text-slate-500 dark:bg-slate-800'
                    : held === codes.length
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      : 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300',
                )}
              >
                {t('roles.heldOf', { held, total: codes.length })}
              </span>
              {editable && (
                <span className="flex gap-1 text-xs">
                  <button
                    type="button"
                    disabled={held === codes.length}
                    onClick={() => setMany(codes, true)}
                    className="rounded px-2 py-0.5 text-sky-700 hover:bg-sky-50 disabled:text-slate-300 dark:text-sky-300 dark:hover:bg-sky-950"
                  >
                    {t('roles.all')}
                  </button>
                  <button
                    type="button"
                    disabled={held === 0}
                    onClick={() => setMany(codes, false)}
                    className="rounded px-2 py-0.5 text-slate-600 hover:bg-slate-100 disabled:text-slate-300 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    {t('roles.none')}
                  </button>
                </span>
              )}
            </header>
            <div className="grid gap-x-6 gap-y-1.5 p-3 sm:grid-cols-2 lg:grid-cols-3">
              {permissions.map((permission) => (
                <label key={permission.code} className="flex items-start gap-2 text-sm" title={permission.code}>
                  <input
                    type="checkbox"
                    disabled={!editable}
                    checked={granted.has(permission.code)}
                    onChange={(event) => setMany([permission.code], event.target.checked)}
                    className="mt-0.5"
                  />
                  <span className="min-w-0">
                    <span className="block leading-tight">{permission.description}</span>
                    <span className="block text-[11px] text-slate-400">{t(`roles.action.${permission.action}`)}</span>
                  </span>
                </label>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
