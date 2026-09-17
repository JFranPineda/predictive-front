import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@shared/ui/Button';
import { ChipPicker, FormField, TextArea, TextInput } from '@shared/ui/Form';
import { Modal } from '@shared/ui/Modal';

import type { Standard, StandardDraft, TechniqueRef } from '../domain/types';
import {
  useCreateStandardMutation,
  useTechniquesQuery,
  useUpdateStandardMutation,
} from '../infrastructure/endpoints';

export function StandardFormModal({
  standard,
  onClose,
}: {
  standard?: Standard;
  onClose: () => void;
}) {
  const { t } = useTranslation('thresholds');
  const techniques = useTechniquesQuery();
  const [create, creating] = useCreateStandardMutation();
  const [update, updating] = useUpdateStandardMutation();

  const [draft, setDraft] = useState<StandardDraft>({
    code: standard?.code,
    name: standard?.name ?? '',
    source: standard?.source ?? '',
    description: standard?.description ?? '',
    techniques: standard?.techniques.map((technique) => technique.code) ?? [],
    machine_classes: standard?.machine_classes.map((row) => ({
      code: row.code,
      name: row.name,
      description: row.description,
    })) ?? [],
  });
  const [error, setError] = useState<string | null>(null);

  const busy = creating.isLoading || updating.isLoading;

  async function submit() {
    setError(null);
    try {
      if (standard) await update({ ...draft, id: standard.id }).unwrap();
      else await create(draft).unwrap();
      onClose();
    } catch (cause) {
      setError(readError(cause) ?? t('form.genericError'));
    }
  }

  return (
    <Modal
      title={standard ? t('form.editStandard') : t('form.newStandard')}
      description={t('form.standardHint')}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>{t('common:action.cancel')}</Button>
          <Button variant="primary" disabled={busy || !draft.name.trim()} onClick={() => void submit()}>
            {t('common:action.save')}
          </Button>
        </>
      }
    >
      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <FormField label={t('form.name')}>
        <TextInput
          value={draft.name}
          onChange={(event) => setDraft({ ...draft, name: event.target.value })}
          placeholder="ISO 10816-3"
        />
      </FormField>

      <FormField label={t('form.techniques')} hint={t('form.techniquesHint')}>
        <ChipPicker
          options={(techniques.data ?? []) as TechniqueRef[]}
          selected={draft.techniques}
          onToggle={(code) =>
            setDraft({
              ...draft,
              techniques: draft.techniques.includes(code)
                ? draft.techniques.filter((entry) => entry !== code)
                : [...draft.techniques, code],
            })
          }
        />
      </FormField>

      <FormField label={t('form.source')} hint={t('form.sourceHint')}>
        <TextInput
          value={draft.source}
          onChange={(event) => setDraft({ ...draft, source: event.target.value })}
        />
      </FormField>

      <FormField label={t('form.description')}>
        <TextArea
          rows={2}
          value={draft.description}
          onChange={(event) => setDraft({ ...draft, description: event.target.value })}
        />
      </FormField>

      <FormField label={t('form.machineClasses')} hint={t('form.machineClassesHint')}>
        <div className="space-y-2">
          {draft.machine_classes.map((machineClass, index) => (
            <div key={index} className="flex gap-2">
              <TextInput
                value={machineClass.name}
                placeholder={t('form.classNamePlaceholder')}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    machine_classes: draft.machine_classes.map((row, position) =>
                      position === index ? { ...row, name: event.target.value } : row,
                    ),
                  })
                }
              />
              <TextInput
                value={machineClass.description ?? ''}
                placeholder={t('form.classDescriptionPlaceholder')}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    machine_classes: draft.machine_classes.map((row, position) =>
                      position === index ? { ...row, description: event.target.value } : row,
                    ),
                  })
                }
              />
              <Button
                variant="ghost"
                onClick={() =>
                  setDraft({
                    ...draft,
                    machine_classes: draft.machine_classes.filter((_, p) => p !== index),
                  })
                }
              >
                ✕
              </Button>
            </div>
          ))}
          <Button
            onClick={() =>
              setDraft({
                ...draft,
                machine_classes: [...draft.machine_classes, { name: '', description: '' }],
              })
            }
          >
            + {t('form.addClass')}
          </Button>
        </div>
      </FormField>
    </Modal>
  );
}

/** DRF sends either a list of messages or an object keyed by field. */
export function readError(cause: unknown): string | null {
  const data = (cause as { data?: unknown })?.data;
  if (typeof data === 'string') return data;
  if (Array.isArray(data)) return String(data[0]);
  if (data && typeof data === 'object') {
    const first = Object.values(data as Record<string, unknown>)[0];
    if (Array.isArray(first)) return String(first[0]);
    if (typeof first === 'string') return first;
  }
  return null;
}
