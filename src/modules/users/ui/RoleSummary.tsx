import { useTranslation } from 'react-i18next';

import {
  accessKindOf,
  validationOf,
  type AccessKind,
  type RolePermissions,
  type Validation,
} from '../domain/roles';

/** Read-only is calm, write access stands out: the line that matters in the
 *  matrix is the one between reading the plant and changing it. */
const ACCESS_TONE: Record<AccessKind, string> = {
  read: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  read_audit: 'bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300',
  read_write: 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300',
  admin: 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300',
};

const VALIDATION_TONE: Record<Validation, string> = {
  corporate: 'border-slate-300 text-slate-600 dark:border-slate-600 dark:text-slate-300',
  personal_code: 'border-sky-400 text-sky-700 dark:border-sky-700 dark:text-sky-300',
};

/**
 * A role's display name. The shipped roles are stored with English names and
 * translated here; a company's own roles are shown as the company named them.
 */
export function useRoleLabel(): (role: { code: string; name: string; is_system?: boolean }) => string {
  const { t } = useTranslation('users');
  return (role) => t(`role.${role.code}`, { defaultValue: role.name });
}

export function AccessBadge({ kind }: { kind: AccessKind }) {
  const { t } = useTranslation('users');
  return (
    <span
      className={`whitespace-nowrap rounded px-2 py-0.5 text-[11px] font-semibold ${ACCESS_TONE[kind]}`}
    >
      {t(`access.${kind}`)}
    </span>
  );
}

export function ValidationBadge({
  validation,
  short = false,
}: {
  validation: Validation;
  short?: boolean;
}) {
  const { t } = useTranslation('users');
  return (
    <span
      className={`whitespace-nowrap rounded border px-2 py-0.5 text-[11px] ${VALIDATION_TONE[validation]}`}
    >
      {t(short ? `validationShort.${validation}` : `validation.${validation}`)}
    </span>
  );
}

/**
 * One row of the plant's access matrix: role, access, validation, functions.
 */
export function RoleSummary({
  role,
  compact = false,
}: {
  role: RolePermissions;
  compact?: boolean;
}) {
  const { t } = useTranslation('users');
  const label = useRoleLabel();
  const kind = accessKindOf(role.base_role, role.permissions);

  return (
    <div className={compact ? 'space-y-1.5' : 'space-y-2 rounded-lg border border-slate-200 p-3 dark:border-slate-700'}>
      <div className="flex flex-wrap items-center gap-2">
        {!compact && <span className="text-sm font-medium">{label(role)}</span>}
        <AccessBadge kind={kind} />
        <ValidationBadge validation={validationOf(role.base_role)} />
      </div>
      {role.description && (
        <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
          {role.description}
        </p>
      )}
      {!compact && (
        <p className="text-[11px] text-slate-400">
          {t('summary.basedOn', { base: t(`base.${role.base_role}`) })} ·{' '}
          {t('summary.permissionCount', { count: role.permissions.length })}
        </p>
      )}
    </div>
  );
}
