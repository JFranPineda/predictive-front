import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@shared/ui/Button';
import { FormField, Select, TextInput } from '@shared/ui/Form';
import { Modal } from '@shared/ui/Modal';

import { isFieldRole, SHIFTS, type RolePermissions } from '../domain/roles';
import { useCreateUserMutation, useRolesQuery } from '../infrastructure/endpoints';
import { RoleSummary, useRoleLabel } from './RoleSummary';

const MIN_PASSWORD = 10;

/**
 * Brings a person into the company.
 *
 * The roles on offer are the company's own, not a fixed list: a list pinned
 * to the seven shipped roles is what made every profile the company built
 * impossible to give to anybody.
 */
export function UserFormModal({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation(['users', 'common']);
  const roles = useRolesQuery();
  const [create, { isLoading }] = useCreateUserMutation();
  const roleLabel = useRoleLabel();
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState({
    email: '',
    first_name: '',
    last_name: '',
    initials: '',
    role: '',
    password: '',
    shift: '',
  });

  const available = roles.data?.roles ?? [];
  const chosen: RolePermissions | undefined = useMemo(
    () => available.find((role) => role.code === draft.role) ?? available[0],
    [available, draft.role],
  );
  const field = chosen ? isFieldRole(chosen.base_role) : false;
  const passwordTooShort = draft.password.length > 0 && draft.password.length < MIN_PASSWORD;

  async function submit() {
    if (!chosen) return;
    setError(null);
    try {
      await create({ ...draft, role: chosen.code, shift: field ? draft.shift : '' }).unwrap();
      onClose();
    } catch (cause) {
      setError(readUserError(cause) ?? t('form.genericError'));
    }
  }

  return (
    <Modal
      title={t('form.title')}
      description={t('form.hint')}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>{t('common:action.cancel')}</Button>
          <Button
            variant="primary"
            disabled={
              isLoading || !chosen || !draft.email.includes('@') ||
              draft.password.length < MIN_PASSWORD
            }
            onClick={() => void submit()}
          >
            {t('form.create')}
          </Button>
        </>
      }
    >
      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label={t('form.email')}>
          <TextInput
            type="email"
            value={draft.email}
            onChange={(event) => setDraft({ ...draft, email: event.target.value })}
            placeholder="persona@empresa.com"
          />
        </FormField>

        <FormField label={t('form.role')} hint={t('form.roleHint')}>
          <Select
            value={chosen?.code ?? ''}
            onChange={(event) => setDraft({ ...draft, role: event.target.value })}
          >
            {available.map((role) => (
              <option key={role.code} value={role.code}>
                {roleLabel(role)}
              </option>
            ))}
          </Select>
        </FormField>

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
            placeholder="HT"
          />
        </FormField>

        <FormField
          label={t('form.password')}
          hint={t('form.passwordHint', { count: MIN_PASSWORD })}
          error={passwordTooShort ? t('form.passwordShort', { count: MIN_PASSWORD }) : undefined}
        >
          <TextInput
            type="password"
            value={draft.password}
            onChange={(event) => setDraft({ ...draft, password: event.target.value })}
          />
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

      {/* What is being granted, read before it is granted. */}
      {chosen && <RoleSummary role={chosen} />}

      {field && (
        <p className="rounded-lg bg-sky-50 p-3 text-xs text-sky-900 dark:bg-sky-950/40 dark:text-sky-200">
          {t('form.codeNotice')}
        </p>
      )}
    </Modal>
  );
}

export function readUserError(cause: unknown): string | null {
  const data = (cause as { data?: unknown })?.data;
  // DRF's ValidationError arrives as a bare list of messages.
  if (Array.isArray(data) && typeof data[0] === 'string') return data[0];
  if (data && typeof data === 'object') {
    const payload = data as Record<string, unknown>;
    if (typeof payload.title === 'string') return payload.title;
    if (typeof payload.detail === 'string') return payload.detail;
  }
  if (typeof data === 'string') return data;
  return null;
}
