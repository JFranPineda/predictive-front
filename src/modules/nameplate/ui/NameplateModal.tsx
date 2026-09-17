import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@shared/ui/Button';
import { FormField, Select, TextInput } from '@shared/ui/Form';
import { Modal } from '@shared/ui/Modal';
import { Spinner } from '@shared/ui/Spinner';

import { useNameplateQuery, useSaveNameplateMutation } from '../infrastructure/endpoints';

/**
 * The machine's plate, and the consequence of the power typed into it.
 *
 * Rated power and foundation are not paperwork: ISO grades a 45 kW pump and a
 * 400 kW one against different tables, so this form shows, live, which class
 * the standard will put the machine in.
 */
export function NameplateModal({
  equipmentId,
  onClose,
}: {
  equipmentId: number;
  onClose: () => void;
}) {
  const { t } = useTranslation(['nameplate', 'common']);
  const { data, isLoading } = useNameplateQuery(equipmentId);
  const [save, { isLoading: saving }] = useSaveNameplateMutation();
  const [draft, setDraft] = useState<Record<string, string>>({});

  const value = (field: keyof NonNullable<typeof data>) =>
    draft[field as string] ?? (data ? String(data[field] ?? '') : '');

  async function submit() {
    await save({ equipmentId, ...draft } as never).unwrap().catch(() => undefined);
    onClose();
  }

  return (
    <Modal
      title={t('title', { name: data?.equipment_name ?? '' })}
      description={t('hint')}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>{t('common:action.cancel')}</Button>
          <Button variant="primary" disabled={saving} onClick={() => void submit()}>
            {t('common:action.save')}
          </Button>
        </>
      }
    >
      {isLoading || !data ? (
        <Spinner label={t('loading')} />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <FormField label={t('field.powerKw')} hint={t('field.powerHint')}>
              <TextInput
                inputMode="decimal"
                value={value('rated_power_kw')}
                onChange={(event) =>
                  setDraft({ ...draft, rated_power_kw: event.target.value, rated_power_hp: '' })
                }
              />
            </FormField>
            <FormField label={t('field.powerHp')} hint={t('field.powerHpHint')}>
              <TextInput
                inputMode="decimal"
                value={draft.rated_power_hp ?? (data.rated_power_hp?.toString() ?? '')}
                onChange={(event) =>
                  setDraft({ ...draft, rated_power_hp: event.target.value, rated_power_kw: '' })
                }
              />
            </FormField>
            <FormField label={t('field.mounting')} hint={t('field.mountingHint')}>
              <Select
                value={value('mounting')}
                onChange={(event) => setDraft({ ...draft, mounting: event.target.value })}
              >
                <option value="">—</option>
                <option value="rigid">{t('mounting.rigid')}</option>
                <option value="flexible">{t('mounting.flexible')}</option>
              </Select>
            </FormField>
          </div>

          {data.resolved_class && (
            <p className="rounded-lg bg-sky-50 p-3 text-sm text-sky-900 dark:bg-sky-950/40 dark:text-sky-200">
              {t(data.resolved_class.explicit ? 'class.explicit' : 'class.derived', {
                standard: data.resolved_class.standard,
                name: data.resolved_class.name,
              })}
            </p>
          )}

          <div className="grid gap-4 sm:grid-cols-3">
            <FormField label={t('field.manufacturer')}>
              <TextInput
                value={value('manufacturer')}
                onChange={(event) => setDraft({ ...draft, manufacturer: event.target.value })}
              />
            </FormField>
            <FormField label={t('field.model')}>
              <TextInput
                value={value('model')}
                onChange={(event) => setDraft({ ...draft, model: event.target.value })}
              />
            </FormField>
            <FormField label={t('field.serial')}>
              <TextInput
                value={value('serial_number')}
                onChange={(event) => setDraft({ ...draft, serial_number: event.target.value })}
              />
            </FormField>
            <FormField label={t('field.rpm')}>
              <TextInput
                inputMode="numeric"
                value={value('rated_rpm')}
                onChange={(event) => setDraft({ ...draft, rated_rpm: event.target.value })}
              />
            </FormField>
            <FormField label={t('field.voltage')}>
              <TextInput
                inputMode="numeric"
                value={value('rated_voltage_v')}
                onChange={(event) => setDraft({ ...draft, rated_voltage_v: event.target.value })}
              />
            </FormField>
            <FormField label={t('field.current')}>
              <TextInput
                inputMode="decimal"
                value={value('rated_current_a')}
                onChange={(event) => setDraft({ ...draft, rated_current_a: event.target.value })}
              />
            </FormField>
            <FormField label={t('field.bearingDe')} hint={t('field.bearingHint')}>
              <TextInput
                value={value('bearing_de')}
                onChange={(event) => setDraft({ ...draft, bearing_de: event.target.value })}
              />
            </FormField>
            <FormField label={t('field.bearingNde')}>
              <TextInput
                value={value('bearing_nde')}
                onChange={(event) => setDraft({ ...draft, bearing_nde: event.target.value })}
              />
            </FormField>
            <FormField label={t('field.lubricant')}>
              <TextInput
                value={value('lubricant')}
                onChange={(event) => setDraft({ ...draft, lubricant: event.target.value })}
              />
            </FormField>
          </div>
        </>
      )}
    </Modal>
  );
}
