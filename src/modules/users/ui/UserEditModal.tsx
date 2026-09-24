import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useAreasQuery } from '@modules/assets';
import { formatDateTime } from '@app/i18n/format';
import { Button } from '@shared/ui/Button';
import { FormField, Select, TextInput } from '@shared/ui/Form';
import { Modal } from '@shared/ui/Modal';

import { isFieldRole, SHIFTS, type CompanyUser } from '../domain/roles';
import {
  useIssueAccessCodeMutation,
  useRemoveUserMutation,
  useRevokeAccessCodeMutation,
  useRolesQuery,
  useUpdateUserMutation,
} from '../infrastructure/endpoints';
import { RoleSummary, useRoleLabel } from './RoleSummary';
import { readUserError } from './UserFormModal';

const MIN_PASSWORD = 10;

export function UserEditModal({
  user,
  isSelf,
  onClose,
}: {
  user: CompanyUser;
  isSelf: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation(['users', 'common']);
  const areas = useAreasQuery();
  const roles = useRolesQuery();
  const roleLabel = useRoleLabel();
  const [update, { isLoading }] = useUpdateUserMutation();
  const [removeUser] = useRemoveUserMutation();
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<{
    first_name: string;
    last_name: string;
    initials: string;
    password: string;
    role: string;
    shift: string;
  }>({
    first_name: user.full_name.split(' ')[0] ?? '',
    last_name: user.full_name.split(' ').slice(1).join(' '),
    initials: user.initials,
    password: '',
    role: user.role,
    shift: user.shift,
  });
  const chosen = roles.data?.roles.find((role) => role.code === draft.role);
  const field = chosen ? isFieldRole(chosen.base_role) : isFieldRole(user.base_role);
  const [scope, setScope] = useState<Set<number>>(
    new Set(user.area_restrictions.map((ref) => Number(ref))),
  );

  async function run(action: () => Promise<unknown>) {
    setError(null);
    try {
      await action();
      onClose();
    } catch (cause) {
      setError(readUserError(cause) ?? t('form.genericError'));
    }
  }

  async function save() {
    await run(() =>
      update({
        id: user.id,
        first_name: draft.first_name,
        last_name: draft.last_name,
        initials: draft.initials,
        area_restrictions: [...scope],
        shift: field ? draft.shift : '',
        // Changing your own role is refused by the server; not sending it
        // keeps a harmless save from failing on that rule.
        ...(isSelf || draft.role === user.role ? {} : { role: draft.role }),
        ...(draft.password ? { password: draft.password } : {}),
      }).unwrap(),
    );
  }

  return (
    <Modal
      title={t('edit.title', { name: user.full_name })}
      description={t('edit.hint')}
      onClose={onClose}
      footer={
        <>
          {!isSelf && (
            <Button
              variant="danger"
              className="mr-auto"
              onClick={() => void run(() => removeUser(user.id).unwrap())}
            >
              {t('edit.revoke')}
            </Button>
          )}
          <Button onClick={onClose}>{t('common:action.cancel')}</Button>
          <Button
            variant="primary"
            disabled={isLoading || (draft.password.length > 0 && draft.password.length < MIN_PASSWORD)}
            onClick={() => void save()}
          >
            {t('common:action.save')}
          </Button>
        </>
      }
    >
      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label={t('form.firstName')}>
          <TextInput
            value={draft.first_name}
            onChange={(event) => setDraft({ ...draft, first_name: event.target.value })}
          />
        </FormField>
        <FormField label={t('form.lastName')}>
          <TextInput
            value={draft.last_name}
            onChange={(event) => setDraft({ ...draft, last_name: event.target.value })}
          />
        </FormField>
        <FormField label={t('form.initials')} hint={t('form.initialsHint')}>
          <TextInput
            maxLength={6}
            value={draft.initials}
            onChange={(event) => setDraft({ ...draft, initials: event.target.value.toUpperCase() })}
          />
        </FormField>
        <FormField
          label={t('edit.newPassword')}
          hint={t('edit.newPasswordHint', { count: MIN_PASSWORD })}
        >
          <TextInput
            type="password"
            value={draft.password}
            onChange={(event) => setDraft({ ...draft, password: event.target.value })}
          />
        </FormField>
        <FormField label={t('form.role')} hint={isSelf ? t('edit.ownRole') : undefined}>
          <Select
            value={draft.role}
            disabled={isSelf}
            onChange={(event) => setDraft({ ...draft, role: event.target.value })}
          >
            {(roles.data?.roles ?? []).map((role) => (
              <option key={role.code} value={role.code}>
                {roleLabel(role)}
              </option>
            ))}
          </Select>
        </FormField>
        {field && (
          <FormField label={t('form.shift')} hint={t('form.shiftHint')}>
            <Select
              value={draft.shift}
              onChange={(event) => setDraft({ ...draft, shift: event.target.value })}
            >
              <option value="">{t('shift.none')}</option>
              {SHIFTS.map((shift) => (
                <option key={shift} value={shift}>
                  {t('shift.label', { shift })}
                </option>
              ))}
            </Select>
          </FormField>
        )}
      </div>

      {chosen && <RoleSummary role={chosen} />}

      {/* Only for field staff: management signs in with its corporate
          credential, as the access matrix asks. */}
      {field && <AccessCodeSection user={user} />}

      <FormField label={t('edit.scope')} hint={t('edit.scopeHint')}>
        <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-slate-200 p-2 dark:border-slate-700">
          {areas.data?.results.map((area) => (
            <label key={area.id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={scope.has(area.id)}
                onChange={(event) => {
                  const next = new Set(scope);
                  if (event.target.checked) next.add(area.id);
                  else next.delete(area.id);
                  setScope(next);
                }}
              />
              <span className="font-mono text-xs text-slate-400">{area.code}</span>
              {area.name}
            </label>
          ))}
        </div>
      </FormField>
      <p className="text-xs text-slate-400">
        {scope.size === 0 ? t('edit.scopeAll') : t('edit.scopeSome', { count: scope.size })}
      </p>
    </Modal>
  );
}


/**
 * The technician's personal code.
 *
 * Shown once, at the moment it is issued, and never again: only a digest is
 * stored. Losing it means issuing another, which also revokes the lost one.
 */
function AccessCodeSection({ user }: { user: CompanyUser }) {
  const { t } = useTranslation('users');
  const [issue, issuing] = useIssueAccessCodeMutation();
  const [revoke, revoking] = useRevokeAccessCodeMutation();
  const [code, setCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  async function run(action: () => Promise<void>) {
    setProblem(null);
    try {
      await action();
    } catch (cause) {
      setProblem(readUserError(cause) ?? t('form.genericError'));
    }
  }

  return (
    <section className="space-y-2 rounded-lg border border-sky-200 bg-sky-50/50 p-3 dark:border-sky-900 dark:bg-sky-950/20">
      <header className="flex flex-wrap items-center gap-2">
        <h3 className="text-sm font-medium">{t('code.title')}</h3>
        <span className="text-xs text-slate-500">
          {user.has_access_code && user.access_code_set_at
            ? t('code.issuedAt', { when: formatDateTime(user.access_code_set_at) })
            : t('code.none')}
        </span>
      </header>

      {problem && <p className="text-xs text-red-600">{problem}</p>}

      {code ? (
        <div className="space-y-2">
          <p className="text-xs font-medium text-amber-800 dark:text-amber-300">
            {t('code.onlyOnce')}
          </p>
          <div className="flex items-center gap-2">
            <code className="rounded-lg bg-slate-900 px-4 py-2 font-mono text-2xl tracking-[0.3em] text-white dark:bg-slate-100 dark:text-slate-900">
              {code}
            </code>
            <Button
              onClick={() =>
                void navigator.clipboard.writeText(code).then(() => setCopied(true))
              }
            >
              {copied ? t('code.copied') : t('code.copy')}
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-xs text-slate-500">{t('code.hint')}</p>
      )}

      <div className="flex gap-2">
        <Button
          variant="primary"
          disabled={issuing.isLoading}
          onClick={() =>
            void run(async () => {
              const answer = await issue(user.id).unwrap();
              setCode(answer.code);
              setCopied(false);
            })
          }
        >
          {user.has_access_code ? t('code.reissue') : t('code.issue')}
        </Button>
        {user.has_access_code && !code && (
          <Button
            variant="danger"
            disabled={revoking.isLoading}
            onClick={() => void run(() => revoke(user.id).unwrap())}
          >
            {t('code.revoke')}
          </Button>
        )}
      </div>
    </section>
  );
}
