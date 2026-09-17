import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useAppSelector } from '@app/hooks';
import { Button } from '@shared/ui/Button';
import { Card } from '@shared/ui/Card';
import { EmptyState } from '@shared/ui/EmptyState';
import { ErrorState } from '@shared/ui/ErrorState';
import { Page } from '@shared/ui/Page';
import { PageHeader } from '@shared/ui/PageHeader';
import { Spinner } from '@shared/ui/Spinner';

import type { ConditionStatus } from '../domain/types';
import { useConditionStatusesQuery, useUpdateStatusMutation } from '../infrastructure/endpoints';
import { StatusFormModal } from './StatusFormModal';

export default function StatusesPage() {
  const { t } = useTranslation(['thresholds', 'common']);
  const permissions = useAppSelector((state) => state.session.permissions);
  const canManage = permissions.includes('thresholds.manage_status');
  const { data, isLoading, isError } = useConditionStatusesQuery();
  const [creating, setCreating] = useState(false);

  if (isLoading) return <Spinner label={t('statuses.loading')} />;

  const condition = data?.filter((status) => status.kind === 'condition') ?? [];
  const availability = data?.filter((status) => status.kind === 'availability') ?? [];

  return (
    <Page>
      <PageHeader
        title={t('statuses.title')}
        description={t('statuses.subtitle')}
        actions={
          canManage && (
            <Button variant="primary" onClick={() => setCreating(true)}>
              + {t('statuses.new')}
            </Button>
          )
        }
      />

      {isError ? (
        <ErrorState title={t('common:state.failed')} body={t('common:state.failedBody')} />
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card title={t('statuses.condition')} description={t('statuses.conditionHint')}>
            <StatusList rows={condition} canManage={canManage} />
          </Card>
          <Card title={t('statuses.availability')} description={t('statuses.availabilityHint')}>
            <StatusList rows={availability} canManage={canManage} />
          </Card>
        </div>
      )}

      {creating && <StatusFormModal onClose={() => setCreating(false)} />}
    </Page>
  );
}

function StatusList({ rows, canManage }: { rows: ConditionStatus[]; canManage: boolean }) {
  const { t } = useTranslation('thresholds');
  if (rows.length === 0) return <EmptyState title={t('statuses.empty')} />;
  return (
    <ul className="space-y-2">
      {rows.map((status) => (
        <StatusRow key={status.id} status={status} canManage={canManage} />
      ))}
    </ul>
  );
}

function StatusRow({ status, canManage }: { status: ConditionStatus; canManage: boolean }) {
  const { t } = useTranslation('thresholds');
  const [updateStatus, updating] = useUpdateStatusMutation();
  const [color, setColor] = useState(status.color);

  const changed = color.toLowerCase() !== status.color.toLowerCase();

  return (
    <li className="flex items-center gap-3 rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-800">
      {canManage ? (
        <input
          type="color"
          value={color}
          onChange={(event) => setColor(event.target.value)}
          aria-label={t('statuses.color', { name: status.name })}
          className="size-7 shrink-0 cursor-pointer rounded border border-slate-200 bg-transparent dark:border-slate-700"
        />
      ) : (
        <span className="size-5 shrink-0 rounded" style={{ backgroundColor: status.color }} />
      )}

      <span className="min-w-0 flex-1">
        <span className="block font-medium">{status.name}</span>
        <span className="block font-mono text-[11px] text-slate-400">{status.code}</span>
      </span>

      <span className="shrink-0 text-xs text-slate-500">
        {status.kind === 'condition'
          ? t('statuses.severity', { value: status.severity })
          : t(status.measurable ? 'statuses.measurable' : 'statuses.notMeasurable')}
      </span>

      {canManage && changed && (
        <button
          disabled={updating.isLoading}
          onClick={() => void updateStatus({ id: status.id, color })}
          className="shrink-0 rounded-lg bg-slate-900 px-2.5 py-1 text-xs font-medium text-white disabled:opacity-40 dark:bg-slate-100 dark:text-slate-900"
        >
          {t('statuses.save')}
        </button>
      )}
    </li>
  );
}
