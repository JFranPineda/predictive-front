import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router-dom';

import { useAppSelector } from '@app/hooks';
import { useDebouncedValue } from '@shared/hooks/useDebouncedValue';
import { Button } from '@shared/ui/Button';
import { Card } from '@shared/ui/Card';
import { EmptyState } from '@shared/ui/EmptyState';
import { ErrorState } from '@shared/ui/ErrorState';
import { Metric, MetricRow } from '@shared/ui/Metric';
import { Page } from '@shared/ui/Page';
import { PageHeader } from '@shared/ui/PageHeader';
import { Spinner } from '@shared/ui/Spinner';

import type { Equipment, TrainQuery } from '../domain/types';
import { useTrainOverviewQuery } from '../infrastructure/endpoints';
import { EquipmentFormModal } from './EquipmentFormModal';
import { TrainFilters } from './TrainFilters';
import { TrainTable } from './TrainTable';

/**
 * Activos: one row per train, its machines inside (V3-05).
 *
 * The plant is read by train — the motor and the pump it drives — so looking
 * a train up used to mean finding two or three rows. Filters run on the
 * server over the whole plant; the numbers on top describe what matched.
 */
export default function TrainListPage() {
  const { t } = useTranslation(['assets', 'common']);
  const [params, setParams] = useSearchParams();
  const [text, setText] = useState(params.get('q') ?? '');
  const [cursor, setCursor] = useState<string | undefined>();
  const query: TrainQuery = {
    q: useDebouncedValue(text) || undefined,
    area: params.get('area') || undefined,
    kind: params.get('kind') || undefined,
    type: params.get('type') || undefined,
    status: params.get('status') || undefined,
  };
  const { data, isLoading, isFetching, isError } = useTrainOverviewQuery({ ...query, cursor });
  const permissions = useAppSelector((state) => state.session.permissions);
  const canManage = permissions.includes('assets.manage_equipment');
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Equipment | null>(null);

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
    setCursor(undefined);
  };
  const onText = (value: string) => {
    setText(value);
    setParam('q', value);
  };
  const clear = () => {
    setText('');
    setCursor(undefined);
    setParams(new URLSearchParams(), { replace: true });
  };

  if (isLoading) return <Spinner label={t('loading')} />;

  const totals = data?.totals;
  return (
    <Page>
      <PageHeader
        title={t('trains.title')}
        description={t('trains.subtitle')}
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

      <TrainFilters text={text} onText={onText} params={params} onParam={setParam} onClear={clear} />

      {isError ? (
        <ErrorState title={t('common:state.failed')} body={t('common:state.failedBody')} />
      ) : (
        <>
          <MetricRow>
            <Metric label={t('trains.metric.trains')} value={totals?.trains ?? 0} />
            <Metric label={t('metric.alarm')} value={totals?.alarm ?? 0} tone="warn" />
            <Metric label={t('metric.shutdown')} value={totals?.shutdown ?? 0} tone="bad" />
            <Metric
              label={t('metric.notMeasured')}
              value={totals?.not_measured ?? 0}
              hint={t('metric.notMeasuredHint')}
            />
          </MetricRow>

          <Card title={t('trains.table')} description={t('table.hint')} padded={false}>
            {(data?.items.length ?? 0) === 0 ? (
              <div className="p-6">
                <EmptyState
                  title={t(isFetching ? 'loading' : 'trains.empty')}
                  action={params.toString() ? <Button onClick={clear}>{t('trains.clear')}</Button> : undefined}
                />
              </div>
            ) : (
              <TrainTable
                rows={data?.items ?? []}
                // A search is usually for one machine: show it without a click.
                expandAll={Boolean(query.q)}
                canManage={canManage}
                onEdit={setEditing}
              />
            )}
            {data?.next_cursor && (
              <div className="border-t border-slate-100 p-3 text-center dark:border-slate-800">
                <Button disabled={isFetching} onClick={() => setCursor(data.next_cursor ?? undefined)}>
                  {t('trains.more')}
                </Button>
              </div>
            )}
          </Card>
        </>
      )}

      {creating && <EquipmentFormModal onClose={() => setCreating(false)} />}
      {editing && <EquipmentFormModal equipment={editing} onClose={() => setEditing(null)} />}
    </Page>
  );
}
