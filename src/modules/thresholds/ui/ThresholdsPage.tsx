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
import {
  useRetireThresholdSetMutation,
  useSimulateMutation,
  useThresholdSetsQuery,
} from '../infrastructure/endpoints';
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
  const [scope, setScope] = useState('');
  const permissions = useAppSelector((state) => state.session.permissions);
  const canManage = permissions.includes('thresholds.manage_set');
  const [editing, setEditing] = useState<ThresholdSet | null>(null);
  const [creating, setCreating] = useState(false);
  const { data, isLoading, isError } = useThresholdSetsQuery({});

  if (isLoading) return <Spinner label={t('loading')} />;

  const all = data ?? [];
  const counts = all.reduce<Record<string, number>>((acc, set) => {
    acc[set.magnitude_code] = (acc[set.magnitude_code] ?? 0) + 1;
    return acc;
  }, {});
  const magnitudes = Object.keys(counts).sort();
  const visible = all.filter(
    (set) =>
      (!magnitude || set.magnitude_code === magnitude) && (!scope || set.scope === scope),
  );
  // Grouped by magnitude because that is the unit of competition: several
  // criteria for the same magnitude fight, criteria for different magnitudes
  // never meet. A flat list of twenty-one hides exactly that.
  const groups = magnitudes
    .map((code) => ({
      code,
      sets: sortByPrecedence(visible.filter((set) => set.magnitude_code === code)),
    }))
    .filter((group) => group.sets.length > 0);

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
        <>
          <div className="flex flex-wrap items-center gap-2">
            <FilterChip
              active={!magnitude}
              label={t('sets.allMagnitudes')}
              count={all.length}
              onClick={() => setMagnitude('')}
            />
            {magnitudes.map((code) => (
              <FilterChip
                key={code}
                active={magnitude === code}
                label={code}
                count={counts[code] ?? 0}
                onClick={() => setMagnitude(code)}
              />
            ))}
            <select
              value={scope}
              onChange={(event) => setScope(event.target.value)}
              className="ml-auto rounded-lg border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800"
            >
              <option value="">{t('sets.allScopes')}</option>
              {Object.keys(SCOPE_TONE).map((code) => (
                <option key={code} value={code}>
                  {t(`scope.${code}`, { defaultValue: code })}
                </option>
              ))}
            </select>
          </div>

          {groups.length === 0 ? (
            <Card>
              <EmptyState title={t('sets.empty')} />
            </Card>
          ) : (
            groups.map((group) => (
              <Card
                key={group.code}
                title={group.code}
                description={t('sets.competing', { count: group.sets.length })}
              >
                <ul className="space-y-3">
                  {group.sets.map((set, index) => (
                    <ThresholdCard
                      key={set.id}
                      set={set}
                      rank={index + 1}
                      canManage={canManage}
                      onEdit={() => setEditing(set)}
                    />
                  ))}
                </ul>
              </Card>
            ))
          )}
        </>
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

/** Reads "1º, 2º…" down the cascade: most specific wins. */
function FilterChip({
  active,
  label,
  count,
  onClick,
}: {
  active: boolean;
  label: string;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-xs ${
        active
          ? 'border-sky-500 bg-sky-50 text-sky-800 dark:bg-sky-950 dark:text-sky-200'
          : 'border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300'
      }`}
    >
      {label} <span className="text-slate-400">{count}</span>
    </button>
  );
}

function ThresholdCard({
  set,
  rank,
  canManage,
  onEdit,
}: {
  set: ThresholdSet;
  rank: number;
  canManage: boolean;
  onEdit: () => void;
}) {
  const { t } = useTranslation(['thresholds', 'common']);
  const [retire] = useRetireThresholdSetMutation();
  const [runSimulation] = useSimulateMutation();
  const [impact, setImpact] = useState<string | null>(null);

  async function simulate() {
    setImpact(null);
    try {
      const result = await runSimulation(set.id).unwrap();
      const detail = Object.entries(result.by_status)
        .map(([code, count]) => `${code}: ${count}`)
        .join(' · ');
      setImpact(t('sets.simulateResult', { count: result.changed, detail }));
    } catch {
      setImpact(t('sets.simulateFailed'));
    }
  }
  return (
    <li className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
      {impact && (
        <p className="mb-2 rounded-lg bg-amber-50 p-2 text-xs text-amber-800 dark:bg-amber-950 dark:text-amber-200">
          {impact}
        </p>
      )}
      <header className="mb-3 flex flex-wrap items-center gap-2 text-sm">
        {/* Where this criterion sits in the cascade. "Most specific wins" is
            a rule nobody can apply without seeing the order. */}
        <span
          title={t('sets.rankHint')}
          className="flex size-5 items-center justify-center rounded-full bg-slate-900 text-[11px] font-medium text-white dark:bg-slate-100 dark:text-slate-900"
        >
          {rank}
        </span>
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
            {/* "How many machines change state if I apply this" was
                implemented on the server and never offered. Answering it
                before committing is the difference between a criterion and
                a guess. */}
            <Button onClick={() => void simulate()}>{t('sets.simulate')}</Button>
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
