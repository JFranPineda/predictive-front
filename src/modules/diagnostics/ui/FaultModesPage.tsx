import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useAppSelector } from '@app/hooks';
import { useTechniquesQuery } from '@modules/thresholds';
import { Button } from '@shared/ui/Button';
import { Card } from '@shared/ui/Card';
import { DataTable, type Column } from '@shared/ui/DataTable';
import { EmptyState } from '@shared/ui/EmptyState';
import { FormField, Select, TextInput } from '@shared/ui/Form';
import { Page } from '@shared/ui/Page';
import { PageHeader } from '@shared/ui/PageHeader';
import { Spinner } from '@shared/ui/Spinner';

import {
  type FaultMode,
  useCreateFaultModeMutation,
  useDeleteFaultModeMutation,
  useFaultModesQuery,
  useUpdateFaultModeMutation,
} from '../infrastructure/endpoints';

const EMPTY = { name: '', technique_code: 'vibration', signature: '', reference: '' };

/**
 * The catalogue of what a service can find.
 *
 * It shipped with 45 rows and no way to touch them, yet the vocabulary is the
 * customer's: each plant names its faults its own way, and a signature the
 * analyst cannot correct is a signature nobody trusts.
 */
export default function FaultModesPage() {
  const { t } = useTranslation(['diagnostics', 'common']);
  const permissions = useAppSelector((state) => state.session.permissions);
  const canManage = permissions.includes('diagnostics.close_recommendation');
  const [technique, setTechnique] = useState('');
  const { data, isLoading } = useFaultModesQuery(technique ? { technique } : {});
  const techniques = useTechniquesQuery();
  const [create] = useCreateFaultModeMutation();
  const [update] = useUpdateFaultModeMutation();
  const [remove] = useDeleteFaultModeMutation();
  const [draft, setDraft] = useState(EMPTY);
  const [error, setError] = useState<string | null>(null);

  async function run(action: () => Promise<unknown>) {
    setError(null);
    try {
      await action();
    } catch (cause) {
      const body = (cause as { data?: unknown })?.data;
      setError(Array.isArray(body) ? String(body[0]) : t('common:state.failed'));
    }
  }

  const columns: Column<FaultMode>[] = [
    {
      key: 'name',
      header: t('faults.name'),
      render: (row) =>
        canManage ? (
          <TextInput
            defaultValue={row.name}
            onBlur={(event) =>
              event.target.value !== row.name &&
              void run(() => update({ id: row.id, name: event.target.value }).unwrap())
            }
          />
        ) : (
          row.name
        ),
    },
    {
      key: 'technique',
      header: t('faults.technique'),
      // A standard judges the service it was written for, and so does a fault
      // mode: offering "desalineamiento" on a thermography visit is wrong.
      render: (row) => (
        <span className="rounded bg-slate-100 px-2 py-0.5 text-xs dark:bg-slate-800">
          {row.technique_code || t('faults.anyTechnique')}
        </span>
      ),
    },
    {
      key: 'signature',
      header: t('faults.signature'),
      render: (row) =>
        canManage ? (
          <TextInput
            defaultValue={row.signature}
            onBlur={(event) =>
              event.target.value !== row.signature &&
              void run(() => update({ id: row.id, signature: event.target.value }).unwrap())
            }
          />
        ) : (
          <span className="text-xs text-slate-500">{row.signature}</span>
        ),
    },
    { key: 'reference', header: t('faults.reference'), render: (row) => row.reference },
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

  if (isLoading) return <Spinner label={t('faults.loading')} />;

  return (
    <Page>
      <PageHeader
        title={t('faults.title')}
        description={t('faults.subtitle')}
        actions={
          <Select value={technique} onChange={(event) => setTechnique(event.target.value)}>
            <option value="">{t('faults.allTechniques')}</option>
            {(techniques.data ?? []).map((row) => (
              <option key={row.code} value={row.code}>
                {row.name}
              </option>
            ))}
          </Select>
        }
      />
      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <Card title={t('faults.table')} padded={false}>
        <DataTable
          columns={columns}
          rows={data ?? []}
          rowKey={(row) => row.id}
          empty={<div className="p-6"><EmptyState title={t('faults.empty')} /></div>}
        />
      </Card>

      {canManage && (
        <Card title={t('faults.new')} description={t('faults.newHint')}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <FormField label={t('faults.name')}>
              <TextInput
                value={draft.name}
                placeholder="Desalineamiento paralelo"
                onChange={(event) => setDraft({ ...draft, name: event.target.value })}
              />
            </FormField>
            <FormField label={t('faults.technique')}>
              <Select
                value={draft.technique_code}
                onChange={(event) => setDraft({ ...draft, technique_code: event.target.value })}
              >
                {(techniques.data ?? []).map((row) => (
                  <option key={row.code} value={row.code}>
                    {row.name}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label={t('faults.signature')} hint={t('faults.signatureHint')}>
              <TextInput
                value={draft.signature}
                placeholder="2X radial con fase 180°"
                onChange={(event) => setDraft({ ...draft, signature: event.target.value })}
              />
            </FormField>
            <FormField label={t('faults.reference')}>
              <TextInput
                value={draft.reference}
                placeholder="ISO 20816-3"
                onChange={(event) => setDraft({ ...draft, reference: event.target.value })}
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
