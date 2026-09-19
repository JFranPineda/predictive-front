import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useAppSelector } from '@app/hooks';
import { Button } from '@shared/ui/Button';
import { Card } from '@shared/ui/Card';
import { DataTable, type Column } from '@shared/ui/DataTable';
import { EmptyState } from '@shared/ui/EmptyState';
import { FormField, TextInput } from '@shared/ui/Form';
import { Page } from '@shared/ui/Page';
import { PageHeader } from '@shared/ui/PageHeader';
import { Spinner } from '@shared/ui/Spinner';

import type { Instrument } from '../domain/types';
import {
  useCreateInstrumentMutation,
  useDeleteInstrumentMutation,
  useInstrumentsQuery,
  useUpdateInstrumentMutation,
} from '../infrastructure/endpoints';

const EMPTY = {
  code: '',
  name: '',
  manufacturer: '',
  serial_number: '',
  last_calibration: '',
  next_calibration: '',
};

/**
 * The instruments a round is taken with.
 *
 * They existed only in the seed, which meant a calibration date nobody could
 * update — and a reading taken with an expired instrument is not a reading
 * anybody can defend in front of the customer.
 */
export default function InstrumentsPage() {
  const { t } = useTranslation(['measurements', 'common']);
  const permissions = useAppSelector((state) => state.session.permissions);
  const canManage = permissions.includes('thresholds.manage_set');
  const { data, isLoading } = useInstrumentsQuery();
  const [create] = useCreateInstrumentMutation();
  const [update] = useUpdateInstrumentMutation();
  const [remove] = useDeleteInstrumentMutation();
  const [draft, setDraft] = useState(EMPTY);
  const [error, setError] = useState<string | null>(null);

  async function run(action: () => Promise<unknown>) {
    setError(null);
    try {
      await action();
    } catch (cause) {
      setError(readError(cause) ?? t('common:state.failed'));
    }
  }

  const columns: Column<Instrument>[] = [
    {
      key: 'name',
      header: t('instruments.name'),
      render: (row) => (
        <span>
          <span className="block font-medium">{row.name}</span>
          <span className="block font-mono text-[11px] text-slate-400">{row.code}</span>
        </span>
      ),
    },
    { key: 'manufacturer', header: t('instruments.manufacturer'), render: (row) => row.manufacturer },
    { key: 'serial', header: t('instruments.serial'), render: (row) => row.serial_number },
    {
      key: 'calibration',
      header: t('instruments.nextCalibration'),
      render: (row) =>
        canManage ? (
          <input
            type="date"
            value={row.next_calibration ?? ''}
            onChange={(event) =>
              void run(() => update({ id: row.id, next_calibration: event.target.value }).unwrap())
            }
            className={`rounded border px-1.5 py-0.5 text-xs dark:bg-slate-800 ${
              row.is_expired
                ? 'border-red-400 text-red-600'
                : 'border-slate-300 dark:border-slate-700'
            }`}
          />
        ) : (
          <span className={row.is_expired ? 'text-red-600' : undefined}>
            {row.next_calibration ?? '—'}
          </span>
        ),
    },
    {
      key: 'state',
      header: '',
      // An expired instrument is the loudest thing on this screen on purpose.
      render: (row) =>
        row.is_expired ? (
          <span className="rounded bg-red-100 px-2 py-0.5 text-xs text-red-800 dark:bg-red-950 dark:text-red-300">
            {t('instruments.expired')}
          </span>
        ) : null,
    },
    {
      key: 'actions',
      header: '',
      render: (row) =>
        canManage ? (
          <button
            onClick={() => void run(() => remove(row.id).unwrap())}
            className="text-xs text-red-600"
          >
            {t('common:action.delete')}
          </button>
        ) : null,
    },
  ];

  if (isLoading) return <Spinner label={t('instruments.loading')} />;

  return (
    <Page>
      <PageHeader title={t('instruments.title')} description={t('instruments.subtitle')} />
      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <Card title={t('instruments.table')} padded={false}>
        <DataTable
          columns={columns}
          rows={data ?? []}
          rowKey={(row) => row.id}
          empty={<div className="p-6"><EmptyState title={t('instruments.empty')} /></div>}
        />
      </Card>

      {canManage && (
        <Card title={t('instruments.new')} description={t('instruments.newHint')}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <FormField label={t('instruments.name')}>
              <TextInput
                value={draft.name}
                placeholder="DSP Logger MX300"
                onChange={(event) => setDraft({ ...draft, name: event.target.value })}
              />
            </FormField>
            <FormField label={t('instruments.manufacturer')}>
              <TextInput
                value={draft.manufacturer}
                placeholder="SEMAPI"
                onChange={(event) => setDraft({ ...draft, manufacturer: event.target.value })}
              />
            </FormField>
            <FormField label={t('instruments.serial')}>
              <TextInput
                value={draft.serial_number}
                onChange={(event) => setDraft({ ...draft, serial_number: event.target.value })}
              />
            </FormField>
            <FormField label={t('instruments.lastCalibration')}>
              <TextInput
                type="date"
                value={draft.last_calibration}
                onChange={(event) => setDraft({ ...draft, last_calibration: event.target.value })}
              />
            </FormField>
            <FormField label={t('instruments.nextCalibration')}>
              <TextInput
                type="date"
                value={draft.next_calibration}
                onChange={(event) => setDraft({ ...draft, next_calibration: event.target.value })}
              />
            </FormField>
          </div>
          <Button
            variant="primary"
            disabled={!draft.name.trim()}
            onClick={() =>
              void run(async () => {
                await create(draft).unwrap();
                setDraft(EMPTY);
              })
            }
          >
            + {t('common:action.add')}
          </Button>
        </Card>
      )}
    </Page>
  );
}

export function readError(cause: unknown): string | null {
  const data = (cause as { data?: unknown })?.data;
  if (Array.isArray(data)) return String(data[0]);
  if (typeof data === 'string') return data;
  if (data && typeof data === 'object' && 'detail' in data) return String(data.detail);
  return null;
}
