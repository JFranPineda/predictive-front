import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { formatDate } from '@app/i18n/format';
import { useMagnitudesQuery, useTechniquesQuery } from '@modules/thresholds';
import { useDebouncedValue } from '@shared/hooks/useDebouncedValue';
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

import type { MeasurementTrain, TrainOrder } from '../domain/trains';
import { useMeasurementTrainsQuery } from '../infrastructure/endpoints';

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
  const [order, setOrder] = useState<TrainOrder>('name');
  const [offset, setOffset] = useState<number | undefined>();
  const techniques = useTechniquesQuery();
  const magnitudes = useMagnitudesQuery();
  const query = { technique, q: useDebouncedValue(search) || undefined, order };
  const { data, isLoading, isFetching, isError } = useMeasurementTrainsQuery({ ...query, offset });

  const format = useMemo(
    () => (magnitudes.data ?? []).filter((row) => row.technique_code === technique),
    [magnitudes.data, technique],
  );

  const columns: Column<MeasurementTrain>[] = [
    { key: 'group', header: t('index.column.group'), render: (row) => <span className="font-medium">{row.name}</span> },
    {
      key: 'kind',
      header: t('index.column.kind'),
      render: (row) => <span className="text-slate-500">{row.kind || '—'}</span>,
    },
    {
      key: 'area',
      header: t('index.column.area'),
      render: (row) => (
        <span className="text-slate-500" title={row.area.name}>
          {row.area.code}
        </span>
      ),
    },
    {
      key: 'status',
      header: t('index.column.status'),
      render: (row) => <StatusBadge label={row.status.name} color={row.status.color} />,
    },
    {
      key: 'points',
      header: t('index.column.points'),
      numeric: true,
      render: (row) => row.measured_points,
    },
    {
      key: 'lastIntervention',
      header: t('index.column.lastIntervention'),
      headerHint: t('index.lastInterventionHint'),
      render: (row) =>
        row.last_intervention ? (
          <span
            className="whitespace-nowrap"
            title={t('index.interventionBy', {
              what: row.last_intervention.what,
              who: row.last_intervention.who || '—',
            })}
          >
            {formatDate(row.last_intervention.at)}
          </span>
        ) : (
          <span className="text-slate-300">—</span>
        ),
    },
    {
      key: 'open',
      header: '',
      render: () => (
        <span className="whitespace-nowrap text-xs font-medium text-sky-600">{t('index.open')} →</span>
      ),
    },
  ];

  const pick = (next: string) => {
    setTechnique(next);
    setOffset(undefined);
  };

  if (isLoading) return <Spinner label={t('index.loading')} />;

  const rows = data?.items ?? [];
  const activeTechnique = techniques.data?.find((row) => row.code === technique);

  return (
    <Page>
      <PageHeader title={t('index.title')} description={t('index.subtitle')}>
        <div className="flex flex-wrap gap-2">
          {techniques.data?.map((row) => (
            <button
              key={row.code}
              onClick={() => pick(row.code)}
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
            <Metric label={t('index.metric.trains')} value={data?.count ?? 0} />
            <Metric
              label={t('index.metric.magnitudes')}
              value={format.length}
              hint={format.map((row) => row.unit_code).join(' · ')}
            />
            <Metric label={t('index.metric.areas')} value={data?.areas ?? 0} />
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
              <div className="flex flex-wrap gap-2">
                <select
                  value={order}
                  aria-label={t('index.order')}
                  onChange={(event) => {
                    setOrder(event.target.value as TrainOrder);
                    setOffset(undefined);
                  }}
                  className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800"
                >
                  <option value="name">{t('index.byName')}</option>
                  <option value="last_intervention">{t('index.byIntervention')}</option>
                </select>
                <input
                  type="search"
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setOffset(undefined);
                  }}
                  placeholder={t('index.search')}
                  aria-label={t('index.search')}
                  className="w-56 rounded-lg border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800"
                />
              </div>
            }
            padded={false}
          >
            <DataTable
              columns={columns}
              rows={rows}
              rowKey={(row) => row.id}
              onRowClick={(row) => void navigate(`/measurements/groups/${row.id}`)}
              empty={<div className="p-6"><EmptyState title={t('index.empty')} /></div>}
            />
            {data?.next_offset && (
              <div className="border-t border-slate-100 p-3 text-center dark:border-slate-800">
                <Button disabled={isFetching} onClick={() => setOffset(data.next_offset ?? undefined)}>
                  {t('index.more')}
                </Button>
              </div>
            )}
          </Card>
        </>
      )}
    </Page>
  );
}
