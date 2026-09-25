import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@shared/ui/Button';
import { Card } from '@shared/ui/Card';
import { DataTable, type Column } from '@shared/ui/DataTable';
import { EmptyState } from '@shared/ui/EmptyState';
import { ErrorState } from '@shared/ui/ErrorState';
import { TextInput } from '@shared/ui/Form';
import { Page } from '@shared/ui/Page';
import { PageHeader } from '@shared/ui/PageHeader';

import type { ServiceProvider } from '../domain/types';
import {
  useCreateServiceProviderMutation,
  useServiceProvidersQuery,
  useUpdateServiceProviderMutation,
} from '../infrastructure/endpoints';
import { readServiceError } from './readServiceError';

/**
 * Configuración → Empresas: who executes the services.
 *
 * A company with orders is deactivated, never deleted: past orders keep the
 * company that did the work.
 */
export default function ProvidersPage() {
  const { t } = useTranslation(['services', 'common']);
  const { data, isError } = useServiceProvidersQuery();
  const [create, creating] = useCreateServiceProviderMutation();
  const [update] = useUpdateServiceProviderMutation();
  const [name, setName] = useState('');
  const [taxId, setTaxId] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function run(action: () => Promise<unknown>) {
    setError(null);
    try {
      await action();
    } catch (cause) {
      setError(readServiceError(cause) ?? t('form.genericError'));
    }
  }

  const columns: Column<ServiceProvider>[] = [
    {
      key: 'name',
      header: t('providers.name'),
      render: (row) => (
        <TextInput
          defaultValue={row.name}
          aria-label={t('providers.name')}
          onBlur={(event) =>
            event.target.value.trim() !== row.name &&
            void run(() => update({ id: row.id, name: event.target.value.trim() }).unwrap())
          }
        />
      ),
    },
    {
      key: 'taxId',
      header: t('providers.taxId'),
      render: (row) => (
        <TextInput
          defaultValue={row.tax_id}
          aria-label={t('providers.taxId')}
          onBlur={(event) =>
            event.target.value.trim() !== row.tax_id &&
            void run(() => update({ id: row.id, tax_id: event.target.value.trim() }).unwrap())
          }
        />
      ),
    },
    { key: 'orders', header: t('providers.orders'), numeric: true, render: (row) => row.order_count },
    {
      key: 'active',
      header: '',
      render: (row) => (
        <Button
          variant={row.is_active ? 'ghost' : 'secondary'}
          onClick={() => void run(() => update({ id: row.id, is_active: !row.is_active }).unwrap())}
        >
          {row.is_active ? t('providers.deactivate') : t('providers.activate')}
        </Button>
      ),
    },
  ];

  return (
    <Page>
      <PageHeader title={t('providers.title')} description={t('providers.subtitle')} />
      {error && <ErrorState title={error} />}
      {isError && <ErrorState title={t('common:state.failed')} />}

      <Card title={t('providers.new')}>
        <div className="flex flex-wrap items-end gap-2">
          <TextInput
            value={name}
            placeholder={t('providers.name')}
            onChange={(event) => setName(event.target.value)}
            className="w-64"
          />
          <TextInput
            value={taxId}
            placeholder={t('providers.taxId')}
            onChange={(event) => setTaxId(event.target.value)}
            className="w-40"
          />
          <Button
            variant="primary"
            disabled={!name.trim() || creating.isLoading}
            onClick={() =>
              void run(async () => {
                await create({ name: name.trim(), tax_id: taxId.trim() }).unwrap();
                setName('');
                setTaxId('');
              })
            }
          >
            + {t('common:action.add')}
          </Button>
        </div>
      </Card>

      <Card title={t('providers.title')} padded={false}>
        <DataTable
          columns={columns}
          rows={data ?? []}
          rowKey={(row) => row.id}
          empty={<EmptyState title={t('providers.empty')} />}
        />
      </Card>
    </Page>
  );
}
