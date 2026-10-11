import clsx from 'clsx';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useAppSelector, useInstalled } from '@app/hooks';
import { formatDate, formatNumber } from '@app/i18n/format';
import { useConfirm, useToast } from '@shared/feedback/FeedbackProvider';
import { readError } from '@shared/lib/apiError';
import { Button } from '@shared/ui/Button';
import { Card } from '@shared/ui/Card';
import { EmptyState } from '@shared/ui/EmptyState';
import { ErrorState } from '@shared/ui/ErrorState';
import { Page } from '@shared/ui/Page';
import { PageHeader } from '@shared/ui/PageHeader';
import { Spinner } from '@shared/ui/Spinner';

import { sortByPrecedence } from '../domain/cascade';
import type { Band, Magnitude, Scope, ThresholdSet } from '../domain/types';
import {
  useMagnitudesQuery,
  useRetireThresholdSetMutation,
  useSimulateMutation,
  useThresholdSetsQuery,
} from '../infrastructure/endpoints';
import { ThresholdFormModal } from './ThresholdFormModal';

const SCOPES: Scope[] = ['point', 'equipment', 'asset_group_kind', 'equipment_type', 'global'];

interface MagnitudeGroup {
  code: string;
  name: string;
  unit: string;
  sets: ThresholdSet[];
}

interface ServiceGroup {
  code: string;
  name: string;
  magnitudes: MagnitudeGroup[];
}

/**
 * Service → magnitude → criteria, in the catalogue's order.
 *
 * Grouped by magnitude because that is the unit of competition: criteria for
 * the same magnitude fight, criteria for different magnitudes never meet. The
 * service above it is how people look for one ("the vibration ones"), which a
 * row of internal codes like `delta_temp_ambient` never answered.
 */
function groupSets(sets: ThresholdSet[], catalogue: Magnitude[], other: string): ServiceGroup[] {
  const order = (code: string) => {
    const index = catalogue.findIndex((magnitude) => magnitude.code === code);
    return index < 0 ? Number.MAX_SAFE_INTEGER : index;
  };
  const services = new Map<string, ServiceGroup>();
  const codes = [...new Set(sets.map((set) => set.magnitude_code))].sort((a, b) => order(a) - order(b));
  for (const code of codes) {
    const magnitude = catalogue.find((row) => row.code === code);
    const own = sets.filter((set) => set.magnitude_code === code);
    const key = magnitude?.technique_code ?? '';
    const service = services.get(key) ?? { code: key, name: magnitude?.technique_name ?? other, magnitudes: [] };
    service.magnitudes.push({
      code,
      name: magnitude?.name ?? code,
      unit: own[0]?.unit_code ?? '',
      sets: sortByPrecedence(own),
    });
    services.set(key, service);
  }
  return [...services.values()];
}

