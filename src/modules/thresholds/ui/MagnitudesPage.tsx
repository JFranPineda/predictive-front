import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useAppSelector } from '@app/hooks';
import { useConfirmDelete } from '@shared/feedback/FeedbackProvider';
import { readError } from '@shared/lib/apiError';
import { Button } from '@shared/ui/Button';
import { Card } from '@shared/ui/Card';
import { DataTable, type Column } from '@shared/ui/DataTable';
import { EmptyState } from '@shared/ui/EmptyState';
import { ErrorState } from '@shared/ui/ErrorState';
import { FormField, Select, TextInput } from '@shared/ui/Form';
import { Modal } from '@shared/ui/Modal';
import { Page } from '@shared/ui/Page';
import { PageHeader } from '@shared/ui/PageHeader';
import { Spinner } from '@shared/ui/Spinner';

import type { Magnitude, TechniqueRef, UnitRef } from '../domain/types';
import {
  useCreateMagnitudeMutation,
  useCreateUnitMutation,
  useDeleteMagnitudeMutation,
  useDeleteUnitMutation,
  useMagnitudesQuery,
  useTechniquesQuery,
  useUnitsQuery,
  useUpdateMagnitudeMutation,
  useUpdateUnitMutation,
} from '../infrastructure/endpoints';

const AGGREGATIONS = ['rms', 'peak', 'peak_to_peak', 'avg', 'max', 'min'] as const;

/**
 * Configuración → Tipos de medición.
 *
 * A magnitude belongs to exactly one service, and that binding is what decides
 * which standards may judge it. `Gs pico` and `Gs pico-pico` are two different
 * criteria of the same magnitude, which is why aggregation is part of the row.
 *
 * The catalogue reads by service, as the reports do: every vibration
 * magnitude together, in the order its tables appear in the record.
 */
