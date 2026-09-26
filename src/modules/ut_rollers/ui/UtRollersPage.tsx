import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';

import { usePermissions } from '@app/hooks';
import { MediaGallery } from '@modules/media';
import { useServiceOrdersQuery } from '@modules/services';
import { Button } from '@shared/ui/Button';
import { Card } from '@shared/ui/Card';
import { EmptyState } from '@shared/ui/EmptyState';
import { FormField, Select, TextInput } from '@shared/ui/Form';
import { Page } from '@shared/ui/Page';
import { PageHeader } from '@shared/ui/PageHeader';
import { Spinner } from '@shared/ui/Spinner';
import { StatusBadge } from '@shared/ui/StatusBadge';

import {
  INDICATION_KINDS,
  POINTS,
  STATES,
  draftFor,
  isDirty,
  parseNumbers,
  thickness,
  type IndicationKind,
  type RollerDraft,
  type RollerRow,
} from '../domain/types';
import {
  useAddRollersMutation,
  useCreateIndicationMutation,
  useDeleteIndicationMutation,
  useIndicationsQuery,
  useRollerGroupsQuery,
  useRollerSheetQuery,
  useSaveRollerSheetMutation,
} from '../infrastructure/endpoints';

const STATE_TONE: Record<string, string> = {
  acceptable: 'text-emerald-700 dark:text-emerald-300',
  medium: 'text-amber-700 dark:text-amber-300',
  inaccessible: 'text-slate-600 dark:text-slate-300',
  critical: 'text-red-700 dark:text-red-300',
};

/**
 * UT en rodillos (V3-21): the customer's order sheet — one row per roller,
 * six thicknesses, the verdict on the thinnest, and the four-way tally the
 * order ends with. Order and group live in the URL so a sheet can be shared.
 */
