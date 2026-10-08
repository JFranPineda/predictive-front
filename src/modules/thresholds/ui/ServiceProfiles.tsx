import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { readError } from '@shared/lib/apiError';
import { Button } from '@shared/ui/Button';
import { Card } from '@shared/ui/Card';
import { TextInput } from '@shared/ui/Form';
import { Modal } from '@shared/ui/Modal';
import { StatusBadge } from '@shared/ui/StatusBadge';

import type { ConditionStatus, StatusProfile } from '../domain/types';
import { useSaveStatusProfileMutation, useStatusProfilesQuery } from '../infrastructure/endpoints';

/**
 * Each service's set of states: which conditions its normas grade into and
 * which availabilities a technician may declare instead of a value, with a
 * name of its own where the service says it differently (UT's "Medio").
 *
 * One set per service. Vibration with and without isolators is one service
 * with one set; what differs between them is the limits, and limits live in
 * Umbrales, per class of the norma.
 */
export function ServiceProfiles({ statuses, canManage }: { statuses: ConditionStatus[]; canManage: boolean }) {
  const { t } = useTranslation('thresholds');
  const { data } = useStatusProfilesQuery();
  const [editing, setEditing] = useState<StatusProfile | null>(null);

  return (
    <Card title={t('profiles.title')} description={t('profiles.hint')} padded={false}>
      <ul className="divide-y divide-slate-100 dark:divide-slate-800">
        {(data ?? []).map((profile) => (
          <li key={profile.technique.code} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
            <span className="w-48 shrink-0 font-medium">{profile.technique.name}</span>
            <span className="flex min-w-0 flex-1 flex-wrap gap-1.5">
              {profile.options.length === 0 ? (
                <span className="text-xs text-slate-400">{t('profiles.none')}</span>
              ) : (
                profile.options.map((option) => (
                  <StatusBadge key={option.status} label={option.display_name || option.name} color={option.color} size="sm" />
                ))
              )}
            </span>
            {canManage && <Button onClick={() => setEditing(profile)}>{t('profiles.edit')}</Button>}
          </li>
        ))}
      </ul>
      {editing && <ProfileModal profile={editing} statuses={statuses} onClose={() => setEditing(null)} />}
    </Card>
  );
}

function ProfileModal({
  profile,
  statuses,
  onClose,
}: {
  profile: StatusProfile;
  statuses: ConditionStatus[];
  onClose: () => void;
}) {
  const { t } = useTranslation(['thresholds', 'common']);
  const [save, saving] = useSaveStatusProfileMutation();
  const [chosen, setChosen] = useState<Record<number, string>>(() =>
    Object.fromEntries(profile.options.map((option) => [option.status, option.display_name])),
  );
  const [error, setError] = useState<string | null>(null);
  // Conditions by severity, then availabilities: the order every list reads.
  const ordered = [...statuses].sort(
    (a, b) => (a.kind === b.kind ? a.severity - b.severity : a.kind === 'condition' ? -1 : 1),
  );

  function toggle(id: number) {
    setChosen((current) =>
      id in current
        ? Object.fromEntries(Object.entries(current).filter(([key]) => Number(key) !== id))
        : { ...current, [id]: '' },
    );
  }

  async function submit() {
    setError(null);
    try {
      await save({
        technique: profile.technique.code,
        options: ordered
          .filter((status) => status.id in chosen)
          .map((status) => ({ status: status.id, display_name: chosen[status.id] ?? '' })),
      }).unwrap();
      onClose();
    } catch (cause) {
      setError(readError(cause) ?? t('form.genericError'));
    }
  }

  return (
    <Modal
      title={t('profiles.modalTitle', { service: profile.technique.name })}
      description={t('profiles.modalHint')}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>{t('common:action.cancel')}</Button>
          <Button variant="primary" disabled={saving.isLoading} onClick={() => void submit()}>
            {t('common:action.save')}
          </Button>
        </>
      }
    >
      {error && <p className="rounded-lg bg-red-50 p-2 text-sm text-red-700">{error}</p>}
      {(['condition', 'availability'] as const).map((kind) => (
        <section key={kind}>
          <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-slate-500">{t(`statuses.${kind}`)}</h3>
          <ul className="space-y-1.5">
            {ordered
              .filter((status) => status.kind === kind)
              .map((status) => (
                <li key={status.id} className="flex items-center gap-3 text-sm">
                  <label className="flex w-56 shrink-0 items-center gap-2">
                    <input type="checkbox" checked={status.id in chosen} onChange={() => toggle(status.id)} />
                    <StatusBadge label={status.name} color={status.color} size="sm" />
                  </label>
                  {status.id in chosen && (
                    <TextInput
                      value={chosen[status.id] ?? ''}
                      placeholder={t('profiles.renameHint', { name: status.name })}
                      onChange={(event) => setChosen({ ...chosen, [status.id]: event.target.value })}
                      className="max-w-xs"
                    />
                  )}
                </li>
              ))}
          </ul>
        </section>
      ))}
    </Modal>
  );
}
