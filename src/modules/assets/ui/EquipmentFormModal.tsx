import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@shared/ui/Button';
import { FormField, Select, TextInput } from '@shared/ui/Form';
import { Modal } from '@shared/ui/Modal';

import { EQUIPMENT_TYPES, type EquipmentDraft } from '../domain/types';
import { useAssetGroupsQuery, useCreateEquipmentMutation } from '../infrastructure/endpoints';

const FREQUENCIES = ['monthly', 'bimonthly', 'quarterly', 'semiannual', 'annual', 'on_demand'] as const;

export function EquipmentFormModal({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation(['assets', 'common']);
  const groups = useAssetGroupsQuery();
  const [create, { isLoading }] = useCreateEquipmentMutation();
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<EquipmentDraft>({
    asset_group: 0,
    name: '',
    equipment_type: 'motor',
    client_tag: '',
    position_in_group: 'driver',
    monitoring_frequency: 'monthly',
    generate_points: true,
    first_point: 1,
  });

  async function submit() {
    setError(null);
    try {
      await create(draft).unwrap();
      onClose();
    } catch (cause) {
      setError(readApiError(cause) ?? t('form.genericError'));
    }
  }

  return (
    <Modal
      title={t('form.newEquipment')}
      description={t('form.equipmentHint')}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>{t('common:action.cancel')}</Button>
          <Button
            variant="primary"
            disabled={isLoading || !draft.name.trim() || !draft.asset_group}
            onClick={() => void submit()}
          >
            {t('common:action.save')}
          </Button>
        </>
      }
    >
      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <FormField label={t('form.assetGroup')} hint={t('form.assetGroupHint')}>
        <Select
          value={draft.asset_group || ''}
          onChange={(event) => setDraft({ ...draft, asset_group: Number(event.target.value) })}
        >
          <option value="">—</option>
          {groups.data?.map((group) => (
            <option key={group.id} value={group.id}>
              {group.area_code} · {group.sector} · {group.name}
            </option>
          ))}
        </Select>
      </FormField>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label={t('form.name')}>
          <TextInput
            value={draft.name}
            onChange={(event) => setDraft({ ...draft, name: event.target.value })}
            placeholder="MOTOR"
          />
        </FormField>

        <FormField label={t('form.clientTag')} hint={t('form.clientTagHint')}>
          <TextInput
            value={draft.client_tag}
            onChange={(event) => setDraft({ ...draft, client_tag: event.target.value })}
            placeholder="MB101001A"
          />
        </FormField>

        <FormField label={t('form.equipmentType')}>
          <Select
            value={draft.equipment_type}
            onChange={(event) =>
              setDraft({
                ...draft,
                equipment_type: event.target.value as EquipmentDraft['equipment_type'],
                // The driver of a train is its motor; everything else is driven.
                position_in_group: event.target.value === 'motor' ? 'driver' : 'driven',
                first_point: event.target.value === 'motor' ? 1 : 3,
              })
            }
          >
            {EQUIPMENT_TYPES.map((type) => (
              <option key={type} value={type}>
                {t(`type.${type}`)}
              </option>
            ))}
          </Select>
        </FormField>

        <FormField label={t('form.frequency')}>
          <Select
            value={draft.monitoring_frequency}
            onChange={(event) =>
              setDraft({
                ...draft,
                monitoring_frequency: event.target.value as EquipmentDraft['monitoring_frequency'],
              })
            }
          >
            {FREQUENCIES.map((frequency) => (
              <option key={frequency} value={frequency}>
                {t(`frequency.${frequency}`)}
              </option>
            ))}
          </Select>
        </FormField>
      </div>

      <FormField label={t('form.points')} hint={t('form.pointsHint')}>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={draft.generate_points}
              onChange={(event) => setDraft({ ...draft, generate_points: event.target.checked })}
            />
            {t('form.generatePoints')}
          </label>
          {draft.generate_points && (
            <TextInput
              type="number"
              min={1}
              value={draft.first_point}
              onChange={(event) => setDraft({ ...draft, first_point: Number(event.target.value) })}
              className="w-24"
            />
          )}
        </div>
      </FormField>
    </Modal>
  );
}

/** DRF sends either a list of messages or an object keyed by field. */
export function readApiError(cause: unknown): string | null {
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
