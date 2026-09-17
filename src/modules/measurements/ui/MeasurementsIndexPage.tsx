import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { useEquipmentsQuery, type Equipment } from '@modules/assets';
import { useMagnitudesQuery, useTechniquesQuery } from '@modules/thresholds';
import { Card } from '@shared/ui/Card';
import { DataTable, type Column } from '@shared/ui/DataTable';
import { EmptyState } from '@shared/ui/EmptyState';
import { ErrorState } from '@shared/ui/ErrorState';
import { Metric, MetricRow } from '@shared/ui/Metric';
import { Page } from '@shared/ui/Page';
import { PageHeader } from '@shared/ui/PageHeader';
import { Spinner } from '@shared/ui/Spinner';
import { StatusBadge } from '@shared/ui/StatusBadge';

/**
 * Measurements, organised by service.
 *
 * The screen used to be one flat list of equipment, which told nobody what a
 * vibration round captures versus a thermography one. Picking the service
 * first shows its format — what is measured, what evidence it produces — and
 * then the equipment it applies to.
 */
export default function MeasurementsIndexPage() {
  const { t } = useTranslation(['measurements', 'common', 'media']);
  const navigate = useNavigate();
  const [technique, setTechnique] = useState('vibration');
  const [search, setSearch] = useState('');
  const techniques = useTechniquesQuery();
  const magnitudes = useMagnitudesQuery();
  const { data, isLoading, isError } = useEquipmentsQuery({
    search: search || undefined,
    page_size: 100,
  });

  const format = useMemo(
    () => (magnitudes.data ?? []).filter((row) => row.technique_code === technique),
    [magnitudes.data, technique],
  );

  const columns: Column<Equipment>[] = [
    {
      key: 'tag',
      header: t('index.column.tag'),
      render: (row) => (
        <span className="font-mono text-xs font-medium">{row.client_tag || row.asset_code}</span>
      ),
    },
    { key: 'name', header: t('index.column.equipment'), render: (row) => row.name },
    {
      key: 'group',
      header: t('index.column.group'),
      render: (row) => <span className="text-slate-500">{row.asset_group.name}</span>,
    },
    {
      key: 'area',
      header: t('index.column.area'),
      render: (row) => <span className="text-slate-500">{row.area.code}</span>,
    },
    {
      key: 'status',
      header: t('index.column.status'),
      render: (row) =>
        row.condition_status ? (
          <StatusBadge label={row.condition_status.name} color={row.condition_status.color} />
        ) : (
          <span className="text-slate-300">—</span>
        ),
    },
    {
      key: 'open',
      header: '',
      render: () => <span className="text-xs font-medium text-sky-600">{t('index.open')} →</span>,
    },
  ];

  if (isLoading) return <Spinner label={t('index.loading')} />;

  const rows = data?.results ?? [];
  const activeTechnique = techniques.data?.find((row) => row.code === technique);

  return (
    <Page>
      <PageHeader title={t('index.title')} description={t('index.subtitle')}>
        <div className="flex flex-wrap gap-2">
          {techniques.data?.map((row) => (
            <button
              key={row.code}
              onClick={() => setTechnique(row.code)}
              className={[
                'rounded-lg px-3 py-1.5 text-sm',
                row.code === technique
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                  : 'border border-slate-300 dark:border-slate-700',
              ].join(' ')}
            >
              {row.name}
            </button>
          ))}
        </div>
      </PageHeader>

      {isError ? (
        <ErrorState title={t('common:state.failed')} body={t('common:state.failedBody')} />
      ) : (
        <>
          <MetricRow>
            <Metric label={t('index.metric.equipment')} value={data?.count ?? rows.length} />
            <Metric
              label={t('index.metric.magnitudes')}
              value={format.length}
              hint={format.map((row) => row.unit_code).join(' · ')}
            />
            <Metric
              label={t('index.metric.areas')}
              value={new Set(rows.map((row) => row.area.code)).size}
            />
          </MetricRow>

          <Card
            title={t('index.format', { service: activeTechnique?.name ?? technique })}
            description={t('index.formatHint', {
              evidence: t(`media:captures.${technique}`, {
                defaultValue: t('media:captures.maintenance'),
              }).toLowerCase(),
            })}
          >
            {format.length === 0 ? (
              <EmptyState title={t('index.noMagnitudes')} body={t('index.noMagnitudesHint')} />
            ) : (
              <ul className="flex flex-wrap gap-2">
                {format.map((magnitude) => (
                  <li
                    key={magnitude.code}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm dark:border-slate-700"
                  >
                    <span className="font-medium">{magnitude.name}</span>
                    <span className="ml-2 text-xs text-slate-400">
                      {magnitude.unit_code} · {magnitude.aggregation}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card
            title={t('index.pick')}
            actions={
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t('index.search')}
                className="w-56 rounded-lg border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800"
              />
            }
            padded={false}
          >
            <DataTable
              columns={columns}
              rows={rows}
              rowKey={(row) => row.id}
              onRowClick={(row) => navigate(`/measurements/${row.id}`)}
              empty={<div className="p-6"><EmptyState title={t('index.empty')} /></div>}
            />
          </Card>
        </>
      )}
    </Page>
  );
}
