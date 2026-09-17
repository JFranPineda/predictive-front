import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@shared/ui/Button';
import { FormField, Select, TextInput } from '@shared/ui/Form';
import { Modal } from '@shared/ui/Modal';

import { ROLES } from '../domain/roles';
import { useCreateUserMutation } from '../infrastructure/endpoints';

const MIN_PASSWORD = 10;

export function UserFormModal({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation(['users', 'common']);
  const [create, { isLoading }] = useCreateUserMutation();
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState({
    email: '',
    first_name: '',
    last_name: '',
    initials: '',
    role: 'technician',
    password: '',
  });

  const passwordTooShort = draft.password.length > 0 && draft.password.length < MIN_PASSWORD;

  async function submit() {
    setError(null);
    try {
      await create(draft).unwrap();
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
              isLoading ||
              !draft.email.includes('@') ||
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
            value={draft.role}
            onChange={(event) => setDraft({ ...draft, role: event.target.value })}
          >
            {ROLES.map((role) => (
              <option key={role} value={role}>
                {t(`role.${role}`)}
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
      </div>

      {draft.role === 'external_inspector' && (
        <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
          {t('form.externalNotice')}
        </p>
      )}
    </Modal>
  );
}

export function readUserError(cause: unknown): string | null {
  const data = (cause as { data?: unknown })?.data;
  if (data && typeof data === 'object') {
    const payload = data as Record<string, unknown>;
    if (typeof payload.title === 'string') return payload.title;
    if (typeof payload.detail === 'string') return payload.detail;
  }
  if (typeof data === 'string') return data;
  return null;
}
