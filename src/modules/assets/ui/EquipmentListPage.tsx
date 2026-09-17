import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { useAppSelector } from '@app/hooks';
import { Button } from '@shared/ui/Button';

import { Card } from '@shared/ui/Card';
import { DataTable, type Column } from '@shared/ui/DataTable';
import { EmptyState } from '@shared/ui/EmptyState';
import { ErrorState } from '@shared/ui/ErrorState';
import { Metric, MetricRow } from '@shared/ui/Metric';
import { Page } from '@shared/ui/Page';
import { PageHeader } from '@shared/ui/PageHeader';
import { Spinner } from '@shared/ui/Spinner';
import { StatusBadge } from '@shared/ui/StatusBadge';

import { displayStatus, overdueDays } from '../domain/status';
import type { Equipment } from '../domain/types';
import { useAreasQuery, useEquipmentsQuery } from '../infrastructure/endpoints';
import { EquipmentFormModal } from './EquipmentFormModal';

export default function EquipmentListPage() {
  const { t } = useTranslation('assets');
  const [area, setArea] = useState<number | undefined>();
  const [search, setSearch] = useState('');
  const areas = useAreasQuery();
  const equipments = useEquipmentsQuery({ area, search: search || undefined, page_size: 100 });
  const permissions = useAppSelector((state) => state.session.permissions);
  const canManage = permissions.includes('assets.manage_equipment');
  const [creating, setCreating] = useState(false);

  const rows = equipments.data?.results ?? [];
  const totals = useMemo(() => summarise(rows), [rows]);

  const columns: Column<Equipment>[] = [
    {
      key: 'tag',
      header: t('column.tag'),
      render: (row) => (
        <span className="font-mono text-xs font-medium">{row.client_tag || row.asset_code}</span>
      ),
    },
    { key: 'name', header: t('column.equipment'), render: (row) => row.name },
    {
      key: 'group',
      header: t('column.group'),
      render: (row) => <span className="text-slate-500">{row.asset_group.name}</span>,
    },
    {
      key: 'area',
      header: t('column.area'),
      render: (row) => (
        <span className="text-slate-500" title={row.area.name}>
          {row.area.code}
        </span>
      ),
    },
    {
      key: 'frequency',
      header: t('column.frequency'),
      render: (row) => (
        <span className="text-slate-500">{t(`frequency.${row.monitoring_frequency}`)}</span>
      ),
    },
    {
      key: 'status',
      header: t('column.status'),
      render: (row) => {
        const status = displayStatus(row);
        return <StatusBadge label={status.label ?? t('status.notEvaluated')} color={status.color} />;
      },
    },
    {
      key: 'overdue',
      header: t('column.overdue'),
      numeric: true,
      render: (row) => {
        const overdue = overdueDays(row);
        return overdue ? (
          <span className="text-amber-600">{t('overdue', { count: overdue })}</span>
        ) : (
          <span className="text-slate-300">—</span>
        );
      },
    },
    {
      key: 'actions',
      header: '',
      render: (row) => (
        <Link
          to={`/measurements/${row.id}`}
          className="whitespace-nowrap text-xs font-medium text-sky-600"
        >
          {t('openTrend')}
        </Link>
      ),
    },
  ];

  if (equipments.isLoading) return <Spinner label={t('loading')} />;

  return (
    <Page>
      <PageHeader
        title={t('title')}
        description={t('subtitle')}
        actions={
          <>
            <Link
              to="/assets/structure"
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm dark:border-slate-700"
            >
              {t('structure.title')}
            </Link>
            {canManage && (
              <Button variant="primary" onClick={() => setCreating(true)}>
                + {t('new')}
              </Button>
            )}
          </>
        }
      />

      {equipments.isError ? (
        <ErrorState title={t('common:state.failed')} body={t('common:state.failedBody')} />
      ) : (
        <>
          <MetricRow>
            <Metric label={t('metric.total')} value={equipments.data?.count ?? 0} />
            <Metric label={t('metric.alarm')} value={totals.alarm} tone="warn" />
            <Metric label={t('metric.shutdown')} value={totals.shutdown} tone="bad" />
            <Metric
              label={t('metric.notMeasured')}
              value={totals.notMeasured}
              hint={t('metric.notMeasuredHint')}
            />
            <Metric label={t('metric.overdue')} value={totals.overdue} tone="warn" />
          </MetricRow>

          <Card
            title={t('table.title')}
            description={t('table.hint')}
            actions={
              <div className="flex gap-2">
                <select
                  value={area ?? ''}
                  onChange={(event) =>
                    setArea(event.target.value ? Number(event.target.value) : undefined)
                  }
                  className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800"
                >
                  <option value="">{t('filter.allAreas')}</option>
                  {areas.data?.results.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.code} — {item.name} ({item.equipment_count})
                    </option>
                  ))}
                </select>
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={t('filter.search')}
                  className="w-48 rounded-lg border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800"
                />
              </div>
            }
            padded={false}
          >
            <DataTable
              columns={columns}
              rows={rows}
              rowKey={(row) => row.id}
              empty={<div className="p-6"><EmptyState title={t('empty')} /></div>}
            />
          </Card>
        </>
      )}

      {creating && <EquipmentFormModal onClose={() => setCreating(false)} />}
    </Page>
  );
}

function summarise(rows: Equipment[]) {
  return rows.reduce(
    (acc, row) => {
      const status = displayStatus(row);
      if (!status.measured) acc.notMeasured += 1;
      if (row.condition_status?.code === 'alarm') acc.alarm += 1;
      if (row.condition_status?.code === 'shutdown') acc.shutdown += 1;
      if (overdueDays(row)) acc.overdue += 1;
      return acc;
    },
    { alarm: 0, shutdown: 0, notMeasured: 0, overdue: 0 },
  );
}
