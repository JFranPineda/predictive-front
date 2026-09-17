import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { useAppSelector } from '@app/hooks';
import { Button } from '@shared/ui/Button';

import { formatDate } from '@app/i18n/format';
import { Card } from '@shared/ui/Card';
import { DataTable, type Column } from '@shared/ui/DataTable';
import { EmptyState } from '@shared/ui/EmptyState';
import { ErrorState } from '@shared/ui/ErrorState';
import { Metric, MetricRow } from '@shared/ui/Metric';
import { Page } from '@shared/ui/Page';
import { PageHeader } from '@shared/ui/PageHeader';
import { Spinner } from '@shared/ui/Spinner';

import type { ServiceOrder } from '../domain/types';
import { useCancelServiceOrderMutation, useServiceOrdersQuery } from '../infrastructure/endpoints';
import { OrderFormModal } from './OrderFormModal';
import { readServiceError } from './readServiceError';

const STATUS_CLASS: Record<string, string> = {
  planned: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  in_progress: 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300',
  done: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
  cancelled: 'bg-slate-200 text-slate-500 dark:bg-slate-800',
};

export default function ServiceOrdersPage() {
  const { t } = useTranslation(['services', 'common']);
  const { data, isLoading, isError } = useServiceOrdersQuery({});
  const permissions = useAppSelector((state) => state.session.permissions);
  const canManage = permissions.includes('services.manage_order');
  const [cancelOrder] = useCancelServiceOrderMutation();
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rows = data?.results ?? [];
  const columns: Column<ServiceOrder>[] = [
    {
      key: 'code',
      header: t('orders.column.code'),
      render: (row) => <span className="font-mono text-xs font-medium">{row.code}</span>,
    },
    { key: 'technique', header: t('orders.column.technique'), render: (row) => row.technique_name },
    {
      key: 'window',
      header: t('orders.column.window'),
      render: (row) => (
        <span className="text-slate-500">
          {formatDate(row.scheduled_from)} → {formatDate(row.scheduled_to)}
        </span>
      ),
    },
    {
      key: 'lead',
      header: t('orders.column.lead'),
      render: (row) => <span className="text-slate-500">{row.lead_analyst ?? '—'}</span>,
    },
    {
      key: 'clientOrder',
      header: t('orders.column.clientOrder'),
      render: (row) => (
        <span className="font-mono text-xs text-slate-500">{row.client_work_order || '—'}</span>
      ),
    },
    { key: 'visits', header: t('orders.column.visits'), numeric: true, render: (row) => row.visit_count },
    {
      key: 'open',
      header: t('orders.column.open'),
      numeric: true,
      render: (row) =>
        row.open_count > 0 ? (
          <span className="text-amber-600" title={t('orders.openHint')}>
            {row.open_count}
          </span>
        ) : (
          <span className="text-slate-300">—</span>
        ),
    },
    {
      key: 'status',
      header: t('orders.column.status'),
      render: (row) => (
        <span className={`rounded px-2 py-0.5 text-xs ${STATUS_CLASS[row.status] ?? ''}`}>
          {t(`orders.status.${row.status}`)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (row) =>
        canManage && row.status !== 'cancelled' ? (
          <button
            onClick={async () => {
              setError(null);
              try {
                await cancelOrder(row.id).unwrap();
              } catch (cause) {
                setError(readServiceError(cause) ?? t('form.genericError'));
              }
            }}
            className="text-xs font-medium text-red-600"
          >
            {t('orders.cancel')}
          </button>
        ) : null,
    },
  ];

  if (isLoading) return <Spinner label={t('orders.loading')} />;

  return (
    <Page>
      <PageHeader
        title={t('orders.title')}
        description={t('orders.subtitle')}
        actions={
          <>
            <Link
              to="/services/authorship"
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium dark:border-slate-700"
            >
              {t('orders.seeExecution')}
            </Link>
            {canManage && (
              <Button variant="primary" onClick={() => setCreating(true)}>
                + {t('orderForm.new')}
              </Button>
            )}
          </>
        }
      />

      {error && <ErrorState title={error} />}

      {isError ? (
        <ErrorState title={t('common:state.failed')} body={t('common:state.failedBody')} />
      ) : (
        <>
          <MetricRow>
            <Metric label={t('orders.metric.orders')} value={data?.count ?? rows.length} />
            <Metric
              label={t('orders.metric.visits')}
              value={rows.reduce((sum, row) => sum + row.visit_count, 0)}
            />
            <Metric
              label={t('orders.metric.open')}
              value={rows.reduce((sum, row) => sum + row.open_count, 0)}
              hint={t('orders.metric.openHint')}
              tone="warn"
            />
          </MetricRow>

          <Card title={t('orders.table')} padded={false}>
            <DataTable
              columns={columns}
              rows={rows}
              rowKey={(row) => row.id}
              empty={<div className="p-6"><EmptyState title={t('orders.empty')} /></div>}
            />
          </Card>
        </>
      )}

      {creating && <OrderFormModal onClose={() => setCreating(false)} />}
    </Page>
  );
}
