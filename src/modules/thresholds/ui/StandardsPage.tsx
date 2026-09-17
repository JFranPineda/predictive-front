import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { useAppSelector } from '@app/hooks';
import { Button } from '@shared/ui/Button';

import { Card } from '@shared/ui/Card';
import { EmptyState } from '@shared/ui/EmptyState';
import { ErrorState } from '@shared/ui/ErrorState';
import { Metric, MetricRow } from '@shared/ui/Metric';
import { Page } from '@shared/ui/Page';
import { PageHeader } from '@shared/ui/PageHeader';
import { Spinner } from '@shared/ui/Spinner';

import type { Standard } from '../domain/types';
import { useDeleteStandardMutation, useStandardsQuery } from '../infrastructure/endpoints';
import { StandardFormModal } from './StandardFormModal';

export default function StandardsPage() {
  const { t } = useTranslation(['thresholds', 'common']);
  const permissions = useAppSelector((state) => state.session.permissions);
  const canManage = permissions.includes('thresholds.manage_standard');
  const { data, isLoading, isError } = useStandardsQuery();
  const [deleteStandard] = useDeleteStandardMutation();
  const [editing, setEditing] = useState<Standard | null>(null);
  const [creating, setCreating] = useState(false);

  if (isLoading) return <Spinner label={t('standards.loading')} />;

  const rows = data ?? [];

  return (
    <Page>
      <PageHeader
        title={t('standards.title')}
        description={t('standards.subtitle')}
        actions={
          <>
            <Link
              to="/settings/thresholds"
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm dark:border-slate-700"
            >
              {t('standards.seeThresholds')}
            </Link>
            {canManage && (
              <Button variant="primary" onClick={() => setCreating(true)}>
                + {t('standards.new')}
              </Button>
            )}
          </>
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
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="whitespace-nowrap text-xs text-slate-400">
                      {t('standards.setCount', { count: standard.set_count })}
                    </span>
                    {canManage && (
                      <>
                        <Button onClick={() => setEditing(standard)}>
                          {t('common:action.edit')}
                        </Button>
                        {!standard.is_builtin && standard.set_count === 0 && (
                          <Button
                            variant="danger"
                            onClick={() => void deleteStandard(standard.id)}
                          >
                            {t('common:action.delete')}
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                }
              >
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[11px] text-slate-400">{standard.code}</span>
                  {/* Which service types this standard is allowed to judge. */}
                  {standard.techniques.length > 0 ? (
                    standard.techniques.map((technique) => (
                      <span
                        key={technique.code}
                        className="rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-medium text-sky-800 dark:bg-sky-950 dark:text-sky-300"
                      >
                        {technique.name}
                      </span>
                    ))
                  ) : (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500 dark:bg-slate-800">
                      {t('standards.anyTechnique')}
                    </span>
                  )}
                </div>
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

      {(creating || editing) && (
        <StandardFormModal
          standard={editing ?? undefined}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
        />
      )}
    </Page>
  );
}
