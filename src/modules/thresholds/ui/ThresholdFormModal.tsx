import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@shared/ui/Button';
import { FormField, Select, TextArea, TextInput } from '@shared/ui/Form';
import { Modal } from '@shared/ui/Modal';

import type { ThresholdSet, ThresholdSetDraft } from '../domain/types';
import { standardsForTechnique } from '../domain/cascade';
import {
  useConditionStatusesQuery,
  useCreateThresholdSetMutation,
  useMagnitudesQuery,
  useStandardsQuery,
  useUpdateThresholdSetMutation,
} from '../infrastructure/endpoints';
import { readError } from './StandardFormModal';

const SCOPES = ['global', 'equipment_type', 'asset_group_kind', 'equipment', 'point'] as const;
const EQUIPMENT_TYPES = ['motor', 'pump', 'compressor', 'gearbox', 'fan', 'blower'] as const;

export function ThresholdFormModal({
  set,
  onClose,
}: {
  set?: ThresholdSet;
  onClose: () => void;
}) {
  const { t } = useTranslation(['thresholds', 'common']);
  const magnitudes = useMagnitudesQuery();
  const standards = useStandardsQuery();
  const statuses = useConditionStatusesQuery();
  const [create, creating] = useCreateThresholdSetMutation();
  const [update, updating] = useUpdateThresholdSetMutation();
  const [error, setError] = useState<string | null>(null);

  const [draft, setDraft] = useState<ThresholdSetDraft>({
    magnitude_code: set?.magnitude_code ?? '',
    standard_code: set?.standard?.code ?? null,
    machine_class_code: null,
    scope: set?.scope ?? 'global',
    scope_ref_id: set?.scope_ref_id ?? null,
    unit_code: set?.unit_code ?? '',
    aggregation: set?.aggregation ?? '',
    rationale: set?.rationale ?? '',
    bands: set?.bands.map((band) => ({
      status_code: band.status.code,
      min_value: band.min_value,
      max_value: band.max_value,
    })) ?? [{ status_code: '', min_value: null, max_value: null }],
  });

  const magnitude = magnitudes.data?.find((row) => row.code === draft.magnitude_code);
  // Only the standards written for the magnitude's own service type: a
  // thermography criterion has no business judging vibration velocity.
  const offeredStandards = useMemo(
    () => standardsForTechnique(standards.data ?? [], magnitude?.technique_code),
    [standards.data, magnitude?.technique_code],
  );
  const machineClasses =
    offeredStandards.find((row) => row.code === draft.standard_code)?.machine_classes ?? [];
  const conditionStatuses = (statuses.data ?? []).filter((row) => row.kind === 'condition');
  const busy = creating.isLoading || updating.isLoading;

  function pickMagnitude(code: string) {
    const picked = magnitudes.data?.find((row) => row.code === code);
    setDraft({
      ...draft,
      magnitude_code: code,
      unit_code: picked?.unit_code ?? '',
      aggregation: picked?.aggregation ?? '',
      // Changing the technique invalidates the standard that was chosen.
      standard_code: null,
      machine_class_code: null,
    });
  }

  async function submit() {
    setError(null);
    const payload = { ...draft, bands: draft.bands.filter((band) => band.status_code) };
    try {
      if (set) await update({ ...payload, id: set.id }).unwrap();
      else await create(payload).unwrap();
      onClose();
    } catch (cause) {
      setError(readError(cause) ?? t('form.genericError'));
    }
  }

  return (
    <Modal
      title={set ? t('form.editSet') : t('form.newSet')}
      description={t('form.setHint')}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>{t('common:action.cancel')}</Button>
          <Button
            variant="primary"
            disabled={busy || !draft.magnitude_code || draft.bands.every((b) => !b.status_code)}
            onClick={() => void submit()}
          >
            {t('common:action.save')}
          </Button>
        </>
      }
    >
      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label={t('form.magnitude')} hint={t('form.magnitudeHint')}>
          <Select value={draft.magnitude_code} onChange={(e) => pickMagnitude(e.target.value)}>
            <option value="">—</option>
            {magnitudes.data?.map((row) => (
              <option key={row.code} value={row.code}>
                {row.name} · {row.technique_name}
              </option>
            ))}
          </Select>
        </FormField>

        <FormField
          label={t('form.standard')}
          hint={
            magnitude
              ? t('form.standardFiltered', { technique: magnitude.technique_name })
              : t('form.standardPickMagnitude')
          }
        >
          <Select
            value={draft.standard_code ?? ''}
            disabled={!magnitude}
            onChange={(e) =>
              setDraft({
                ...draft,
                standard_code: e.target.value || null,
                machine_class_code: null,
              })
            }
          >
            <option value="">{t('form.ownCriterion')}</option>
            {offeredStandards.map((row) => (
              <option key={row.code} value={row.code}>
                {row.name}
              </option>
            ))}
          </Select>
        </FormField>

        {machineClasses.length > 0 && (
          <FormField label={t('form.machineClass')}>
            <Select
              value={draft.machine_class_code ?? ''}
              onChange={(e) => setDraft({ ...draft, machine_class_code: e.target.value || null })}
            >
              <option value="">—</option>
              {machineClasses.map((row) => (
                <option key={row.code} value={row.code}>
                  {row.name}
                </option>
              ))}
            </Select>
          </FormField>
        )}

        <FormField label={t('form.scope')} hint={t('form.scopeHint')}>
          <Select
            value={draft.scope}
            onChange={(e) =>
              setDraft({ ...draft, scope: e.target.value as ThresholdSetDraft['scope'], scope_ref_id: null })
            }
          >
            {SCOPES.map((scope) => (
              <option key={scope} value={scope}>
                {t(`scope.${scope}`)}
              </option>
            ))}
          </Select>
        </FormField>

        {draft.scope === 'equipment_type' && (
          <FormField label={t('form.equipmentType')}>
            <Select
              value={draft.scope_ref_id ?? ''}
              onChange={(e) => setDraft({ ...draft, scope_ref_id: e.target.value || null })}
            >
              <option value="">—</option>
              {EQUIPMENT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </Select>
          </FormField>
        )}

        {(draft.scope === 'equipment' || draft.scope === 'point') && (
          <FormField label={t('form.scopeRef')} hint={t('form.scopeRefHint')}>
            <TextInput
              value={draft.scope_ref_id ?? ''}
              onChange={(e) => setDraft({ ...draft, scope_ref_id: e.target.value || null })}
            />
          </FormField>
        )}
      </div>

      <FormField label={t('form.bands')} hint={t('form.bandsHint')}>
        <div className="space-y-2">
          {draft.bands.map((band, index) => (
            <div key={index} className="grid grid-cols-[1fr_6rem_6rem_2rem] gap-2">
              <Select
                value={band.status_code}
                onChange={(e) => updateBand(index, { status_code: e.target.value })}
              >
                <option value="">—</option>
                {conditionStatuses.map((status) => (
                  <option key={status.code} value={status.code}>
                    {status.name}
                  </option>
                ))}
              </Select>
              <TextInput
                inputMode="decimal"
                placeholder="−∞"
                value={band.min_value ?? ''}
                onChange={(e) => updateBand(index, { min_value: e.target.value || null })}
              />
              <TextInput
                inputMode="decimal"
                placeholder="+∞"
                value={band.max_value ?? ''}
                onChange={(e) => updateBand(index, { max_value: e.target.value || null })}
              />
              <Button
                variant="ghost"
                onClick={() =>
                  setDraft({ ...draft, bands: draft.bands.filter((_, p) => p !== index) })
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
                bands: [...draft.bands, { status_code: '', min_value: null, max_value: null }],
              })
            }
          >
            + {t('form.addBand')}
          </Button>
        </div>
      </FormField>

      <FormField label={t('form.rationale')} hint={t('form.rationaleHint')}>
        <TextArea
          rows={2}
          value={draft.rationale}
          onChange={(e) => setDraft({ ...draft, rationale: e.target.value })}
        />
      </FormField>
    </Modal>
  );

  function updateBand(index: number, patch: Partial<ThresholdSetDraft['bands'][number]>) {
    setDraft({
      ...draft,
      bands: draft.bands.map((band, position) =>
        position === index ? { ...band, ...patch } : band,
      ),
    });
  }
}
