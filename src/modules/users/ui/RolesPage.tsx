import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useAppSelector } from '@app/hooks';
import { Button } from '@shared/ui/Button';
import { Card } from '@shared/ui/Card';
import { ErrorState } from '@shared/ui/ErrorState';
import { FormField, Select, TextInput } from '@shared/ui/Form';
import { Page } from '@shared/ui/Page';
import { PageHeader } from '@shared/ui/PageHeader';
import { Spinner } from '@shared/ui/Spinner';

import { BASE_ROLES, type RolePermissions } from '../domain/roles';
import {
  useCreateRoleMutation,
  useDeleteRoleMutation,
  useRolesQuery,
  useUpdateRoleMutation,
} from '../infrastructure/endpoints';
import { PermissionMatrix } from './PermissionMatrix';
import { RoleSummary } from './RoleSummary';
import { readUserError } from './UserFormModal';

/**
 * Configuración → Permisos.
 *
 * One role at a time, with its permissions grouped by module and by what they
 * let you do to a record. A matrix of every role against sixty permissions is
 * technically complete and unreadable; picking a role first is what makes the
 * decision a human one.
 */
export default function RolesPage() {
  const { t } = useTranslation(['users', 'common']);
  const permissions = useAppSelector((state) => state.session.permissions);
  const canManage = permissions.includes('security.manage_role');
  const { data, isLoading, isError } = useRolesQuery();
  const [updateRole, updating] = useUpdateRoleMutation();
  const [createRole] = useCreateRoleMutation();
  const [deleteRole] = useDeleteRoleMutation();

  const [selected, setSelected] = useState<number | null>(null);
  const [granted, setGranted] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [newRole, setNewRole] = useState('');
  // Every company role says how it stands towards field data; read-only is
  // the default so that forgetting to choose never grants write access.
  const [newBase, setNewBase] = useState<string>('client_viewer');

  const role: RolePermissions | undefined =
    data?.roles.find((row) => row.id === selected) ?? data?.roles[0];

  useEffect(() => {
    if (role) setGranted(new Set(role.permissions));
  }, [role]);

  if (isLoading) return <Spinner label={t('roles.loading')} />;

  // How many ticks differ from what is saved: the number the save bar shows.
  const changes = role
    ? role.permissions.filter((code) => !granted.has(code)).length +
      [...granted].filter((code) => !role.permissions.includes(code)).length
    : 0;
  const dirty = changes > 0;

  async function run(action: () => Promise<unknown>) {
    setError(null);
    try {
      await action();
    } catch (cause) {
      setError(readUserError(cause) ?? t('form.genericError'));
    }
  }

  return (
    <Page>
      <PageHeader title={t('roles.title')} description={t('roles.subtitle')} />

      {error && <ErrorState title={error} />}
      {isError ? (
        <ErrorState title={t('common:state.failed')} body={t('common:state.failedBody')} />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[16rem_1fr]">
          <Card title={t('roles.list')}>
            <ul className="space-y-1">
              {data?.roles.map((row) => (
                <li key={row.id}>
                  <button
                    onClick={() => {
                      // Switching role re-reads its saved ticks: say so before losing them.
                      if (dirty && row.id !== role?.id && !window.confirm(t('roles.leaveUnsaved'))) return;
                      setSelected(row.id);
                    }}
                    className={[
                      'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm',
                      row.id === role?.id
                        ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                        : 'hover:bg-slate-100 dark:hover:bg-slate-800',
                    ].join(' ')}
                  >
                    <span className="flex-1 truncate">{t(`role.${row.code}`, { defaultValue: row.name })}</span>
                    <span className="text-xs opacity-70">{row.member_count}</span>
                  </button>
                </li>
              ))}
            </ul>

            {canManage && (
              <div className="mt-4 space-y-2 border-t border-slate-100 pt-4 dark:border-slate-800">
                <FormField label={t('roles.newName')}>
                  <TextInput
                    value={newRole}
                    onChange={(event) => setNewRole(event.target.value)}
                    placeholder={t('roles.newPlaceholder')}
                  />
                </FormField>
                <FormField label={t('roles.base')} hint={t('roles.baseHint')}>
                  <Select value={newBase} onChange={(event) => setNewBase(event.target.value)}>
                    {BASE_ROLES.map((base) => (
                      <option key={base} value={base}>
                        {t(`base.${base}`)}
                      </option>
                    ))}
                  </Select>
                </FormField>
                <Button
                  variant="primary"
                  disabled={!newRole.trim()}
                  onClick={() =>
                    void run(async () => {
                      await createRole({
                        name: newRole, permissions: [], base_role: newBase,
                      }).unwrap();
                      setNewRole('');
                    })
                  }
                >
                  + {t('common:action.add')}
                </Button>
              </div>
            )}
          </Card>

          {role && (
            <Card
              title={t(`role.${role.code}`, { defaultValue: role.name })}
              description={t('roles.memberCount', { count: role.member_count })}
              actions={
                canManage && (
                  <div className="flex shrink-0 gap-2">
                    <Button
                      variant="primary"
                      disabled={!dirty || updating.isLoading}
                      onClick={() =>
                        void run(() =>
                          updateRole({ id: role.id, permissions: [...granted] }).unwrap(),
                        )
                      }
                    >
                      {dirty ? t('roles.save') : t('roles.saved')}
                    </Button>
                    {!role.is_system && role.member_count === 0 && (
                      <Button
                        variant="danger"
                        onClick={() => void run(() => deleteRole(role.id).unwrap())}
                      >
                        {t('common:action.delete')}
                      </Button>
                    )}
                  </div>
                )
              }
            >
              <div className="mb-5 space-y-3">
                <RoleSummary role={{ ...role, permissions: [...granted] }} />
                {canManage && !role.is_system && (
                  <FormField label={t('roles.base')} hint={t('roles.baseHint')}>
                    <Select
                      value={role.base_role}
                      onChange={(event) =>
                        void run(() =>
                          updateRole({ id: role.id, base_role: event.target.value }).unwrap(),
                        )
                      }
                    >
                      {BASE_ROLES.map((base) => (
                        <option key={base} value={base}>
                          {t(`base.${base}`)}
                        </option>
                      ))}
                    </Select>
                  </FormField>
                )}
                <p className="text-xs text-slate-500">{t(`behaviour.${role.base_role}`)}</p>
              </div>
              <PermissionMatrix
                modules={data?.modules ?? []}
                granted={granted}
                editable={canManage}
                onChange={setGranted}
              />
            </Card>
          )}
        </div>
      )}

      {/* Unsaved ticks are easy to lose by clicking another role: the bar
          stays in sight until they are saved or thrown away. */}
      {canManage && role && dirty && (
        <div className="sticky bottom-4 z-10 mx-auto flex max-w-xl items-center gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm shadow-lg dark:border-amber-800 dark:bg-amber-950">
          <span className="flex-1 text-amber-900 dark:text-amber-200">{t('roles.pending', { count: changes })}</span>
          <Button onClick={() => setGranted(new Set(role.permissions))}>{t('roles.discard')}</Button>
          <Button
            variant="primary"
            disabled={updating.isLoading}
            onClick={() => void run(() => updateRole({ id: role.id, permissions: [...granted] }).unwrap())}
          >
            {t('roles.save')}
          </Button>
        </div>
      )}
    </Page>
  );
}
