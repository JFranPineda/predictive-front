import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useAppSelector } from '@app/hooks';
import { formatDate } from '@app/i18n/format';
import { useTableFilter, type FilterSpec } from '@shared/hooks/useTableFilter';
import { Button } from '@shared/ui/Button';
import { Card } from '@shared/ui/Card';
import { DataTable, type Column } from '@shared/ui/DataTable';
import { EmptyState } from '@shared/ui/EmptyState';
import { ErrorState } from '@shared/ui/ErrorState';
import { Metric, MetricRow } from '@shared/ui/Metric';
import { Page } from '@shared/ui/Page';
import { PageHeader } from '@shared/ui/PageHeader';
import { Spinner } from '@shared/ui/Spinner';
import { TableToolbar } from '@shared/ui/TableToolbar';

import {
  accessKindOf,
  byMatrixOrder,
  isFieldRole,
  SHIFTS,
  validationOf,
  type CompanyUser,
  type RolePermissions,
} from '../domain/roles';
import {
  useCompanyUsersQuery,
  useRemoveUserMutation,
  useRolesQuery,
  useUpdateUserMutation,
} from '../infrastructure/endpoints';
import { PermissionsPanel } from './PermissionsPanel';
import { AccessBadge, RoleSummary, useRoleLabel, ValidationBadge } from './RoleSummary';
import { UserEditModal } from './UserEditModal';
import { readUserError, UserFormModal } from './UserFormModal';

/**
 * Who has access, how, and to what.
 *
 * The page used to show a role name and nothing behind it, and could not hand
 * out any role the company made itself. It now reads as the plant's access
 * matrix: the profiles on top, each person's access and validation in the
 * table, and what they can actually do one click away.
 */
