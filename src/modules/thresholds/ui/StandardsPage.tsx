import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { Card } from '@shared/ui/Card';
import { EmptyState } from '@shared/ui/EmptyState';
import { ErrorState } from '@shared/ui/ErrorState';
import { Metric, MetricRow } from '@shared/ui/Metric';
import { Page } from '@shared/ui/Page';
import { PageHeader } from '@shared/ui/PageHeader';
import { Spinner } from '@shared/ui/Spinner';

import { useStandardsQuery } from '../infrastructure/endpoints';

export default function StandardsPage() {
  const { t } = useTranslation(['thresholds', 'common']);
  const { data, isLoading, isError } = useStandardsQuery();
  if (isLoading) return <Spinner label={t('standards.loading')} />;

  const rows = data ?? [];

  return (
    <Page>
      <PageHeader
        title={t('standards.title')}
        description={t('standards.subtitle')}
        actions={
          <Link
            to="/settings/thresholds"
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm dark:border-slate-700"
          >
            {t('standards.seeThresholds')}
          </Link>
        }
      />

      {isError ? (
        <ErrorState title={t('common:state.failed')} body={t('common:state.failedBody')} />
      ) : rows.length === 0 ? (
        <EmptyState title={t('standards.empty')} />
      ) : (
        <>
          <MetricRow>
            <Metric label={t('standards.metric.total')} value={rows.length} />
            <Metric
              label={t('standards.metric.inUse')}
              value={rows.filter((row) => row.set_count > 0).length}
              hint={t('standards.metric.inUseHint')}
            />
            <Metric
              label={t('standards.metric.classes')}
              value={rows.reduce((sum, row) => sum + row.machine_classes.length, 0)}
            />
          </MetricRow>

          <div className="grid gap-4 lg:grid-cols-2">
            {rows.map((standard) => (
              <Card
                key={standard.id}
                title={standard.name}
                description={standard.source}
                actions={
                  <span className="whitespace-nowrap text-xs text-slate-400">
                    {t('standards.setCount', { count: standard.set_count })}
                  </span>
                }
              >
                <p className="mb-3 font-mono text-[11px] text-slate-400">{standard.code}</p>
                {standard.machine_classes.length > 0 ? (
                  <ul className="space-y-1.5">
                    {standard.machine_classes.map((machineClass) => (
                      <li key={machineClass.code} className="text-sm">
                        <span className="font-medium">{machineClass.name}</span>
                        {machineClass.description && (
                          <span className="text-slate-500"> — {machineClass.description}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-slate-400">{t('standards.noClasses')}</p>
                )}
              </Card>
            ))}
          </div>
        </>
      )}
    </Page>
  );
}
