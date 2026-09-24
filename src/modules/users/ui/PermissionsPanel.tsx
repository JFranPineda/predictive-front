import { useTranslation } from 'react-i18next';

import { Button } from '@shared/ui/Button';
import { Modal } from '@shared/ui/Modal';

import {
  groupByModule,
  type CompanyUser,
  type RoleCatalogue,
  type RolePermissions,
} from '../domain/roles';
import { RoleSummary } from './RoleSummary';

/**
 * What one person can actually do.
 *
 * Two answers, because permissions alone do not tell the whole story: the
 * list says which screens and actions are open, and the behaviour line says
 * the thing a checkbox cannot — whether this person can alter field data at
 * all, and whose.
 */
export function PermissionsPanel({
  user,
  role,
  catalogue,
  onClose,
}: {
  user: CompanyUser;
  role: RolePermissions | undefined;
  catalogue: RoleCatalogue | undefined;
  onClose: () => void;
}) {
  const { t } = useTranslation(['users', 'common']);
  const groups = groupByModule(user.permissions, catalogue);

  return (
    <Modal
      title={t('panel.title', { name: user.full_name })}
      description={t('panel.hint')}
      onClose={onClose}
      footer={<Button onClick={onClose}>{t('common:action.close')}</Button>}
    >
      {role && <RoleSummary role={role} />}

      <p className="rounded-lg bg-slate-50 p-3 text-sm dark:bg-slate-800/60">
        <span className="font-medium">{t('panel.fieldData')}: </span>
        {t(`behaviour.${user.base_role}`)}
      </p>

      {groups.length === 0 ? (
        <p className="text-sm text-slate-500">{t('panel.nothing')}</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {groups.map((group) => (
            <section
              key={group.module}
              className="rounded-lg border border-slate-200 p-3 dark:border-slate-700"
            >
              <h3 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                {t(`module.${group.module}`, { defaultValue: group.module })}
              </h3>
              <ul className="space-y-1">
                {group.entries.map((entry) => (
                  <li key={entry.code} className="flex items-start gap-2 text-sm">
                    <span
                      aria-hidden
                      className={`mt-1.5 size-1.5 shrink-0 rounded-full ${
                        entry.action === 'view' ? 'bg-slate-400' : 'bg-sky-500'
                      }`}
                    />
                    <span>
                      {entry.description || entry.code}
                      <span className="ml-1 font-mono text-[10px] text-slate-400">{entry.code}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </Modal>
  );
}