export default function UtRollersPage() {
  const { t } = useTranslation(['ut_rollers', 'common']);
  const permissions = usePermissions();
  const [params, setParams] = useSearchParams();
  const order = Number(params.get('order')) || 0;
  const group = Number(params.get('group')) || 0;
  const orders = useServiceOrdersQuery({ technique: 'ndt_rollers' });
  const groups = useRollerGroupsQuery();

  function choose(key: 'order' | 'group', value: number) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, String(value));
    else next.delete(key);
    setParams(next, { replace: true });
  }

  return (
    <Page>
      <PageHeader title={t('page.title')} description={t('page.hint')} />

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label={t('page.order')}>
          <Select value={order || ''} onChange={(event) => choose('order', Number(event.target.value))}>
            <option value="">—</option>
            {orders.data?.results.map((row) => (
              <option key={row.id} value={row.id}>
                {row.code}
                {row.client_work_order ? ` · OT ${row.client_work_order}` : ''}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label={t('page.group')}>
          <Select value={group || ''} onChange={(event) => choose('group', Number(event.target.value))}>
            <option value="">—</option>
            {groups.data?.map((row) => (
              <option key={row.id} value={row.id}>
                {t('page.groupOption', { name: row.name, count: row.rollers })}
              </option>
            ))}
          </Select>
        </FormField>
      </div>

      {orders.data && orders.data.results.length === 0 && (
        <EmptyState title={t('page.noOrders')} body={t('page.noOrdersHint')} />
      )}
      {groups.data && groups.data.length === 0 && (
        <EmptyState title={t('page.noGroups')} body={t('page.noGroupsHint')} />
      )}

      {order > 0 && group > 0 && (
        <Sheet order={order} group={group} canCapture={permissions.has('ut_rollers.capture')} />
      )}

      {permissions.has('ut_rollers.manage_rollers') && (groups.data?.length ?? 0) > 0 && (
        <AddRollers groups={groups.data ?? []} />
      )}
    </Page>
  );
}

function Sheet({ order, group, canCapture }: { order: number; group: number; canCapture: boolean }) {
  const { t } = useTranslation(['ut_rollers', 'common']);
  const { data, isLoading } = useRollerSheetQuery({ order, group });
  const [save, saving] = useSaveRollerSheetMutation();
  const [drafts, setDrafts] = useState<Record<number, RollerDraft>>({});
  const [opened, setOpened] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // Mirror the server until the crew types; re-mirroring after a save is what
  // brings back the verdicts the server computed.
  useEffect(() => {
    if (!data) return;
    setDrafts(Object.fromEntries(data.rows.map((row) => [row.equipment_id, draftFor(row)])));
  }, [data]);

  const dirty = useMemo(
    () => (data?.rows ?? []).filter((row) => drafts[row.equipment_id] && isDirty(row, drafts[row.equipment_id]!)),
    [data, drafts],
  );

  if (isLoading) return <Spinner label={t('common:loading')} />;
  if (!data) return null;
  if (data.rows.length === 0) return <EmptyState title={t('sheet.noRollers')} body={t('sheet.noRollersHint')} />;

  function edit(row: RollerRow, patch: Partial<RollerDraft>) {
    setSaved(false);
    setDrafts({ ...drafts, [row.equipment_id]: { ...drafts[row.equipment_id]!, ...patch } });
  }

  async function submit() {
    setError(null);
    try {
      await save({
        order,
        group,
        rows: dirty.map((row) => {
          const draft = drafts[row.equipment_id]!;
          return {
            equipment: row.equipment_id,
            values: draft.values.map((value) => value.trim()),
            inaccessible: draft.inaccessible,
            observation: draft.observation.trim(),
          };
        }),
      }).unwrap();
      setSaved(true);
    } catch (cause) {
      const body = (cause as { data?: unknown })?.data;
      setError(Array.isArray(body) ? String(body[0]) : ((body as { detail?: string })?.detail ?? t('sheet.saveFailed')));
    }
  }

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-4">
        {STATES.map((state) => (
          <Card key={state}>
            <p className="text-xs uppercase tracking-wide text-slate-500">{t(`state.${state}`)}</p>
            <p className={`text-3xl font-semibold tabular-nums ${STATE_TONE[state]}`}>{data.summary[state]}</p>
          </Card>
        ))}
      </div>

      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {saved && dirty.length === 0 && (
        <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
          {t('sheet.saved')}
        </p>
      )}

      <Card
        title={t('sheet.title', { order: data.order.code })}
        description={t('sheet.hint')}
        padded={false}
        actions={
          canCapture && (
            <Button variant="primary" disabled={dirty.length === 0 || saving.isLoading} onClick={() => void submit()}>
              {dirty.length > 0 ? t('sheet.saveCount', { count: dirty.length }) : t('sheet.upToDate')}
            </Button>
          )
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800">
                <th className="px-3 py-2 text-left">{t('sheet.roller')}</th>
                {Array.from({ length: POINTS }, (_, index) => (
                  <th key={index} className="px-2 py-2 text-right">P{index + 1}</th>
                ))}
                <th className="px-2 py-2 text-right">{t('sheet.min')}</th>
                <th className="px-2 py-2 text-left">{t('sheet.state')}</th>
                <th className="px-2 py-2 text-left">{t('sheet.inaccessible')}</th>
                <th className="px-2 py-2 text-left">{t('sheet.observation')}</th>
                <th className="px-2 py-2" />
              </tr>
            </thead>
            <tbody>
              {data.rows.map((row) => {
                const draft = drafts[row.equipment_id] ?? draftFor(row);
                const locked = !canCapture || row.is_closed;
                return (
                  <RowView
                    key={row.equipment_id}
                    row={row}
                    draft={draft}
                    locked={locked}
                    open={opened === row.equipment_id}
                    onToggle={() => setOpened(opened === row.equipment_id ? null : row.equipment_id)}
                    onEdit={(patch) => edit(row, patch)}
                    canCapture={canCapture}
                  />
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}

function RowView({
  row,
  draft,
  locked,
  open,
  onToggle,
  onEdit,
  canCapture,
}: {
  row: RollerRow;
  draft: RollerDraft;
  locked: boolean;
  open: boolean;
  onToggle: () => void;
  onEdit: (patch: Partial<RollerDraft>) => void;
  canCapture: boolean;
}) {
  const { t } = useTranslation('ut_rollers');
  return (
    <>
      <tr className="border-b border-slate-100 dark:border-slate-800/60">
        <td className="px-3 py-1.5 font-medium">{row.number}</td>
        {Array.from({ length: POINTS }, (_, index) => (
          <td key={index} className="px-1 py-1.5 text-right">
            {locked ? (
              <span className="tabular-nums">{draft.values[index] || '—'}</span>
            ) : (
              <input
                inputMode="decimal"
                aria-label={`${row.name} P${index + 1}`}
                disabled={draft.inaccessible}
                value={draft.values[index] ?? ''}
                onChange={(event) => {
                  const values = [...draft.values];
                  values[index] = event.target.value;
                  onEdit({ values });
                }}
                className="w-16 rounded border border-slate-300 px-1.5 py-1 text-right tabular-nums disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800"
              />
            )}
          </td>
        ))}
        <td className="px-2 py-1.5 text-right font-semibold tabular-nums">{thickness(row.min) || '—'}</td>
        <td className="px-2 py-1.5">
          {row.state === 'inaccessible' ? (
            <span className="text-xs text-slate-500">{t('state.inaccessible')}</span>
          ) : row.status ? (
            <StatusBadge label={row.status.label} color={row.status.color} size="sm" />
          ) : (
            <span className="text-xs text-slate-400">—</span>
          )}
        </td>
        <td className="px-2 py-1.5">
          <input
            type="checkbox"
            aria-label={t('sheet.inaccessible')}
            disabled={locked}
            checked={draft.inaccessible}
            onChange={(event) => onEdit({ inaccessible: event.target.checked })}
          />
        </td>
        <td className="px-2 py-1.5">
          {locked ? (
            <span className="text-xs text-slate-500">{draft.observation || '—'}</span>
          ) : (
            <input
              value={draft.observation}
              aria-label={`${row.name} ${t('sheet.observation')}`}
              onChange={(event) => onEdit({ observation: event.target.value })}
              className="w-56 rounded border border-slate-300 px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-800"
            />
          )}
        </td>
        <td className="px-2 py-1.5 text-right">
          <button onClick={onToggle} className="whitespace-nowrap text-xs text-sky-600">
            {t('sheet.indications', { count: row.indications })}
          </button>
        </td>
      </tr>
      {open && (
        <tr>
          <td colSpan={POINTS + 6} className="bg-slate-50 px-4 py-3 dark:bg-slate-900/40">
            <Indications equipmentId={row.equipment_id} canEdit={canCapture} />
          </td>
        </tr>
      )}
    </>
  );
}

function Indications({ equipmentId, canEdit }: { equipmentId: number; canEdit: boolean }) {
  const { t } = useTranslation(['ut_rollers', 'common']);
  const { data } = useIndicationsQuery({ equipment: equipmentId });
  const [create, creating] = useCreateIndicationMutation();
  const [remove] = useDeleteIndicationMutation();
  const [kind, setKind] = useState<IndicationKind>('crack');
  const [length, setLength] = useState('');
  const [depth, setDepth] = useState('');
  const [position, setPosition] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function add() {
    setError(null);
    try {
      await create({ equipment: equipmentId, kind, length_mm: length, depth_mm: depth, position }).unwrap();
      setLength('');
      setDepth('');
      setPosition('');
    } catch (cause) {
      const body = (cause as { data?: unknown })?.data;
      setError(Array.isArray(body) ? String(body[0]) : t('sheet.saveFailed'));
    }
  }

  return (
    <div className="space-y-4">
      {(data ?? []).length === 0 && <p className="text-xs text-slate-500">{t('indication.none')}</p>}
      {(data ?? []).map((row) => (
        <div key={row.id} className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-sm font-medium">
              {t(`indication.kind.${row.kind}`)}
              <span className="ml-2 text-xs font-normal text-slate-500">
                {t('indication.size', { length: row.length_mm ?? '—', depth: row.depth_mm ?? '—' })}
                {row.position && ` · ${row.position}`}
              </span>
            </p>
            {canEdit && (
              <button onClick={() => void remove(row.id)} className="text-xs text-red-600">
                {t('common:action.delete')}
              </button>
            )}
          </div>
          <div className="mt-2">
            <MediaGallery
              ownerType="ut_indication"
              ownerId={row.id}
              kind="photo"
              title={t('indication.photos')}
              canEdit={canEdit}
            />
          </div>
        </div>
      ))}
      {canEdit && (
        <div className="grid gap-3 sm:grid-cols-5">
          <FormField label={t('indication.type')}>
            <Select value={kind} onChange={(event) => setKind(event.target.value as IndicationKind)}>
              {INDICATION_KINDS.map((option) => (
                <option key={option} value={option}>
                  {t(`indication.kind.${option}`)}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label={t('indication.length')}>
            <TextInput inputMode="decimal" value={length} onChange={(event) => setLength(event.target.value)} />
          </FormField>
          <FormField label={t('indication.depth')}>
            <TextInput inputMode="decimal" value={depth} onChange={(event) => setDepth(event.target.value)} />
          </FormField>
          <FormField label={t('indication.position')}>
            <TextInput value={position} onChange={(event) => setPosition(event.target.value)} />
          </FormField>
          <div className="flex items-end">
            <Button disabled={creating.isLoading} onClick={() => void add()}>
              {t('indication.add')}
            </Button>
          </div>
          {error && <p className="text-sm text-red-700 sm:col-span-5">{error}</p>}
        </div>
      )}
    </div>
  );
}

function AddRollers({ groups }: { groups: { id: number; name: string }[] }) {
  const { t } = useTranslation(['ut_rollers', 'common']);
  const [add, adding] = useAddRollersMutation();
  const [group, setGroup] = useState(groups[0]?.id ?? 0);
  const [text, setText] = useState('');
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const numbers = parseNumbers(text);

  async function submit() {
    setMessage(null);
    try {
      const result = await add({ group, numbers }).unwrap();
      setMessage({ ok: true, text: t('rollers.added', { created: result.created.length, skipped: result.skipped.length }) });
      setText('');
    } catch (cause) {
      const body = (cause as { data?: unknown })?.data;
      setMessage({ ok: false, text: Array.isArray(body) ? String(body[0]) : t('sheet.saveFailed') });
    }
  }

  return (
    <Card title={t('rollers.title')} description={t('rollers.hint')}>
      <div className="grid gap-3 sm:grid-cols-3">
        <FormField label={t('page.group')}>
          <Select value={group} onChange={(event) => setGroup(Number(event.target.value))}>
            {groups.map((row) => (
              <option key={row.id} value={row.id}>
                {row.name}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label={t('rollers.numbers')} hint={t('rollers.numbersHint', { count: numbers.length })}>
          <TextInput value={text} placeholder="1-28" onChange={(event) => setText(event.target.value)} />
        </FormField>
        <div className="flex items-end">
          <Button variant="primary" disabled={!group || numbers.length === 0 || adding.isLoading} onClick={() => void submit()}>
            {t('rollers.add')}
          </Button>
        </div>
      </div>
      {message && (
        <p className={`mt-3 rounded-lg p-2 text-sm ${message.ok ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-700'}`}>
          {message.text}
        </p>
      )}
    </Card>
  );
}
