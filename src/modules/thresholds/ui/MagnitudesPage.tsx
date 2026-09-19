import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useAppSelector } from '@app/hooks';
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

import type { Magnitude, UnitRef } from '../domain/types';
import {
  useDeleteUnitMutation,
  useUpdateUnitMutation,
  useCreateMagnitudeMutation,
  useCreateUnitMutation,
  useMagnitudesQuery,
  useTechniquesQuery,
  useUnitsQuery,
} from '../infrastructure/endpoints';
import { readError } from './StandardFormModal';

const AGGREGATIONS = ['rms', 'peak', 'peak_to_peak', 'avg', 'max'] as const;

/**
 * Configuración → Medidas.
 *
 * A magnitude belongs to exactly one service, and that binding is what decides
 * which standards may judge it. `Gs pico` and `Gs pico-pico` are two different
 * criteria of the same magnitude, which is why aggregation is part of the row.
 */
export default function MagnitudesPage() {
  const { t } = useTranslation(['thresholds', 'common']);
  const permissions = useAppSelector((state) => state.session.permissions);
  const canManage = permissions.includes('thresholds.manage_set');
  const magnitudes = useMagnitudesQuery();
  const techniques = useTechniquesQuery();
  const units = useUnitsQuery();
  const [error, setError] = useState<string | null>(null);
  const [editingUnit, setEditingUnit] = useState<UnitRef | null>(null);
  const [deleteUnit] = useDeleteUnitMutation();

  if (magnitudes.isLoading) return <Spinner label={t('magnitudes.loading')} />;

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
    {
      key: 'technique',
      header: t('magnitudes.column.technique'),
      render: (row) => (
        <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs text-sky-800 dark:bg-sky-950 dark:text-sky-300">
          {row.technique_name}
        </span>
      ),
    },
    { key: 'unit', header: t('magnitudes.column.unit'), render: (row) => row.unit_code },
    {
      key: 'aggregation',
      header: t('magnitudes.column.aggregation'),
      render: (row) => <span className="font-mono text-xs">{row.aggregation}</span>,
    },
    { key: 'decimals', header: t('magnitudes.column.decimals'), numeric: true, render: (row) => row.decimals },
    {
      key: 'direction',
      header: t('magnitudes.column.direction'),
      render: (row) => (
        <span className="text-xs text-slate-500">
          {t(row.higher_is_worse ? 'magnitudes.higherWorse' : 'magnitudes.lowerWorse')}
        </span>
      ),
    },
  ];

  // The unit is what the customer reads next to every value, so the list has
  // to show which magnitudes lean on each one before anyone renames it.
  const unitColumns: Column<UnitRef>[] = [
    {
      key: 'code',
      header: t('units.symbol'),
      render: (row) => <span className="font-mono text-sm">{row.code}</span>,
    },
    { key: 'name', header: t('form.name'), render: (row) => row.name },
    {
      key: 'magnitudes',
      header: t('units.usedBy'),
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
              onClick={() => void removeUnit(row)}
              className="text-xs text-red-600 disabled:cursor-not-allowed disabled:text-slate-400"
            >
              {t('common:action.delete')}
            </button>
          </span>
        ) : null,
    },
  ];

  async function removeUnit(row: UnitRef) {
    setError(null);
    try {
      await deleteUnit(row.id).unwrap();
    } catch (cause) {
      setError(readError(cause) ?? t('form.genericError'));
    }
  }

  return (
    <Page>
      <PageHeader title={t('magnitudes.title')} description={t('magnitudes.subtitle')} />

      {error && <ErrorState title={error} />}
      {magnitudes.isError ? (
        <ErrorState title={t('common:state.failed')} body={t('common:state.failedBody')} />
      ) : (
        <>
          <Card title={t('magnitudes.table')} padded={false}>
            <DataTable
              columns={columns}
              rows={magnitudes.data ?? []}
              rowKey={(row) => row.code}
              empty={<div className="p-6"><EmptyState title={t('magnitudes.empty')} /></div>}
            />
          </Card>

          <Card title={t('units.table')} description={t('units.tableHint')} padded={false}>
            <DataTable
              columns={unitColumns}
              rows={units.data ?? []}
              rowKey={(row) => row.code}
              empty={<div className="p-6"><EmptyState title={t('units.empty')} /></div>}
            />
          </Card>

          {canManage && (
            <div className="grid gap-6 lg:grid-cols-2">
              <MagnitudeForm
                techniques={techniques.data ?? []}
                units={units.data ?? []}
                onError={setError}
              />
              <UnitForm onError={setError} />
            </div>
          )}
        </>
      )}

      {editingUnit && (
        <UnitEditModal
          unit={editingUnit}
          onClose={() => setEditingUnit(null)}
          onError={setError}
        />
      )}
    </Page>
  );
}

