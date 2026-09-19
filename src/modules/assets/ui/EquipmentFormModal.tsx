import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@shared/ui/Button';
import { FormField, Select, TextInput } from '@shared/ui/Form';
import { Modal } from '@shared/ui/Modal';

import { EQUIPMENT_TYPES, type Equipment, type EquipmentDraft } from '../domain/types';
import {
  useAssetGroupsQuery,
  useCreateEquipmentMutation,
  useUpdateEquipmentMutation,
} from '../infrastructure/endpoints';

const FREQUENCIES = ['monthly', 'bimonthly', 'quarterly', 'semiannual', 'annual', 'on_demand'] as const;

/**
 * Creates a machine, or corrects one.
 *
 * The same form does both: a plant of 558 machines has far more typos to fix
 * than machines to add, and the fields that are wrong — the TAG, the type,
 * the frequency — are exactly the ones this form already knows how to ask for.
 */
export function EquipmentFormModal({
  equipment,
  onClose,
}: {
  equipment?: Equipment;
  onClose: () => void;
}) {
  const { t } = useTranslation(['assets', 'common']);
  const groups = useAssetGroupsQuery();
  const [create, creating] = useCreateEquipmentMutation();
  const [update, updating] = useUpdateEquipmentMutation();
  const isLoading = creating.isLoading || updating.isLoading;
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<EquipmentDraft>({
    asset_group: equipment?.asset_group.id ?? 0,
    name: equipment?.name ?? '',
    equipment_type: equipment?.equipment_type ?? 'motor',
    client_tag: equipment?.client_tag ?? '',
    position_in_group: 'driver',
    monitoring_frequency: equipment?.monitoring_frequency ?? 'monthly',
    generate_points: !equipment,
    // 0 means "continue the train's numbering": a gearbox read on four
    // points does not start at 3 just because a motor came before it.
    first_point: 0,
  });

  async function submit() {
    setError(null);
    try {
      if (equipment) {
        // Only what this form actually knows. The points already exist and
        // carry readings, and `position_in_group` is not on the row — sending
        // a guessed one would reorder the train behind the user's back.
        await update({
          id: equipment.id,
          name: draft.name,
          client_tag: draft.client_tag,
          equipment_type: draft.equipment_type,
          monitoring_frequency: draft.monitoring_frequency,
          asset_group: draft.asset_group,
        }).unwrap();
      } else {
        await create(draft).unwrap();
      }
      onClose();
    } catch (cause) {
      setError(readApiError(cause) ?? t('form.genericError'));
    }
  }

  return (
    <Modal
      title={equipment ? t('form.editEquipment') : t('form.newEquipment')}
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

      {!equipment && (
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
              min={0}
              value={draft.first_point || ''}
              placeholder={t('form.firstPointAuto')}
              title={t('form.firstPointHint')}
              onChange={(event) => setDraft({ ...draft, first_point: Number(event.target.value) })}
              className="w-32"
            />
          )}
        </div>
      </FormField>
      )}
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