export default function UsersPage() {
  const { t } = useTranslation(['users', 'common']);
  const currentUserId = useAppSelector((state) => state.session.userId);
  const permissions = useAppSelector((state) => state.session.permissions);
  const canManage = permissions.includes('security.manage_user');
  const { data, isLoading, isError } = useCompanyUsersQuery();
  const roles = useRolesQuery();
  const roleLabel = useRoleLabel();
  const [updateUser, updating] = useUpdateUserMutation();
  const [removeUser] = useRemoveUserMutation();
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<CompanyUser | null>(null);
  const [inspecting, setInspecting] = useState<CompanyUser | null>(null);

  async function run(action: () => Promise<unknown>) {
    setError(null);
    try {
      await action();
    } catch (cause) {
      setError(readUserError(cause) ?? t('form.genericError'));
    }
  }

  const loaded = data ?? [];
  const catalogue = roles.data?.roles ?? [];
  const roleByCode = useMemo(
    () => new Map(catalogue.map((role) => [role.code, role])),
    [catalogue],
  );

  const specs: FilterSpec<CompanyUser>[] = [
    {
      key: 'role',
      label: t('filter.allRoles'),
      valueOf: (row) => row.role,
      labelOf: (value) => {
        const role = roleByCode.get(value);
        return role ? roleLabel(role) : value;
      },
    },
    {
      key: 'access',
      label: t('filter.allAccess'),
      valueOf: (row) => accessKindOf(row.base_role, row.permissions),
      labelOf: (value) => t(`access.${value}`),
    },
    {
      key: 'shift',
      label: t('filter.allShifts'),
      valueOf: (row) => row.shift || 'none',
      labelOf: (value) => (value === 'none' ? t('shift.none') : t('shift.label', { shift: value })),
    },
  ];
  const table = useTableFilter(loaded, (row) => `${row.full_name} ${row.email}`, specs);

  // The company's own profiles are the matrix; the shipped roles are there
  // for the people who hold them, not as the thing to read first.
  const profiles = catalogue.filter((role) => !role.is_system);
  const shown = [...(profiles.length > 0 ? profiles : catalogue)].sort(byMatrixOrder);

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
      // The role and the access it grants read as one thing, so they share a
      // cell: what the person is, and what that lets them do.
      render: (row) => (
        <span className="flex flex-col items-start gap-1">
          {canManage && row.id !== currentUserId ? (
            <select
              value={row.role}
              disabled={updating.isLoading}
              onChange={(event) =>
                void run(() => updateUser({ id: row.id, role: event.target.value }).unwrap())
              }
              className="max-w-52 rounded-lg border border-slate-300 px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-800"
            >
              {catalogue.map((role) => (
                <option key={role.code} value={role.code}>
                  {roleLabel(role)}
                </option>
              ))}
            </select>
          ) : (
            <span>{roleLabel({ code: row.role, name: row.role_name })}</span>
          )}
          <AccessBadge kind={accessKindOf(row.base_role, row.permissions)} />
        </span>
      ),
    },
    {
      key: 'validation',
      header: t('column.validation'),
      render: (row) => (
        <span className="flex flex-col items-start gap-1">
          <ValidationBadge validation={validationOf(row.base_role)} short />
          {isFieldRole(row.base_role) &&
            (row.has_access_code ? (
              <span className="whitespace-nowrap text-[11px] text-emerald-700 dark:text-emerald-400">
                {t('code.issuedOn', {
                  date: row.access_code_set_at ? formatDate(row.access_code_set_at) : '',
                })}
              </span>
            ) : (
              <span className="whitespace-nowrap text-[11px] font-medium text-amber-700 dark:text-amber-400">
                {t('code.none')}
              </span>
            ))}
        </span>
      ),
    },
    {
      key: 'shift',
      header: t('column.shift'),
      render: (row) => {
        if (!isFieldRole(row.base_role)) return <span className="text-slate-300">—</span>;
        if (!canManage) {
          return <span>{row.shift ? t('shift.label', { shift: row.shift }) : t('shift.none')}</span>;
        }
        return (
          <select
            value={row.shift}
            onChange={(event) =>
              void run(() => updateUser({ id: row.id, shift: event.target.value }).unwrap())
            }
            className="rounded-lg border border-slate-300 px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-800"
          >
            <option value="">{t('shift.none')}</option>
            {SHIFTS.map((shift) => (
              <option key={shift} value={shift}>
                {t('shift.label', { shift })}
              </option>
            ))}
          </select>
        );
      },
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
            onClick={() => void run(() => updateUser({ id: row.id, is_active: !row.is_active }).unwrap())}
            className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium hover:bg-slate-100 disabled:opacity-40 dark:border-slate-700 dark:hover:bg-slate-800"
          >
            {t(row.is_active ? 'action.deactivate' : 'action.activate')}
          </button>
        );
      },
    },
    {
      key: 'actions',
      header: '',
      render: (row) => (
        <span className="flex justify-end gap-3 whitespace-nowrap">
          <button onClick={() => setInspecting(row)} className="text-xs font-medium text-sky-600">
            {t('action.permissions')}
          </button>
          {canManage && (
            <>
              <button onClick={() => setEditing(row)} className="text-xs font-medium text-sky-600">
                {t('common:action.edit')}
              </button>
              {/* Access to this company, not the person: their name stays on
                  every reading and conclusion they signed. */}
              <button
                disabled={row.id === currentUserId}
                title={t('action.revokeHint')}
                onClick={() => void run(() => removeUser(row.id).unwrap())}
                className="text-xs font-medium text-red-600 disabled:cursor-not-allowed disabled:text-slate-400"
              >
                {t('action.revoke')}
              </button>
            </>
          )}
        </span>
      ),
    },
  ];

  if (isLoading) return <Spinner label={t('loading')} />;

  const field = loaded.filter((row) => isFieldRole(row.base_role));

  return (
    <Page>
      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
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
            <Metric label={t('metric.total')} value={loaded.length} />
            <Metric
              label={t('metric.field')}
              value={field.length}
              hint={t('metric.fieldHint')}
            />
            <Metric
              label={t('metric.withoutCode')}
              value={field.filter((row) => !row.has_access_code).length}
              hint={t('metric.withoutCodeHint')}
              tone={field.some((row) => !row.has_access_code) ? 'warn' : 'good'}
            />
            <Metric
              label={t('metric.inactive')}
              value={loaded.filter((row) => !row.is_active).length}
            />
          </MetricRow>

          <Card title={t('profiles.title')} description={t('profiles.hint')}>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {shown.map((role) => (
                <ProfileCard
                  key={role.code}
                  role={role}
                  members={loaded.filter((row) => row.role === role.code)}
                  active={table.active.role === role.code}
                  onPick={() =>
                    table.setFilter('role', table.active.role === role.code ? '' : role.code)
                  }
                />
              ))}
            </div>
          </Card>

          <Card
            title={t('table.title')}
            description={canManage ? t('table.hintManage') : t('table.hintRead')}
            actions={
              <TableToolbar
                query={table.query}
                onQuery={table.setQuery}
                placeholder={t('filter.search')}
                filters={specs.map((spec) => ({
                  key: spec.key,
                  label: spec.label,
                  options: table.options[spec.key] ?? [],
                }))}
                active={table.active}
                onFilter={table.setFilter}
                onClear={table.clear}
                activeCount={table.activeCount}
                total={loaded.length}
                shown={table.filtered.length}
              />
            }
            padded={false}
          >
            <DataTable
              columns={columns}
              rows={table.filtered}
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
      {inspecting && (
        <PermissionsPanel
          user={inspecting}
          role={roleByCode.get(inspecting.role)}
          catalogue={roles.data}
          onClose={() => setInspecting(null)}
        />
      )}
    </Page>
  );
}

/** One profile of the matrix. Clicking it narrows the table to its people. */
function ProfileCard({
  role,
  members,
  active,
  onPick,
}: {
  role: RolePermissions;
  members: CompanyUser[];
  active: boolean;
  onPick: () => void;
}) {
  const { t } = useTranslation('users');
  const label = useRoleLabel();
  return (
    <button
      onClick={onPick}
      aria-pressed={active}
      className={`rounded-xl border p-4 text-left transition-colors ${
        active
          ? 'border-sky-500 bg-sky-50/60 dark:border-sky-600 dark:bg-sky-950/30'
          : 'border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600'
      }`}
    >
      <p className="mb-2 font-medium">{label(role)}</p>
      <RoleSummary role={role} compact />
      <p className="mt-3 text-xs text-slate-400">
        {t('profiles.members', { count: members.length })}
      </p>
    </button>
  );
}
