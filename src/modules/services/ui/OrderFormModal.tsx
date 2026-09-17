import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { usePlantsQuery } from '@modules/assets';
import { useTechniquesQuery } from '@modules/thresholds';
import { Button } from '@shared/ui/Button';
import { FormField, Select, TextInput } from '@shared/ui/Form';
import { Modal } from '@shared/ui/Modal';

import { useCreateServiceOrderMutation } from '../infrastructure/endpoints';
import { readServiceError } from './readServiceError';

export function OrderFormModal({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation(['services', 'common']);
  const plants = usePlantsQuery();
  const techniques = useTechniquesQuery();
  const [create, { isLoading }] = useCreateServiceOrderMutation();
  const [error, setError] = useState<string | null>(null);
  const today = new Date().toISOString().slice(0, 10);
  const [draft, setDraft] = useState({
    plant: 0,
    technique: 'vibration',
    code: '',
    client_work_order: '',
    scheduled_from: today,
    scheduled_to: today,
  });

  async function submit() {
    setError(null);
    try {
      await create(draft).unwrap();
      onClose();
    } catch (cause) {
      setError(readServiceError(cause) ?? t('form.genericError'));
    }
  }

  return (
    <Modal
      title={t('orderForm.title')}
      description={t('orderForm.hint')}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>{t('common:action.cancel')}</Button>
          <Button
            variant="primary"
            disabled={isLoading || !draft.plant || !draft.code.trim()}
            onClick={() => void submit()}
          >
            {t('orderForm.create')}
          </Button>
        </>
      }
    >
      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label={t('orderForm.plant')}>
          <Select
            value={draft.plant || ''}
            onChange={(event) => setDraft({ ...draft, plant: Number(event.target.value) })}
          >
            <option value="">—</option>
            {plants.data?.map((plant) => (
              <option key={plant.id} value={plant.id}>
                {plant.name}
              </option>
            ))}
          </Select>
        </FormField>

        <FormField label={t('orderForm.technique')}>
          <Select
            value={draft.technique}
            onChange={(event) => setDraft({ ...draft, technique: event.target.value })}
          >
            {techniques.data?.map((technique) => (
              <option key={technique.code} value={technique.code}>
                {technique.name}
              </option>
            ))}
          </Select>
        </FormField>

        <FormField label={t('orderForm.code')}>
          <TextInput
            value={draft.code}
            onChange={(event) => setDraft({ ...draft, code: event.target.value })}
            placeholder="MPd-AV-N°007-26"
          />
        </FormField>

        <FormField label={t('orderForm.clientOrder')}>
          <TextInput
            value={draft.client_work_order}
            onChange={(event) => setDraft({ ...draft, client_work_order: event.target.value })}
            placeholder="OT-1382630"
          />
        </FormField>

        <FormField label={t('orderForm.from')}>
          <TextInput
            type="date"
            value={draft.scheduled_from}
            onChange={(event) => setDraft({ ...draft, scheduled_from: event.target.value })}
          />
        </FormField>

        <FormField label={t('orderForm.to')}>
          <TextInput
            type="date"
            value={draft.scheduled_to}
            onChange={(event) => setDraft({ ...draft, scheduled_to: event.target.value })}
          />
        </FormField>
      </div>
    </Modal>
  );
}
