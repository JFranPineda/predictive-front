import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useAppSelector } from '@app/hooks';
import { useTechniquesQuery, useUnitsQuery } from '@modules/thresholds';
import { Button } from '@shared/ui/Button';
import { Card } from '@shared/ui/Card';
import { DataTable, type Column } from '@shared/ui/DataTable';
import { EmptyState } from '@shared/ui/EmptyState';
import { FormField, Select, TextInput } from '@shared/ui/Form';
import { Page } from '@shared/ui/Page';
import { PageHeader } from '@shared/ui/PageHeader';
import { Spinner } from '@shared/ui/Spinner';

import {
  type OperatingParameter,
  useCreateOperatingParameterMutation,
  useDeleteOperatingParameterMutation,
  useOperatingParametersQuery,
  useUpdateOperatingParameterMutation,
} from '../infrastructure/endpoints';

const EMPTY = {
  name: '',
  unit_code: '',
  technique_code: '',
  decimals: 1,
  is_cumulative: false,
};

/**
 * What the plant records about a machine's running conditions.
 *
 * The values are captured inside the visit, but which parameters exist is
 * configuration — and `is_cumulative` in particular could not be corrected:
 * a running-hour counter read as if it were a pressure reports a nonsense
 * trend until somebody can change the flag.
 */
export default function OperatingParametersPage() {
  const { t } = useTranslation(['operating_data', 'common']);
  const permissions = useAppSelector((state) => state.session.permissions);
  const canManage = permissions.includes('operating_data.add');
  const { data, isLoading } = useOperatingParametersQuery();
  const units = useUnitsQuery();
  const techniques = useTechniquesQuery();
  const [create] = useCreateOperatingParameterMutation();
  const [update] = useUpdateOperatingParameterMutation();
  const [remove] = useDeleteOperatingParameterMutation();
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

  const columns: Column<OperatingParameter>[] = [
    {
      key: 'name',
      header: t('parameters.name'),
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
      key: 'unit',
      header: t('parameters.unit'),
      render: (row) => <span className="font-mono text-xs">{row.unit_code || '—'}</span>,
    },
    {
      key: 'technique',
      header: t('parameters.technique'),
      render: (row) => row.technique_code || t('parameters.general'),
    },
    {
      key: 'cumulative',
      header: t('parameters.cumulative'),
      render: (row) =>
        canManage ? (
          <input
            type="checkbox"
            checked={row.is_cumulative}
            onChange={(event) =>
              void run(() =>
                update({ id: row.id, is_cumulative: event.target.checked }).unwrap(),
              )
            }
          />
        ) : (
          <span>{row.is_cumulative ? '✓' : '—'}</span>
        ),
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

  if (isLoading) return <Spinner label={t('parameters.loading')} />;

  return (
    <Page>
      <PageHeader title={t('parameters.title')} description={t('parameters.subtitle')} />
      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <Card title={t('parameters.table')} padded={false}>
        <DataTable
          columns={columns}
          rows={data ?? []}
          rowKey={(row) => row.id}
          empty={<div className="p-6"><EmptyState title={t('parameters.empty')} /></div>}
        />
      </Card>

      {canManage && (
        <Card title={t('parameters.new')} description={t('parameters.newHint')}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <FormField label={t('parameters.name')}>
              <TextInput
                value={draft.name}
                placeholder="Presión de succión"
                onChange={(event) => setDraft({ ...draft, name: event.target.value })}
              />
            </FormField>
            <FormField label={t('parameters.unit')}>
              <Select
                value={draft.unit_code}
                onChange={(event) => setDraft({ ...draft, unit_code: event.target.value })}
              >
                <option value="">—</option>
                {(units.data ?? []).map((unit) => (
                  <option key={unit.code} value={unit.code}>
                    {unit.code} — {unit.name}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label={t('parameters.technique')} hint={t('parameters.techniqueHint')}>
              <Select
                value={draft.technique_code}
                onChange={(event) => setDraft({ ...draft, technique_code: event.target.value })}
              >
                <option value="">{t('parameters.general')}</option>
                {(techniques.data ?? []).map((row) => (
                  <option key={row.code} value={row.code}>
                    {row.name}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label={t('parameters.decimals')}>
              <TextInput
                type="number"
                min={0}
                value={draft.decimals}
                onChange={(event) =>
                  setDraft({ ...draft, decimals: Number(event.target.value) })
                }
              />
            </FormField>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={draft.is_cumulative}
              onChange={(event) => setDraft({ ...draft, is_cumulative: event.target.checked })}
            />
            {t('parameters.cumulativeHint')}
          </label>
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
