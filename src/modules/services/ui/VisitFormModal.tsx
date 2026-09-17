import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { useEquipmentsQuery } from '@modules/assets';
import { Button } from '@shared/ui/Button';
import { FormField, Select, TextInput } from '@shared/ui/Form';
import { Modal } from '@shared/ui/Modal';

import { useCreateVisitMutation, useServiceOrdersQuery } from '../infrastructure/endpoints';
import { readServiceError } from './readServiceError';

export function VisitFormModal({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation(['services', 'common']);
  const navigate = useNavigate();
  const orders = useServiceOrdersQuery({});
  const [search, setSearch] = useState('');
  const equipments = useEquipmentsQuery({ search: search || undefined, page_size: 50 });
  const [create, { isLoading }] = useCreateVisitMutation();
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState({ service_order: 0, equipment: 0 });

  async function submit() {
    setError(null);
    try {
      const created = await create(draft).unwrap();
      onClose();
      // Straight into the form the visit exists for.
      navigate(`/services/visits/${created.visit_id}`);
    } catch (cause) {
      setError(readServiceError(cause) ?? t('form.genericError'));
    }
  }

  return (
    <Modal
      title={t('visitForm.title')}
      description={t('visitForm.hint')}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>{t('common:action.cancel')}</Button>
          <Button
            variant="primary"
            disabled={isLoading || !draft.service_order || !draft.equipment}
            onClick={() => void submit()}
          >
            {t('visitForm.create')}
          </Button>
        </>
      }
    >
      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <FormField label={t('visitForm.order')} hint={t('visitForm.orderHint')}>
        <Select
          value={draft.service_order || ''}
          onChange={(event) =>
            setDraft({ ...draft, service_order: Number(event.target.value) })
          }
        >
          <option value="">—</option>
          {orders.data?.results.map((order) => (
            <option key={order.id} value={order.id}>
              {order.code} · {order.technique_name}
            </option>
          ))}
        </Select>
      </FormField>

      <FormField label={t('visitForm.search')}>
        <TextInput
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t('visitForm.searchPlaceholder')}
        />
      </FormField>

      <FormField label={t('visitForm.equipment')}>
        <Select
          value={draft.equipment || ''}
          onChange={(event) => setDraft({ ...draft, equipment: Number(event.target.value) })}
          className="h-40"
          size={8}
        >
          {equipments.data?.results.map((equipment) => (
            <option key={equipment.id} value={equipment.id}>
              {equipment.client_tag || equipment.asset_code} · {equipment.name} ·{' '}
              {equipment.area.code}
            </option>
          ))}
        </Select>
      </FormField>
    </Modal>
  );
}
