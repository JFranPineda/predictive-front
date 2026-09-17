import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { formatDate, formatNumber } from '@app/i18n/format';
import { Card } from '@shared/ui/Card';
import { EmptyState } from '@shared/ui/EmptyState';
import { ErrorState } from '@shared/ui/ErrorState';
import { Page } from '@shared/ui/Page';
import { PageHeader } from '@shared/ui/PageHeader';
import { Spinner } from '@shared/ui/Spinner';
import { StatusBadge } from '@shared/ui/StatusBadge';

import { useAppSelector } from '@app/hooks';
import { Button } from '@shared/ui/Button';

import { sortByPrecedence } from '../domain/cascade';
import type { ThresholdSet } from '../domain/types';
import { useRetireThresholdSetMutation, useThresholdSetsQuery } from '../infrastructure/endpoints';
import { ThresholdFormModal } from './ThresholdFormModal';

const SCOPE_TONE: Record<string, string> = {
  point: 'bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300',
  equipment: 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300',
  asset_group_kind: 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300',
  equipment_type: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  global: 'bg-slate-100 text-slate-500 dark:bg-slate-800',
};

export default function ThresholdsPage() {
  const { t } = useTranslation(['thresholds', 'common']);
  const [magnitude, setMagnitude] = useState('');
  const permissions = useAppSelector((state) => state.session.permissions);
  const canManage = permissions.includes('thresholds.manage_set');
  const [editing, setEditing] = useState<ThresholdSet | null>(null);
  const [creating, setCreating] = useState(false);
  const { data, isLoading, isError } = useThresholdSetsQuery({});

  if (isLoading) return <Spinner label={t('loading')} />;

  const all = data ?? [];
  const magnitudes = [...new Set(all.map((set) => set.magnitude_code))];
  const rows = sortByPrecedence(
    magnitude ? all.filter((set) => set.magnitude_code === magnitude) : all,
  );

  return (
    <Page>
      <PageHeader
        title={t('title')}
        description={t('subtitle')}
        actions={
          canManage && (
            <Button variant="primary" onClick={() => setCreating(true)}>
              + {t('sets.new')}
            </Button>
          )
        }
      />

      {isError ? (
        <ErrorState title={t('common:state.failed')} body={t('common:state.failedBody')} />
      ) : (
        <Card
          title={t('sets.title')}
          description={t('sets.hint')}
          actions={
            <select
              value={magnitude}
              onChange={(event) => setMagnitude(event.target.value)}
              className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800"
            >
              <option value="">{t('sets.allMagnitudes')}</option>
              {magnitudes.map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </select>
          }
        >
          {rows.length === 0 ? (
            <EmptyState title={t('sets.empty')} />
          ) : (
            <ul className="space-y-3">
              {rows.map((set) => (
                <ThresholdCard
                  key={set.id}
                  set={set}
                  canManage={canManage}
                  onEdit={() => setEditing(set)}
                />
              ))}
            </ul>
          )}
        </Card>
      )}

      {(creating || editing) && (
        <ThresholdFormModal
          set={editing ?? undefined}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
        />
      )}
    </Page>
  );
}

function ThresholdCard({
  set,
  canManage,
  onEdit,
}: {
  set: ThresholdSet;
  canManage: boolean;
  onEdit: () => void;
}) {
  const { t } = useTranslation(['thresholds', 'common']);
  const [retire] = useRetireThresholdSetMutation();
  return (
    <li className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
      <header className="mb-3 flex flex-wrap items-center gap-2 text-sm">
        <span className={`rounded px-2 py-0.5 text-[11px] font-medium ${SCOPE_TONE[set.scope]}`}>
          {t(`scope.${set.scope}`)}
        </span>
        <span className="font-medium">{set.scope_label}</span>
        <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-[11px] dark:bg-slate-800">
          {set.magnitude_code} · {set.unit_code} · {set.aggregation}
        </span>
        {set.standard ? (
          <span className="text-xs text-slate-500">{set.standard.name}</span>
        ) : (
          <span className="text-xs text-sky-600">{t('sets.custom')}</span>
        )}
        {set.machine_class && <span className="text-xs text-slate-400">{set.machine_class}</span>}
        <span className="ml-auto text-xs text-slate-400">
          {t('version', { version: set.version, date: formatDate(set.valid_from) })}
        </span>
        {canManage && (
          <span className="flex gap-2">
            <Button onClick={onEdit}>{t('common:action.edit')}</Button>
            {/* Readings freeze the set that judged them, so a criterion is
                retired, never deleted. */}
            <Button variant="danger" onClick={() => void retire(set.id)}>
              {t('sets.retire')}
            </Button>
          </span>
        )}
      </header>

      <div className="flex flex-wrap gap-x-6 gap-y-2">
        {set.bands.map((band) => (
          <span key={band.status.code} className="flex items-center gap-2">
            <StatusBadge label={band.status.name} color={band.status.color} size="sm" />
            <span className="text-sm tabular-nums text-slate-600 dark:text-slate-400">
              {band.min_value === null ? '−∞' : formatNumber(band.min_value, 1)} …{' '}
              {band.max_value === null ? '+∞' : formatNumber(band.max_value, 1)}
            </span>
          </span>
        ))}
      </div>

      {set.rationale && (
        <p className="mt-3 border-l-2 border-slate-200 pl-3 text-sm text-slate-500 dark:border-slate-700">
          {set.rationale}
          {set.author_name && <span className="text-slate-400"> — {set.author_name}</span>}
        </p>
      )}
    </li>
  );
}