function UnitEditModal({
  unit,
  onClose,
  onError,
}: {
  unit: UnitRef;
  onClose: () => void;
  onError: (message: string | null) => void;
}) {
  const { t } = useTranslation(['thresholds', 'common']);
  const [update, { isLoading }] = useUpdateUnitMutation();
  const [draft, setDraft] = useState({ code: unit.code, name: unit.name });

  async function submit() {
    onError(null);
    try {
      await update({ id: unit.id, ...draft }).unwrap();
      onClose();
    } catch (cause) {
      onError(readError(cause) ?? t('form.genericError'));
    }
  }

  return (
    <Modal
      title={t('units.edit')}
      description={t('units.hint')}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>{t('common:action.cancel')}</Button>
          <Button variant="primary" disabled={isLoading} onClick={() => void submit()}>
            {t('common:action.save')}
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-[8rem_1fr]">
        <FormField label={t('units.symbol')}>
          <TextInput
            value={draft.code}
            onChange={(event) => setDraft({ ...draft, code: event.target.value })}
          />
        </FormField>
        <FormField label={t('form.name')}>
          <TextInput
            value={draft.name}
            onChange={(event) => setDraft({ ...draft, name: event.target.value })}
          />
        </FormField>
      </div>
    </Modal>
  );
}

function MagnitudeForm({
  techniques,
  units,
  onError,
}: {
  techniques: { code: string; name: string }[];
  units: { code: string; name: string }[];
  onError: (message: string | null) => void;
}) {
  const { t } = useTranslation(['thresholds', 'common']);
  const [create, { isLoading }] = useCreateMagnitudeMutation();
  const [draft, setDraft] = useState({
    name: '',
    technique_code: 'vibration',
    unit_code: 'mm/s',
    aggregation: 'rms',
    decimals: 2,
    higher_is_worse: true,
  });

  async function submit() {
    onError(null);
    try {
      await create(draft).unwrap();
      setDraft({ ...draft, name: '' });
    } catch (cause) {
      onError(readError(cause) ?? t('form.genericError'));
    }
  }

  return (
    <Card title={t('magnitudes.new')} description={t('form.magnitudeFormHint')}>
      <div className="space-y-3">
        <FormField label={t('form.name')}>
          <TextInput
            value={draft.name}
            onChange={(event) => setDraft({ ...draft, name: event.target.value })}
            placeholder="Desplazamiento pico-pico"
          />
        </FormField>

        <div className="grid grid-cols-2 gap-3">
          <FormField label={t('form.technique')}>
            <Select
              value={draft.technique_code}
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
            <Select
              value={draft.unit_code}
              onChange={(event) => setDraft({ ...draft, unit_code: event.target.value })}
            >
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
                  {aggregation}
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
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={draft.higher_is_worse}
            onChange={(event) => setDraft({ ...draft, higher_is_worse: event.target.checked })}
          />
          {t('form.higherIsWorse')}
        </label>
        <p className="text-xs text-slate-400">{t('form.higherIsWorseHint')}</p>

        <Button variant="primary" disabled={isLoading || !draft.name.trim()} onClick={() => void submit()}>
          + {t('common:action.add')}
        </Button>
      </div>
    </Card>
  );
}

function UnitForm({ onError }: { onError: (message: string | null) => void }) {
  const { t } = useTranslation(['thresholds', 'common']);
  const [create, { isLoading }] = useCreateUnitMutation();
  const [draft, setDraft] = useState({ code: '', name: '' });

  async function submit() {
    onError(null);
    try {
      await create(draft).unwrap();
      setDraft({ code: '', name: '' });
    } catch (cause) {
      onError(readError(cause) ?? t('form.genericError'));
    }
  }

  return (
    <Card title={t('units.new')} description={t('units.hint')}>
      <div className="space-y-3">
        <div className="grid grid-cols-[6rem_1fr] gap-3">
          <FormField label={t('units.symbol')}>
            <TextInput
              value={draft.code}
              onChange={(event) => setDraft({ ...draft, code: event.target.value })}
              placeholder="µm"
            />
          </FormField>
          <FormField label={t('form.name')}>
            <TextInput
              value={draft.name}
              onChange={(event) => setDraft({ ...draft, name: event.target.value })}
              placeholder="Micrómetros"
            />
          </FormField>
        </div>
        <Button
          variant="primary"
          disabled={isLoading || !draft.code.trim() || !draft.name.trim()}
          onClick={() => void submit()}
        >
          + {t('common:action.add')}
        </Button>
      </div>
    </Card>
  );
}