export default function MagnitudesPage() {
  const confirmDelete = useConfirmDelete();
  const { t } = useTranslation(['thresholds', 'common']);
  const permissions = useAppSelector((state) => state.session.permissions);
  const canManage = permissions.includes('thresholds.manage_set');
  const magnitudes = useMagnitudesQuery();
  const techniques = useTechniquesQuery();
  const units = useUnitsQuery();
  const [search, setSearch] = useState('');
  const [service, setService] = useState('');
  const [editing, setEditing] = useState<Magnitude | 'new' | null>(null);
  const [editingUnit, setEditingUnit] = useState<UnitRef | 'new' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleteUnit] = useDeleteUnitMutation();

  const services = useMemo(() => {
    const term = search.trim().toLowerCase();
    const shown = (magnitudes.data ?? []).filter(
      (row) =>
        (!service || row.technique_code === service) &&
        (!term || `${row.name} ${row.code} ${row.unit_code}`.toLowerCase().includes(term)),
    );
    const byService = new Map<string, { name: string; rows: Magnitude[] }>();
    for (const row of shown) {
      const entry = byService.get(row.technique_code) ?? { name: row.technique_name, rows: [] };
      entry.rows.push(row);
      byService.set(row.technique_code, entry);
    }
    return [...byService.entries()]
      .map(([code, entry]) => ({
        code,
        name: entry.name,
        rows: entry.rows.sort((a, b) => a.display_order - b.display_order),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [magnitudes.data, search, service]);

  if (magnitudes.isLoading) return <Spinner label={t('magnitudes.loading')} />;

  async function removeUnit(row: UnitRef) {
    setError(null);
    try {
      await deleteUnit(row.id).unwrap();
    } catch (cause) {
      setError(readError(cause) ?? t('form.genericError'));
    }
  }

  const unitColumns: Column<UnitRef>[] = [
    { key: 'code', header: t('units.symbol'), render: (row) => <span className="font-mono text-sm">{row.code}</span> },
    { key: 'name', header: t('form.name'), render: (row) => row.name },
    {
      key: 'magnitudes',
      header: t('units.usedBy'),
      headerHint: t('units.usedByHint'),
      numeric: true,
      render: (row) => row.magnitude_count ?? 0,
    },
    {
      key: 'actions',
      header: '',
      render: (row) =>
        canManage ? (
          <span className="flex justify-end gap-3">
            <button onClick={() => setEditingUnit(row)} className="text-xs text-sky-600">
              {t('common:action.edit')}
            </button>
            <button
              disabled={Boolean(row.magnitude_count)}
              title={row.magnitude_count ? t('units.inUse') : undefined}
              onClick={() => void confirmDelete(row.code).then((ok) => { if (ok) void removeUnit(row); })}
              className="text-xs text-red-600 disabled:cursor-not-allowed disabled:text-slate-400"
            >
              {t('common:action.delete')}
            </button>
          </span>
        ) : null,
    },
  ];

  return (
    <Page>
      <PageHeader
        title={t('magnitudes.title')}
        description={t('magnitudes.subtitle')}
        actions={
          canManage && (
            <Button variant="primary" onClick={() => setEditing('new')}>
              + {t('magnitudes.new')}
            </Button>
          )
        }
      />

      <Explainer />

      {error && <ErrorState title={error} />}
      {magnitudes.isError ? (
        <ErrorState title={t('common:state.failed')} body={t('common:state.failedBody')} />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <TextInput
              type="search"
              value={search}
              placeholder={t('magnitudes.searchHint')}
              aria-label={t('magnitudes.search')}
              onChange={(event) => setSearch(event.target.value)}
              className="max-w-sm"
            />
            <Select value={service} onChange={(event) => setService(event.target.value)} className="w-auto">
              <option value="">{t('magnitudes.allServices')}</option>
              {(techniques.data ?? []).map((row) => (
                <option key={row.code} value={row.code}>
                  {row.name}
                </option>
              ))}
            </Select>
          </div>

          {services.length === 0 ? (
            <EmptyState title={t('magnitudes.empty')} />
          ) : (
            services.map((group) => (
              <Card
                key={group.code}
                title={group.name}
                description={t('magnitudes.serviceCount', { count: group.rows.length })}
                padded={false}
              >
                <MagnitudeTable rows={group.rows} canManage={canManage} onEdit={setEditing} />
              </Card>
            ))
          )}

          <Card
            title={t('units.table')}
            description={t('units.tableHint')}
            padded={false}
            actions={
              canManage && <Button onClick={() => setEditingUnit('new')}>+ {t('units.new')}</Button>
            }
          >
            <DataTable
              columns={unitColumns}
              rows={units.data ?? []}
              rowKey={(row) => row.code}
              empty={
                <div className="p-6">
                  <EmptyState title={t('units.empty')} />
                </div>
              }
            />
          </Card>
        </>
      )}

      {editing && (
        <MagnitudeModal
          magnitude={editing === 'new' ? undefined : editing}
          techniques={techniques.data ?? []}
          units={units.data ?? []}
          onClose={() => setEditing(null)}
        />
      )}
      {editingUnit && (
        <UnitModal unit={editingUnit === 'new' ? undefined : editingUnit} onClose={() => setEditingUnit(null)} />
      )}
    </Page>
  );
}

/** What a measurement type is, with one worked row (asked for). */
function Explainer() {
  const { t } = useTranslation('thresholds');
  return (
    <details className="rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm dark:border-sky-900 dark:bg-sky-950/40">
      <summary className="cursor-pointer font-medium text-sky-900 dark:text-sky-200">
        {t('magnitudes.explain.title')}
      </summary>
      <ul className="mt-3 list-disc space-y-1 pl-5 text-slate-700 dark:text-slate-300">
        <li>{t('magnitudes.explain.what')}</li>
        <li>{t('magnitudes.explain.aggregation')}</li>
        <li>{t('magnitudes.explain.order')}</li>
        <li>{t('magnitudes.explain.flags')}</li>
      </ul>
      <p className="mt-2 rounded-lg bg-white p-3 font-mono text-xs dark:bg-slate-900">
        {t('magnitudes.explain.example')}
      </p>
    </details>
  );
}

function MagnitudeTable({
  rows,
  canManage,
  onEdit,
}: {
  rows: Magnitude[];
  canManage: boolean;
  onEdit: (row: Magnitude) => void;
}) {
  const { t } = useTranslation(['thresholds', 'common']);
  const columns: Column<Magnitude>[] = [
    {
      key: 'name',
      header: t('magnitudes.column.name'),
      render: (row) => (
        <span>
          <span className="block font-medium">{row.name}</span>
          <span className="block font-mono text-[11px] text-slate-400">{row.code}</span>
        </span>
      ),
    },
    { key: 'unit', header: t('magnitudes.column.unit'), render: (row) => row.unit_code },
    {
      key: 'aggregation',
      header: t('magnitudes.column.aggregation'),
      render: (row) => t(`aggregation.${row.aggregation}`, { defaultValue: row.aggregation }),
    },
    { key: 'decimals', header: t('magnitudes.column.decimals'), numeric: true, render: (row) => row.decimals },
    {
      key: 'order',
      header: t('magnitudes.column.order'),
      headerHint: t('magnitudes.orderHint'),
      numeric: true,
      render: (row) => row.display_order,
    },
    {
      key: 'direction',
      header: t('magnitudes.column.direction'),
      render: (row) => (
        <span className="text-xs text-slate-500">
          {t(row.higher_is_worse ? 'magnitudes.higherWorse' : 'magnitudes.lowerWorse')}
        </span>
      ),
    },
    {
      key: 'record',
      header: t('magnitudes.column.record'),
      headerHint: t('magnitudes.inRecordHint'),
      render: (row) => <Flag on={row.in_record} />,
    },
    {
      key: 'template',
      header: t('magnitudes.column.template'),
      headerHint: t('magnitudes.templateOnlyHint'),
      render: (row) => <Flag on={row.template_only} />,
    },
    {
      key: 'actions',
      header: '',
      render: (row) =>
        canManage ? (
          <button onClick={() => onEdit(row)} className="text-xs text-sky-600">
            {t('common:action.edit')}
          </button>
        ) : null,
    },
  ];
  return <DataTable columns={columns} rows={rows} rowKey={(row) => row.code} />;
}

function Flag({ on }: { on: boolean }) {
  const { t } = useTranslation('thresholds');
  return on ? (
    <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">✓ {t('magnitudes.yes')}</span>
  ) : (
    <span className="text-xs text-slate-400">—</span>
  );
}

/** New or edit: the same fields, so both read the same. The service is fixed
 * once created — normas and readings hang off it. */
function MagnitudeModal({
  magnitude,
  techniques,
  units,
  onClose,
}: {
  magnitude?: Magnitude;
  techniques: TechniqueRef[];
  units: UnitRef[];
  onClose: () => void;
}) {
  const { t } = useTranslation(['thresholds', 'common']);
  const [create, creating] = useCreateMagnitudeMutation();
  const [update, updating] = useUpdateMagnitudeMutation();
  const [remove, removing] = useDeleteMagnitudeMutation();
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [draft, setDraft] = useState({
    name: magnitude?.name ?? '',
    technique_code: magnitude?.technique_code ?? 'vibration',
    unit_code: magnitude?.unit_code ?? 'mm/s',
    aggregation: magnitude?.aggregation ?? 'rms',
    decimals: magnitude?.decimals ?? 2,
    display_order: magnitude?.display_order ?? 0,
    higher_is_worse: magnitude?.higher_is_worse ?? true,
    in_record: magnitude?.in_record ?? false,
    template_only: magnitude?.template_only ?? false,
  });

  async function submit() {
    setError(null);
    try {
      if (magnitude) {
        await update({
          id: magnitude.id,
          name: draft.name.trim(),
          default_unit: draft.unit_code,
          default_aggregation: draft.aggregation,
          decimals: draft.decimals,
          display_order: draft.display_order,
          higher_is_worse: draft.higher_is_worse,
          in_record: draft.in_record,
          template_only: draft.template_only,
        }).unwrap();
      } else {
        await create({ ...draft, name: draft.name.trim(), display_order: draft.display_order || undefined }).unwrap();
      }
      onClose();
    } catch (cause) {
      setError(readError(cause) ?? t('form.genericError'));
    }
  }

  async function destroy() {
    if (!magnitude) return;
    setError(null);
    try {
      await remove(magnitude.id).unwrap();
      onClose();
    } catch (cause) {
      setError(readError(cause) ?? t('form.genericError'));
      setConfirming(false);
    }
  }

  return (
    <Modal
      title={magnitude ? t('magnitudes.edit', { name: magnitude.name }) : t('magnitudes.new')}
      description={t('form.magnitudeFormHint')}
      onClose={onClose}
      footer={
        <>
          {magnitude &&
            (confirming ? (
              <>
                <span className="mr-auto self-center text-sm text-red-700">{t('magnitudes.confirmDelete')}</span>
                <Button onClick={() => setConfirming(false)}>{t('common:action.cancel')}</Button>
                <Button variant="danger" disabled={removing.isLoading} onClick={() => void destroy()}>
                  {t('common:action.delete')}
                </Button>
              </>
            ) : (
              <Button variant="danger" className="mr-auto" onClick={() => setConfirming(true)}>
                {t('common:action.delete')}
              </Button>
            ))}
          {!confirming && (
            <>
              <Button onClick={onClose}>{t('common:action.cancel')}</Button>
              <Button
                variant="primary"
                disabled={!draft.name.trim() || creating.isLoading || updating.isLoading}
                onClick={() => void submit()}
              >
                {t('common:action.save')}
              </Button>
            </>
          )}
        </>
      }
    >
      {error && <p className="rounded-lg bg-red-50 p-2 text-sm text-red-700">{error}</p>}
      <FormField label={t('form.name')}>
        <TextInput
          value={draft.name}
          onChange={(event) => setDraft({ ...draft, name: event.target.value })}
          placeholder="Desplazamiento pico-pico"
        />
      </FormField>
      <div className="grid grid-cols-2 gap-3">
        <FormField label={t('form.technique')} hint={magnitude ? t('magnitudes.serviceFixed') : undefined}>
          <Select
            value={draft.technique_code}
            disabled={Boolean(magnitude)}
            onChange={(event) => setDraft({ ...draft, technique_code: event.target.value })}
          >
            {techniques.map((technique) => (
              <option key={technique.code} value={technique.code}>
                {technique.name}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label={t('form.unit')}>
          <Select value={draft.unit_code} onChange={(event) => setDraft({ ...draft, unit_code: event.target.value })}>
            {units.map((unit) => (
              <option key={unit.code} value={unit.code}>
                {unit.code} — {unit.name}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label={t('form.aggregation')} hint={t('form.aggregationHint')}>
          <Select
            value={draft.aggregation}
            onChange={(event) => setDraft({ ...draft, aggregation: event.target.value })}
          >
            {AGGREGATIONS.map((aggregation) => (
              <option key={aggregation} value={aggregation}>
                {t(`aggregation.${aggregation}`)}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label={t('form.decimals')}>
          <TextInput
            type="number"
            min={0}
            max={4}
            value={draft.decimals}
            onChange={(event) => setDraft({ ...draft, decimals: Number(event.target.value) })}
          />
        </FormField>
        <FormField label={t('magnitudes.column.order')} hint={t('magnitudes.orderHint')}>
          <TextInput
            type="number"
            min={0}
            value={draft.display_order}
            onChange={(event) => setDraft({ ...draft, display_order: Number(event.target.value) })}
          />
        </FormField>
      </div>
      <div className="space-y-2">
        <Check
          checked={draft.higher_is_worse}
          label={t('form.higherIsWorse')}
          hint={t('form.higherIsWorseHint')}
          onChange={(value) => setDraft({ ...draft, higher_is_worse: value })}
        />
        <Check
          checked={draft.in_record}
          label={t('magnitudes.inRecord')}
          hint={t('magnitudes.inRecordHint')}
          onChange={(value) => setDraft({ ...draft, in_record: value })}
        />
        <Check
          checked={draft.template_only}
          label={t('magnitudes.templateOnly')}
          hint={t('magnitudes.templateOnlyHint')}
          onChange={(value) => setDraft({ ...draft, template_only: value })}
        />
      </div>
    </Modal>
  );
}

function Check({
  checked,
  label,
  hint,
  onChange,
}: {
  checked: boolean;
  label: string;
  hint: string;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-start gap-2 text-sm">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="mt-1" />
      <span>
        <span className="block">{label}</span>
        <span className="block text-xs text-slate-500">{hint}</span>
      </span>
    </label>
  );
}

function UnitModal({ unit, onClose }: { unit?: UnitRef; onClose: () => void }) {
  const { t } = useTranslation(['thresholds', 'common']);
  const [create, creating] = useCreateUnitMutation();
  const [update, updating] = useUpdateUnitMutation();
  const [draft, setDraft] = useState({ code: unit?.code ?? '', name: unit?.name ?? '' });
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    try {
      if (unit) await update({ id: unit.id, ...draft }).unwrap();
      else await create(draft).unwrap();
      onClose();
    } catch (cause) {
      setError(readError(cause) ?? t('form.genericError'));
    }
  }

  return (
    <Modal
      title={unit ? t('units.edit') : t('units.new')}
      description={t('units.hint')}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>{t('common:action.cancel')}</Button>
          <Button
            variant="primary"
            disabled={!draft.code.trim() || !draft.name.trim() || creating.isLoading || updating.isLoading}
            onClick={() => void submit()}
          >
            {t('common:action.save')}
          </Button>
        </>
      }
    >
      {error && <p className="rounded-lg bg-red-50 p-2 text-sm text-red-700">{error}</p>}
      <div className="grid gap-4 sm:grid-cols-[8rem_1fr]">
        <FormField label={t('units.symbol')}>
          <TextInput
            value={draft.code}
            placeholder="µm"
            onChange={(event) => setDraft({ ...draft, code: event.target.value })}
          />
        </FormField>
        <FormField label={t('form.name')}>
          <TextInput
            value={draft.name}
            placeholder="Micrómetros"
            onChange={(event) => setDraft({ ...draft, name: event.target.value })}
          />
        </FormField>
      </div>
    </Modal>
  );
}
