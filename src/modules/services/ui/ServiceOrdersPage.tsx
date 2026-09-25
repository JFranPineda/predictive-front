import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router-dom';

import { useAppSelector } from '@app/hooks';
import { formatDateRange } from '@app/i18n/format';
import { useDebouncedValue } from '@shared/hooks/useDebouncedValue';
import { Button } from '@shared/ui/Button';
import { Card } from '@shared/ui/Card';
import { DataTable, type Column } from '@shared/ui/DataTable';
import { EmptyState } from '@shared/ui/EmptyState';
import { ErrorState } from '@shared/ui/ErrorState';
import { Metric, MetricRow } from '@shared/ui/Metric';
import { Page } from '@shared/ui/Page';
import { PageHeader } from '@shared/ui/PageHeader';

import { reachableStatuses } from '../domain/orderStatus';
import type { OrderStatus, ServiceOrder, ServiceOrderQuery } from '../domain/types';
import {
  useCancelServiceOrderMutation,
  useServiceOrdersQuery,
  useUpdateServiceOrderMutation,
} from '../infrastructure/endpoints';
import { OrderFormModal } from './OrderFormModal';
import { OrderFilters } from './OrderFilters';
import { readServiceError } from './readServiceError';

const STATUS_CLASS: Record<OrderStatus, string> = {
  planned: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  in_progress: 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300',
  done: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
  cancelled: 'bg-slate-200 text-slate-500 dark:bg-slate-800',
};

/**
 * The service ledger. The search and the filters live in the URL, so a
 * filtered ledger can be shared and the back button returns to it; the totals
 * on top are the server's, over everything the filter matches.
 */
export default function ServiceOrdersPage() {
  const { t } = useTranslation(['services', 'common']);
  const [params, setParams] = useSearchParams();
  const [text, setText] = useState(params.get('q') ?? '');
  const query: ServiceOrderQuery = {
    q: useDebouncedValue(text) || undefined,
    technique: params.get('technique') || undefined,
    status: params.get('status') || undefined,
    from: params.get('from') || undefined,
    to: params.get('to') || undefined,
    page: Number(params.get('page')) || undefined,
  };
  const { data, isFetching, isError } = useServiceOrdersQuery(query);
  const permissions = useAppSelector((state) => state.session.permissions);
  const canManage = permissions.includes('services.manage_order');
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<ServiceOrder | null>(null);
  const [error, setError] = useState<string | null>(null);

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== 'page') next.delete('page');
    setParams(next, { replace: true });
  };
  const onText = (value: string) => {
    setText(value);
    setParam('q', value);
  };
  const clear = () => {
    setText('');
    setParams(new URLSearchParams(), { replace: true });
  };

  const rows = data?.results ?? [];
  const columns = useOrderColumns({
    canManage,
    canChangeStatus: data?.can_change_status ?? false,
    onEdit: setEditing,
    onError: setError,
  });
  const page = query.page ?? 1;

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

      <OrderFilters text={text} onText={onText} params={params} onParam={setParam} onClear={clear} />

      {isError ? (
        <ErrorState title={t('common:state.failed')} body={t('common:state.failedBody')} />
      ) : (
        <>
          <MetricRow>
            <Metric label={t('orders.metric.orders')} value={data?.totals.orders ?? 0} />
            <Metric label={t('orders.metric.visits')} value={data?.totals.visits ?? 0} hint={t('orders.visitsHint')} />
          </MetricRow>

          <Card title={t('orders.table')} padded={false}>
            <DataTable
              columns={columns}
              rows={rows}
              rowKey={(row) => row.id}
              empty={
                <EmptyState
                  title={t(isFetching ? 'orders.loading' : 'orders.empty')}
                  action={
                    params.toString() ? (
                      <Button onClick={clear}>{t('orders.clearFilters')}</Button>
                    ) : undefined
                  }
                />
              }
            />
            {(data?.next || data?.previous) && (
              <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-3 py-2 text-sm dark:border-slate-800">
                <span className="text-slate-500">{t('orders.page', { page })}</span>
                <Button disabled={!data?.previous} onClick={() => setParam('page', String(page - 1))}>
                  ←
                </Button>
                <Button disabled={!data?.next} onClick={() => setParam('page', String(page + 1))}>
                  →
                </Button>
              </div>
            )}
          </Card>
        </>
      )}

      {creating && <OrderFormModal onClose={() => setCreating(false)} />}
      {editing && <OrderFormModal order={editing} onClose={() => setEditing(null)} />}
    </Page>
  );
}

function useOrderColumns({
  canManage,
  canChangeStatus,
  onEdit,
  onError,
}: {
  canManage: boolean;
  canChangeStatus: boolean;
  onEdit: (order: ServiceOrder) => void;
  onError: (message: string | null) => void;
}): Column<ServiceOrder>[] {
  const { t } = useTranslation(['services', 'common']);
  const [update] = useUpdateServiceOrderMutation();
  const [cancelOrder] = useCancelServiceOrderMutation();

  async function run(action: () => Promise<unknown>) {
    onError(null);
    try {
      await action();
    } catch (cause) {
      onError(readServiceError(cause) ?? t('form.genericError'));
    }
  }

  return [
    {
      key: 'code',
      header: t('orders.column.code'),
      render: (row) => <span className="font-mono text-xs font-medium">{row.code}</span>,
    },
    { key: 'technique', header: t('orders.column.technique'), render: (row) => row.technique_name },
    {
      key: 'serviceDate',
      header: t('orders.column.serviceDate'),
      render: (row) => (
        <span className="whitespace-nowrap text-slate-500">
          {formatDateRange(row.scheduled_from, row.scheduled_to)}
        </span>
      ),
    },
    {
      key: 'provider',
      header: t('orders.column.provider'),
      render: (row) => <span className="text-slate-500">{row.provider?.name ?? '—'}</span>,
    },
    {
      key: 'clientOrder',
      header: t('orders.column.clientOrder'),
      render: (row) => (
        <span className="font-mono text-xs text-slate-500">{row.client_work_order || '—'}</span>
      ),
    },
    {
      key: 'visits',
      header: t('orders.column.visits'),
      headerHint: t('orders.visitsHint'),
      numeric: true,
      render: (row) => row.visit_count,
    },
    {
      key: 'status',
      header: t('orders.column.status'),
      render: (row) =>
        canChangeStatus && row.status !== 'cancelled' ? (
          <select
            value={row.status}
            aria-label={t('orders.column.status')}
            onChange={(event) =>
              void run(() =>
                update({ id: row.id, status: event.target.value as OrderStatus }).unwrap(),
              )
            }
            className={`rounded px-1.5 py-0.5 text-xs ${STATUS_CLASS[row.status]}`}
          >
            {reachableStatuses(row.status).map((status) => (
              <option key={status} value={status}>
                {t(`orders.status.${status}`)}
              </option>
            ))}
          </select>
        ) : (
          <span className={`rounded px-2 py-0.5 text-xs ${STATUS_CLASS[row.status]}`}>
            {t(`orders.status.${row.status}`)}
          </span>
        ),
    },
    {
      key: 'actions',
      header: '',
      render: (row) =>
        canManage && row.status !== 'cancelled' ? (
          <span className="flex gap-3">
            <button onClick={() => onEdit(row)} className="text-xs font-medium text-sky-600">
              {t('common:action.edit')}
            </button>
            {canChangeStatus && (
              <button
                onClick={() => void run(() => cancelOrder(row.id).unwrap())}
                className="text-xs font-medium text-red-600"
              >
                {t('orders.cancel')}
              </button>
            )}
          </span>
        ) : null,
    },
  ];
}