export default function ThresholdsPage() {
  const { t } = useTranslation(['thresholds', 'common']);
  const [service, setService] = useState('');
  const [scope, setScope] = useState('');
  const permissions = useAppSelector((state) => state.session.permissions);
  const canManage = permissions.includes('thresholds.manage_set');
  const [editing, setEditing] = useState<ThresholdSet | null>(null);
  const [creating, setCreating] = useState(false);
  const { data, isLoading, isError } = useThresholdSetsQuery({});
  const magnitudes = useMagnitudesQuery();

  if (isLoading) return <Spinner label={t('loading')} />;

  const all = groupSets(data ?? [], magnitudes.data ?? [], t('sets.otherService'));
  const count = (group: ServiceGroup) => group.magnitudes.reduce((total, row) => total + row.sets.length, 0);
  const visible = all
    .filter((group) => !service || group.code === service)
    .map((group) => ({
      ...group,
      magnitudes: group.magnitudes
        .map((row) => ({ ...row, sets: row.sets.filter((set) => !scope || set.scope === scope) }))
        .filter((row) => row.sets.length > 0),
    }))
    .filter((group) => group.magnitudes.length > 0);

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
              active={!service}
              label={t('sets.allServices')}
              count={all.reduce((total, group) => total + count(group), 0)}
              onClick={() => setService('')}
            />
            {all.map((group) => (
              <FilterChip
                key={group.code}
                active={service === group.code}
                label={group.name}
                count={count(group)}
                onClick={() => setService(group.code)}
              />
            ))}
            <select
              value={scope}
              aria-label={t('sets.allScopes')}
              onChange={(event) => setScope(event.target.value)}
              className="ml-auto rounded-lg border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800"
            >
              <option value="">{t('sets.allScopes')}</option>
              {SCOPES.map((code) => (
                <option key={code} value={code}>
                  {t(`scope.${code}`)}
                </option>
              ))}
            </select>
          </div>

          {visible.length === 0 ? (
            <Card>
              <EmptyState title={t('sets.empty')} />
            </Card>
          ) : (
            visible.map((group) => (
              <Card key={group.code} title={group.name} padded={false}>
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {group.magnitudes.map((row) => (
                    <MagnitudeBlock key={row.code} group={row} canManage={canManage} onEdit={setEditing} />
                  ))}
                </div>
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
      aria-pressed={active}
      className={clsx(
        'rounded-full border px-3 py-1 text-xs',
        active
          ? 'border-sky-500 bg-sky-50 text-sky-800 dark:bg-sky-950 dark:text-sky-200'
          : 'border-slate-200 text-slate-600 hover:border-slate-400 dark:border-slate-700 dark:text-slate-300',
      )}
    >
      {label} <span className="text-slate-400">{count}</span>
    </button>
  );
}

/**
 * One magnitude and the criteria that compete for it.
 *
 * Criteria of the same scope never compete with each other (one per motor
 * type, one per ISO class), so the cascade is shown by scope — "1 · Por tipo
 * de equipo, 2 · Global" — not as fourteen ranks.
 */
function MagnitudeBlock({
  group,
  canManage,
  onEdit,
}: {
  group: MagnitudeGroup;
  canManage: boolean;
  onEdit: (set: ThresholdSet) => void;
}) {
  const { t } = useTranslation('thresholds');
  const tiers = SCOPES.filter((scope) => group.sets.some((set) => set.scope === scope));
  // The aggregation only tells criteria apart when they differ on it.
  const showAggregation = new Set(group.sets.map((set) => set.aggregation)).size > 1;

  return (
    <section className="px-4 py-3">
      <header className="mb-1 flex flex-wrap items-baseline gap-x-2">
        <h3 className="font-medium">{group.name}</h3>
        <span className="text-xs text-slate-400">{group.unit}</span>
        {tiers.length > 1 && (
          <span className="ml-auto text-xs text-slate-400">{t('sets.cascade')}</span>
        )}
      </header>
      {tiers.map((scope, index) => (
        <div key={scope}>
          {tiers.length > 1 && (
            <p className="mt-2 text-[11px] font-medium uppercase tracking-wide text-slate-400">
              {index + 1} · {t(`scope.${scope}`)}
            </p>
          )}
          <ul className="divide-y divide-slate-50 dark:divide-slate-800/60">
            {group.sets
              .filter((set) => set.scope === scope)
              .map((set) => (
                <CriterionRow
                  key={set.id}
                  set={set}
                  magnitude={group.name}
                  showAggregation={showAggregation}
                  canManage={canManage}
                  onEdit={() => onEdit(set)}
                />
              ))}
          </ul>
        </div>
      ))}
    </section>
  );
}

function target(set: ThresholdSet, t: (key: string, options?: Record<string, unknown>) => string): string {
  if (set.scope === 'equipment_type') {
    return t(`assets:type.${set.scope_ref_id}`, { defaultValue: set.scope_label });
  }
  if (set.scope === 'global') return set.machine_class || t('sets.everyEquipment');
  return set.scope_label;
}

function CriterionRow({
  set,
  magnitude,
  showAggregation,
  canManage,
  onEdit,
}: {
  set: ThresholdSet;
  magnitude: string;
  showAggregation: boolean;
  canManage: boolean;
  onEdit: () => void;
}) {
  const { t } = useTranslation(['thresholds', 'common']);
  const confirm = useConfirm();
  const toast = useToast();
  const [retire] = useRetireThresholdSetMutation();
  const [runSimulation] = useSimulateMutation();
  const [impact, setImpact] = useState<string | null>(null);
  // The simulation grades readings: without Mediciones there are none.
  const canSimulate = useInstalled('measurements');
  const source = set.standard?.name ?? t('sets.custom');
  // "ISO 10816-1 · Clase I" under a row already reading "Clase I · ISO 10816-1"
  // is noise; a rationale that says something new is kept.
  const note = set.rationale && !set.rationale.startsWith(set.standard?.name ?? '\u0000') ? set.rationale : '';

  async function simulate() {
    setImpact(null);
    try {
      const result = await runSimulation(set.id).unwrap();
      const names = Object.fromEntries(set.bands.map((band) => [band.status.code, band.status.name]));
      const detail = Object.entries(result.by_status)
        .map(([code, total]) => `${names[code] ?? code}: ${total}`)
        .join(' · ');
      setImpact(
        result.judged === 0
          ? t('sets.simulateNone')
          : result.changed === 0
            ? t('sets.simulateSteady', { count: result.judged })
            : t('sets.simulateResult', { count: result.changed, points: result.judged, detail }),
      );
    } catch {
      setImpact(t('sets.simulateFailed'));
    }
  }

  async function retireIt() {
    const ok = await confirm({
      title: t('sets.retireTitle', { what: `${magnitude} · ${target(set, t)}` }),
      body: t('sets.retireBody'),
      confirmLabel: t('sets.retire'),
    });
    if (!ok) return;
    try {
      await retire(set.id).unwrap();
      toast.success(t('sets.retired'));
    } catch (cause) {
      toast.error(readError(cause) ?? t('common:feedback.failed'));
    }
  }

  return (
    <li className="py-2">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
        <div className="min-w-0 sm:w-64">
          <p className="truncate text-sm font-medium" title={target(set, t)}>
            {target(set, t)}
            {showAggregation && (
              <span className="font-normal text-slate-500"> · {t(`aggregation.${set.aggregation}`)}</span>
            )}
          </p>
          <p className={clsx('truncate text-xs', set.standard ? 'text-slate-500' : 'text-sky-600')} title={source}>
            {source}
          </p>
        </div>
        <div className="flex flex-1 flex-wrap gap-1.5">
          {set.bands.map((band) => (
            <BandPill key={band.status.code} band={band} />
          ))}
        </div>
        {canManage && (
          <div className="flex items-center gap-1">
            <Button variant="ghost" className="py-1" onClick={onEdit}>
              {t('common:action.edit')}
            </Button>
            <RowMenu
              label={t('sets.moreActions')}
              caption={t('version', { version: set.version, date: formatDate(set.valid_from) })}
              items={[
                // "How many machines change state if I apply this", answered
                // before committing: the difference between a criterion and a guess.
                ...(canSimulate ? [{ label: t('sets.simulate'), run: () => void simulate() }] : []),
                // Readings freeze the set that judged them: retired, never deleted.
                { label: t('sets.retire'), run: () => void retireIt(), danger: true },
              ]}
            />
          </div>
        )}
      </div>
      {note && <p className="mt-1 truncate text-xs text-slate-400" title={note}>{note}</p>}
      {impact && (
        <p className="mt-1.5 rounded-md bg-amber-50 px-2 py-1 text-xs text-amber-800 dark:bg-amber-950 dark:text-amber-200">
          {impact}
        </p>
      )}
    </li>
  );
}

/** "Alarma 4,0 – 15,0": the status colour as a dot, the range in figures. */
function BandPill({ band }: { band: Band }) {
  const range =
    band.min_value === null && band.max_value === null
      ? '—'
      : band.min_value === null
        ? `< ${formatNumber(band.max_value, 1)}`
        : band.max_value === null
          ? `≥ ${formatNumber(band.min_value, 1)}`
          : `${formatNumber(band.min_value, 1)} – ${formatNumber(band.max_value, 1)}`;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-2 py-0.5 text-xs dark:border-slate-700">
      <span className="size-2 rounded-full" style={{ backgroundColor: band.status.color }} />
      <span className="text-slate-500 dark:text-slate-400">{band.status.name}</span>
      <span className="font-medium tabular-nums">{range}</span>
    </span>
  );
}

/** The actions a row needs now and then, out of the way until asked for. */
function RowMenu({
  label,
  caption,
  items,
}: {
  label: string;
  caption?: string;
  items: { label: string; run: () => void; danger?: boolean }[];
}) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (!box.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => event.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', escape);
    };
  }, [open]);

  return (
    <div ref={box} className="relative">
      <Button
        variant="ghost"
        className="px-2 py-1"
        aria-label={label}
        title={label}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        ⋯
      </Button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-20 mt-1 w-52 rounded-lg border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-900"
        >
          {caption && <p className="px-3 py-1.5 text-[11px] text-slate-400">{caption}</p>}
          {items.map((item) => (
            <button
              key={item.label}
              role="menuitem"
              onClick={() => {
                setOpen(false);
                item.run();
              }}
              className={clsx(
                'block w-full px-3 py-1.5 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-800',
                item.danger && 'text-red-600 dark:text-red-400',
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
