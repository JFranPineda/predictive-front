import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { useAppSelector } from '@app/hooks';
import { useTableFilter, type FilterSpec } from '@shared/hooks/useTableFilter';
import { Button } from '@shared/ui/Button';
import { TableToolbar } from '@shared/ui/TableToolbar';

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
import { useEquipmentsQuery } from '../infrastructure/endpoints';
import { EquipmentFormModal } from './EquipmentFormModal';

export default function EquipmentListPage() {
  const { t } = useTranslation('assets');
  const equipments = useEquipmentsQuery({ page_size: 200 });
  const permissions = useAppSelector((state) => state.session.permissions);
  const canManage = permissions.includes('assets.manage_equipment');
  const [creating, setCreating] = useState(false);

  const loaded = useMemo(() => equipments.data?.results ?? [], [equipments.data]);
  const specs = useMemo<FilterSpec<Equipment>[]>(
    () => [
      { key: 'area', label: t('filter.allAreas'), valueOf: (row) => row.area.code },
      {
        key: 'type',
        label: t('filter.allTypes'),
        valueOf: (row) => row.equipment_type,
        labelOf: (value) => t(`type.${value}`, { defaultValue: value }),
      },
      {
        key: 'status',
        label: t('filter.allStatuses'),
        valueOf: (row) => row.condition_status?.code ?? null,
        labelOf: (value) =>
          loaded.find((row) => row.condition_status?.code === value)?.condition_status?.name ??
          value,
      },
    ],
    [t, loaded],
  );
  const table = useTableFilter(
    loaded,
    (row) => `${row.client_tag} ${row.asset_code} ${row.name} ${row.asset_group.name} ${row.area.code}`,
    specs,
  );
  const rows = table.filtered;
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
            <Metric label={t('metric.total')} value={rows.length} />
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
              <TableToolbar
                query={table.query}
                onQuery={table.setQuery}
                placeholder={t('filter.search')}
                filters={specs.map((spec) => ({
                  key: spec.key,
                  label: spec.label,
                  options: table.options[spec.key] ?? [],
                }))}
                active={table.active}
                onFilter={table.setFilter}
                onClear={table.clear}
                activeCount={table.activeCount}
                total={loaded.length}
                shown={rows.length}
              />
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
