import { useTranslation } from 'react-i18next';

import type { ModuleSummary } from '@app/session/sessionSlice';
import { ErrorState } from '@shared/ui/ErrorState';
import { Metric, MetricRow } from '@shared/ui/Metric';
import { Page } from '@shared/ui/Page';
import { PageHeader } from '@shared/ui/PageHeader';
import { Spinner } from '@shared/ui/Spinner';

import {
  useInstallModuleMutation,
  useModulesQuery,
  useUninstallModuleMutation,
  useUpgradeModuleMutation,
} from '../infrastructure/endpoints';

export default function ModulesPage() {
  const { t } = useTranslation(['modules', 'common']);
  const { data, isLoading, isError } = useModulesQuery();
  if (isLoading) return <Spinner label={t('loading')} />;

  const modules = data ?? [];
  const installed = modules.filter((module) => module.state === 'installed');
  const byCategory = groupBy(modules, (module) => module.category);

  return (
    <Page>
      <PageHeader title={t('title')} description={t('subtitle')} />

      {isError ? (
        <ErrorState title={t('common:state.failed')} body={t('common:state.failedBody')} />
      ) : (
        <>
          <MetricRow>
            <Metric label={t('metric.installed')} value={installed.length} />
            <Metric label={t('metric.available')} value={modules.length - installed.length} />
            <Metric
              label={t('metric.upgradable')}
              value={modules.filter((module) => module.upgradable).length}
              tone={modules.some((module) => module.upgradable) ? 'warn' : 'neutral'}
            />
          </MetricRow>

          {Object.entries(byCategory).map(([category, rows]) => (
            <section key={category} className="space-y-3">
              <h2 className="text-xs font-medium uppercase tracking-wider text-slate-400">
                {category}
              </h2>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {rows.map((module) => (
                  <ModuleCard key={module.code} module={module} />
                ))}
              </div>
            </section>
          ))}
        </>
      )}
    </Page>
  );
}

function ModuleCard({ module }: { module: ModuleSummary }) {
  const { t } = useTranslation(['modules', 'common']);
  const [install, installing] = useInstallModuleMutation();
  const [uninstall, uninstalling] = useUninstallModuleMutation();
  const [upgrade] = useUpgradeModuleMutation();
  const busy = installing.isLoading || uninstalling.isLoading;
  const blocked = module.missing_depends.length > 0;
  const isInstalled = module.state === 'installed';

  return (
    <article className="flex flex-col rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <header className="mb-1 flex flex-wrap items-center gap-2">
        <h3 className="font-medium">{module.name}</h3>
        <span className="font-mono text-[11px] text-slate-400">v{module.version}</span>
        {module.is_core && (
          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] uppercase text-slate-500 dark:bg-slate-800">
            {t('core')}
          </span>
        )}
        <span
          className={`ml-auto rounded px-1.5 py-0.5 text-[10px] uppercase ${
            isInstalled
              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
              : 'bg-slate-100 text-slate-500 dark:bg-slate-800'
          }`}
        >
          {t(isInstalled ? 'state.installed' : 'state.available')}
        </span>
      </header>

      <p className="mb-3 flex-1 text-sm leading-relaxed text-slate-500">{module.summary}</p>

      {module.depends.length > 0 && (
        <p className="mb-2 text-xs text-slate-400">
          {t('requires', { list: module.depends.join(', ') })}
        </p>
      )}
      {blocked && (
        <p className="mb-2 text-xs text-amber-600">
          {t('missing', { list: module.missing_depends.join(', ') })}
        </p>
      )}

      <footer className="flex gap-2">
        {isInstalled ? (
          <>
            {module.upgradable && (
              <button
                onClick={() => void upgrade(module.code)}
                className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-medium text-white"
              >
                {t('common:action.upgrade')}
              </button>
            )}
            <button
              disabled={busy || module.is_core}
              title={module.is_core ? t('coreLocked') : undefined}
              onClick={() => void uninstall(module.code)}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium disabled:opacity-40 dark:border-slate-700"
            >
              {t('common:action.uninstall')}
            </button>
          </>
        ) : (
          <button
            disabled={busy || blocked}
            onClick={() => void install(module.code)}
            className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40 dark:bg-slate-100 dark:text-slate-900"
          >
            {t('common:action.install')}
          </button>
        )}
      </footer>
    </article>
  );
}

function groupBy<T>(items: T[], key: (item: T) => string): Record<string, T[]> {
  return items.reduce<Record<string, T[]>>((acc, item) => {
    (acc[key(item)] ??= []).push(item);
    return acc;
  }, {});
}
