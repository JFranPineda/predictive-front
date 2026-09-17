import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { useEquipmentsQuery, type Equipment } from '@modules/assets';
import { Card } from '@shared/ui/Card';
import { DataTable, type Column } from '@shared/ui/DataTable';
import { EmptyState } from '@shared/ui/EmptyState';
import { ErrorState } from '@shared/ui/ErrorState';
import { Page } from '@shared/ui/Page';
import { PageHeader } from '@shared/ui/PageHeader';
import { Spinner } from '@shared/ui/Spinner';
import { StatusBadge } from '@shared/ui/StatusBadge';

export default function MeasurementsIndexPage() {
  const { t } = useTranslation('measurements');
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const { data, isLoading, isError } = useEquipmentsQuery({
    search: search || undefined,
    page_size: 100,
  });

  const columns: Column<Equipment>[] = [
    {
      key: 'tag',
      header: t('index.column.tag'),
      render: (row) => (
        <span className="font-mono text-xs font-medium">{row.client_tag || row.asset_code}</span>
      ),
    },
    { key: 'name', header: t('index.column.equipment'), render: (row) => row.name },
    {
      key: 'group',
      header: t('index.column.group'),
      render: (row) => <span className="text-slate-500">{row.asset_group.name}</span>,
    },
    {
      key: 'area',
      header: t('index.column.area'),
      render: (row) => <span className="text-slate-500">{row.area.code}</span>,
    },
    {
      key: 'status',
      header: t('index.column.status'),
      render: (row) =>
        row.condition_status ? (
          <StatusBadge label={row.condition_status.name} color={row.condition_status.color} />
        ) : (
          <span className="text-slate-300">—</span>
        ),
    },
    {
      key: 'open',
      header: '',
      render: () => <span className="text-xs font-medium text-sky-600">{t('index.open')} →</span>,
    },
  ];

  if (isLoading) return <Spinner label={t('index.loading')} />;

  return (
    <Page>
      <PageHeader title={t('index.title')} description={t('index.subtitle')} />
      {isError ? (
        <ErrorState title={t('common:state.failed')} body={t('common:state.failedBody')} />
      ) : (
        <Card
          actions={
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t('index.search')}
              className="w-56 rounded-lg border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800"
            />
          }
          title={t('index.pick')}
          padded={false}
        >
          <DataTable
            columns={columns}
            rows={data?.results ?? []}
            rowKey={(row) => row.id}
            onRowClick={(row) => navigate(`/measurements/${row.id}`)}
            empty={<div className="p-6"><EmptyState title={t('index.empty')} /></div>}
          />
        </Card>
      )}
    </Page>
  );
}
