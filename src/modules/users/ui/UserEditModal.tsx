import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useAreasQuery } from '@modules/assets';
import { Button } from '@shared/ui/Button';
import { FormField, TextInput } from '@shared/ui/Form';
import { Modal } from '@shared/ui/Modal';

import type { CompanyUser } from '../domain/roles';
import { useRemoveUserMutation, useUpdateUserMutation } from '../infrastructure/endpoints';
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
  const [update, { isLoading }] = useUpdateUserMutation();
  const [removeUser] = useRemoveUserMutation();
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState({
    first_name: user.full_name.split(' ')[0] ?? '',
    last_name: user.full_name.split(' ').slice(1).join(' '),
    initials: user.initials,
    password: '',
  });
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
      </div>

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
