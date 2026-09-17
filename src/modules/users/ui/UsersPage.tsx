import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useAppSelector } from '@app/hooks';
import { Button } from '@shared/ui/Button';
import { Card } from '@shared/ui/Card';
import { DataTable, type Column } from '@shared/ui/DataTable';
import { EmptyState } from '@shared/ui/EmptyState';
import { ErrorState } from '@shared/ui/ErrorState';
import { Metric, MetricRow } from '@shared/ui/Metric';
import { Page } from '@shared/ui/Page';
import { PageHeader } from '@shared/ui/PageHeader';
import { Spinner } from '@shared/ui/Spinner';

import { ROLES, type CompanyUser } from '../domain/roles';
import { useCompanyUsersQuery, useUpdateUserMutation } from '../infrastructure/endpoints';
import { UserEditModal } from './UserEditModal';
import { UserFormModal } from './UserFormModal';

export default function UsersPage() {
  const { t } = useTranslation(['users', 'common']);
  const currentUserId = useAppSelector((state) => state.session.userId);
  const permissions = useAppSelector((state) => state.session.permissions);
  const canManage = permissions.includes('security.manage_user');
  const { data, isLoading, isError } = useCompanyUsersQuery();
  const [updateUser, updating] = useUpdateUserMutation();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<CompanyUser | null>(null);

  const rows = data ?? [];
  const columns: Column<CompanyUser>[] = [
    {
      key: 'person',
      header: t('column.person'),
      render: (row) => (
        <span className="flex items-center gap-2">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[11px] font-semibold text-white dark:bg-slate-100 dark:text-slate-900">
            {row.initials || row.full_name.slice(0, 2).toUpperCase()}
          </span>
          <span>
            <span className="block font-medium">{row.full_name}</span>
            <span className="block text-xs text-slate-500">{row.email}</span>
          </span>
        </span>
      ),
    },
    {
      key: 'role',
      header: t('column.role'),
      render: (row) =>
        canManage && row.id !== currentUserId ? (
          <select
            value={row.role}
            disabled={updating.isLoading}
            onChange={(event) => void updateUser({ id: row.id, role: event.target.value })}
            className="rounded-lg border border-slate-300 px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-800"
          >
            {ROLES.map((role) => (
              <option key={role} value={role}>
                {t(`role.${role}`)}
              </option>
            ))}
          </select>
        ) : (
          <span>{t(`role.${row.role}`, { defaultValue: row.role_name })}</span>
        ),
    },
    {
      key: 'kind',
      header: t('column.kind'),
      render: (row) =>
        row.is_external ? (
          <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-medium uppercase text-amber-800 dark:bg-amber-950 dark:text-amber-300">
            {t('external')}
          </span>
        ) : (
          <span className="text-xs text-slate-400">{t('internal')}</span>
        ),
    },
    {
      key: 'scope',
      header: t('column.scope'),
      render: (row) => (
        <span className="text-slate-500">
          {row.area_restrictions.length > 0
            ? t('scope.areas', { count: row.area_restrictions.length })
            : t('scope.all')}
        </span>
      ),
    },
    {
      key: 'edit',
      header: '',
      render: (row) =>
        canManage ? (
          <button onClick={() => setEditing(row)} className="text-xs font-medium text-sky-600">
            {t('common:action.edit')}
          </button>
        ) : null,
    },
    {
      key: 'state',
      header: t('column.state'),
      render: (row) => {
        const self = row.id === currentUserId;
        if (!canManage || self) {
          return (
            <span className={row.is_active ? 'text-emerald-600' : 'text-slate-400'}>
              {t(row.is_active ? 'state.active' : 'state.inactive')}
            </span>
          );
        }
        return (
          <button
            disabled={updating.isLoading}
            onClick={() => void updateUser({ id: row.id, is_active: !row.is_active })}
            className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium hover:bg-slate-100 disabled:opacity-40 dark:border-slate-700 dark:hover:bg-slate-800"
          >
            {t(row.is_active ? 'action.deactivate' : 'action.activate')}
          </button>
        );
      },
    },
  ];

  if (isLoading) return <Spinner label={t('loading')} />;

  return (
    <Page>
      <PageHeader
        title={t('title')}
        description={t('subtitle')}
        actions={
          canManage && (
            <Button variant="primary" onClick={() => setCreating(true)}>
              + {t('form.new')}
            </Button>
          )
        }
      />
      {isError ? (
        <ErrorState title={t('common:state.failed')} body={t('common:state.failedBody')} />
      ) : (
        <>
          <MetricRow>
            <Metric label={t('metric.total')} value={rows.length} />
            <Metric
              label={t('metric.external')}
              value={rows.filter((row) => row.is_external).length}
              hint={t('metric.externalHint')}
            />
            <Metric
              label={t('metric.inactive')}
              value={rows.filter((row) => !row.is_active).length}
            />
          </MetricRow>

          <Card
            title={t('table.title')}
            description={canManage ? t('table.hintManage') : t('table.hintRead')}
            padded={false}
          >
            <DataTable
              columns={columns}
              rows={rows}
              rowKey={(row) => row.id}
              empty={<div className="p-6"><EmptyState title={t('empty')} /></div>}
            />
          </Card>
        </>
      )}

      {creating && <UserFormModal onClose={() => setCreating(false)} />}
      {editing && (
        <UserEditModal
          user={editing}
          isSelf={editing.id === currentUserId}
          onClose={() => setEditing(null)}
        />
      )}
    </Page>
  );
}
