import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { usePlantsQuery } from '@modules/assets';
import { useTechniquesQuery } from '@modules/thresholds';
import { Button } from '@shared/ui/Button';
import { FormField, Select, TextInput } from '@shared/ui/Form';
import { Modal } from '@shared/ui/Modal';

import type { ServiceOrder } from '../domain/types';
import {
  useAnalystsQuery,
  useCreateServiceOrderMutation,
  useServiceProvidersQuery,
  useUpdateServiceOrderMutation,
} from '../infrastructure/endpoints';
import { readServiceError } from './readServiceError';

/**
 * Create an order, or edit one.
 *
 * Plant and technique are what every visit of the round hangs off; on an
 * existing order they are shown locked, with the reason, instead of being
 * editable fields the save silently ignored.
 */
export function OrderFormModal({ order, onClose }: { order?: ServiceOrder; onClose: () => void }) {
  const { t } = useTranslation(['services', 'common']);
  const plants = usePlantsQuery();
  const techniques = useTechniquesQuery();
  const providers = useServiceProvidersQuery({ active: true });
  const analysts = useAnalystsQuery();
  const [create, creating] = useCreateServiceOrderMutation();
  const [update, updating] = useUpdateServiceOrderMutation();
  const isLoading = creating.isLoading || updating.isLoading;
  const [error, setError] = useState<string | null>(null);
  const today = new Date().toISOString().slice(0, 10);
  const [draft, setDraft] = useState({
    plant: order?.plant_id ?? 0,
    technique: order?.technique_code ?? 'vibration',
    code: order?.code ?? '',
    client_work_order: order?.client_work_order ?? '',
    scheduled_from: order?.scheduled_from ?? today,
    scheduled_to: order?.scheduled_to ?? today,
    provider: order?.provider?.id ?? 0,
    lead_analyst: order?.lead_analyst?.id ?? 0,
  });
  const set = (changes: Partial<typeof draft>) => setDraft({ ...draft, ...changes });

  async function submit() {
    setError(null);
    const common = {
      code: draft.code,
      client_work_order: draft.client_work_order,
      scheduled_from: draft.scheduled_from,
      scheduled_to: draft.scheduled_to,
      provider: draft.provider || null,
      lead_analyst: draft.lead_analyst || null,
    };
    try {
      if (order) await update({ id: order.id, ...common }).unwrap();
      else await create({ ...common, plant: draft.plant, technique: draft.technique }).unwrap();
      onClose();
    } catch (cause) {
      setError(readServiceError(cause) ?? t('form.genericError'));
    }
  }

  return (
    <Modal
      title={order ? t('orderForm.edit') : t('orderForm.title')}
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
            {order ? t('orderForm.save') : t('orderForm.create')}
          </Button>
        </>
      }
    >
      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label={t('orderForm.plant')} hint={order ? t('orderForm.locked') : undefined}>
          <Select
            value={draft.plant || ''}
            disabled={Boolean(order)}
            onChange={(event) => set({ plant: Number(event.target.value) })}
          >
            <option value="">—</option>
            {plants.data?.map((plant) => (
              <option key={plant.id} value={plant.id}>
                {plant.name}
              </option>
            ))}
          </Select>
        </FormField>

        <FormField label={t('orderForm.technique')} hint={order ? t('orderForm.locked') : undefined}>
          <Select
            value={draft.technique}
            disabled={Boolean(order)}
            onChange={(event) => set({ technique: event.target.value })}
          >
            {techniques.data?.map((technique) => (
              <option key={technique.code} value={technique.code}>
                {technique.name}
              </option>
            ))}
          </Select>
        </FormField>

        <FormField label={t('orderForm.provider')}>
          <Select value={draft.provider || ''} onChange={(event) => set({ provider: Number(event.target.value) })}>
            <option value="">—</option>
            {providers.data?.map((provider) => (
              <option key={provider.id} value={provider.id}>
                {provider.name}
              </option>
            ))}
          </Select>
        </FormField>

        <FormField label={t('orderForm.analyst')}>
          <Select
            value={draft.lead_analyst || ''}
            onChange={(event) => set({ lead_analyst: Number(event.target.value) })}
          >
            <option value="">—</option>
            {/* The current analyst stays selectable even if no longer an engineer. */}
            {order?.lead_analyst && !analysts.data?.some((row) => row.id === order.lead_analyst?.id) && (
              <option value={order.lead_analyst.id}>{order.lead_analyst.name}</option>
            )}
            {analysts.data?.map((analyst) => (
              <option key={analyst.id} value={analyst.id}>
                {analyst.name}
              </option>
            ))}
          </Select>
        </FormField>

        <FormField label={t('orderForm.code')}>
          <TextInput
            value={draft.code}
            onChange={(event) => set({ code: event.target.value })}
            placeholder="MPd-AV-N°007-26"
          />
        </FormField>

        <FormField label={t('orderForm.clientOrder')}>
          <TextInput
            value={draft.client_work_order}
            onChange={(event) => set({ client_work_order: event.target.value })}
            placeholder="OT-1382630"
          />
        </FormField>

        <FormField label={t('orderForm.from')}>
          <TextInput
            type="date"
            value={draft.scheduled_from}
            onChange={(event) => set({ scheduled_from: event.target.value })}
          />
        </FormField>

        <FormField label={t('orderForm.to')}>
          <TextInput
            type="date"
            value={draft.scheduled_to}
            onChange={(event) => set({ scheduled_to: event.target.value })}
          />
        </FormField>
      </div>
    </Modal>
  );
}
