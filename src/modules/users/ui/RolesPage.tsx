import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useAppSelector } from '@app/hooks';
import { Button } from '@shared/ui/Button';
import { Card } from '@shared/ui/Card';
import { ErrorState } from '@shared/ui/ErrorState';
import { FormField, TextInput } from '@shared/ui/Form';
import { Page } from '@shared/ui/Page';
import { PageHeader } from '@shared/ui/PageHeader';
import { Spinner } from '@shared/ui/Spinner';

import { ACTION_ORDER, type RolePermissions } from '../domain/roles';
import {
  useCreateRoleMutation,
  useDeleteRoleMutation,
  useRolesQuery,
  useUpdateRoleMutation,
} from '../infrastructure/endpoints';
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

  const role: RolePermissions | undefined =
    data?.roles.find((row) => row.id === selected) ?? data?.roles[0];

  useEffect(() => {
    if (role) setGranted(new Set(role.permissions));
  }, [role]);

  if (isLoading) return <Spinner label={t('roles.loading')} />;

  const dirty =
    role && (granted.size !== role.permissions.length ||
      role.permissions.some((code) => !granted.has(code)));

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
                    onClick={() => setSelected(row.id)}
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
                <Button
                  variant="primary"
                  disabled={!newRole.trim()}
                  onClick={() =>
                    void run(async () => {
                      await createRole({ name: newRole, permissions: [] }).unwrap();
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
              <div className="space-y-5">
                {data?.modules.map((module) => (
                  <section key={module.code}>
                    <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-slate-400">
                      {module.code}
                    </h3>
                    <div className="grid gap-x-6 gap-y-1.5 sm:grid-cols-2 lg:grid-cols-3">
                      {[...module.permissions]
                        .sort(
                          (a, b) =>
                            ACTION_ORDER.indexOf(a.action as (typeof ACTION_ORDER)[number]) -
                            ACTION_ORDER.indexOf(b.action as (typeof ACTION_ORDER)[number]),
                        )
                        .map((permission) => (
                          <label
                            key={permission.code}
                            className="flex items-start gap-2 text-sm"
                            title={permission.code}
                          >
                            <input
                              type="checkbox"
                              disabled={!canManage}
                              checked={granted.has(permission.code)}
                              onChange={(event) => {
                                const next = new Set(granted);
                                if (event.target.checked) next.add(permission.code);
                                else next.delete(permission.code);
                                setGranted(next);
                              }}
                              className="mt-0.5"
                            />
                            <span className="min-w-0">
                              <span className="block leading-tight">{permission.description}</span>
                              <span className="block text-[11px] text-slate-400">
                                {t(`roles.action.${permission.action}`)}
                              </span>
                            </span>
                          </label>
                        ))}
                    </div>
                  </section>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}
    </Page>
  );
}
