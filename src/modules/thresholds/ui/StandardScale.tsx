import { Suspense, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useScaleEditors } from '@app/contributions';
import { Button } from '@shared/ui/Button';
import { FormField, Select, TextInput } from '@shared/ui/Form';
import { Modal } from '@shared/ui/Modal';
import { Spinner } from '@shared/ui/Spinner';

import { bandRange, magnitudesForNorma } from '../domain/scale';
import type { ScaleRow, Standard, ThresholdSetDraft } from '../domain/types';
import {
  useConditionStatusesQuery,
  useCreateThresholdSetMutation,
  useMagnitudesQuery,
  useUpdateThresholdSetMutation,
} from '../infrastructure/endpoints';
import { readError } from './StandardFormModal';

/**
 * A norma's scale, where the norma is (Q9, Q10): the bands it grades each
 * magnitude with, and whatever the modules of its services contribute —
 * alignment's RPM table.
 */
export function StandardScale({ standard, canManage }: { standard: Standard; canManage: boolean }) {
  const { t } = useTranslation('thresholds');
  const editors = useScaleEditors();
  const magnitudes = useMagnitudesQuery();
  const [editing, setEditing] = useState<ScaleRow | 'new' | null>(null);
  const offered = magnitudesForNorma(magnitudes.data ?? [], standard.techniques);
  const contributed = standard.techniques.filter((technique) => editors[technique.code]);

  return (
    <div className="mt-4 space-y-3 border-t border-slate-100 pt-3 dark:border-slate-800">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t('scale.title')}</h3>
        {canManage && offered.length > 0 && (
          <Button variant="ghost" onClick={() => setEditing('new')}>
            + {t('scale.addMagnitude')}
          </Button>
        )}
      </div>

      {standard.scale.length === 0 && contributed.length === 0 && (
        <p className="text-sm text-slate-400">{t('scale.empty')}</p>
      )}

      {standard.scale.map((row) => (
        <div key={row.set_id} className="text-sm">
          <div className="flex items-center justify-between gap-2">
            <span className="font-medium">
              {row.magnitude_name} <span className="text-xs text-slate-400">({row.unit_code})</span>
            </span>
            {canManage && (
              <Button variant="ghost" onClick={() => setEditing(row)}>
                {t('scale.edit')}
              </Button>
            )}
          </div>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {row.bands.map((band, index) => (
              <span
                key={index}
                className="rounded-full px-2 py-0.5 text-[11px] font-medium text-white"
                style={{ backgroundColor: band.color }}
              >
                {band.status_name} · {bandRange(band.min_value, band.max_value, row.unit_code)}
              </span>
            ))}
          </div>
        </div>
      ))}

      {contributed.map((technique) => {
        const Editor = editors[technique.code]!;
        return (
          <Suspense key={technique.code} fallback={<Spinner label="" />}>
            <Editor standardId={standard.id} editable={canManage} />
          </Suspense>
        );
      })}

      {editing && (
        <ScaleModal
          standard={standard}
          row={editing === 'new' ? undefined : editing}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function ScaleModal({ standard, row, onClose }: { standard: Standard; row?: ScaleRow; onClose: () => void }) {
  const { t } = useTranslation(['thresholds', 'common']);
  const magnitudes = useMagnitudesQuery();
  const statuses = useConditionStatusesQuery();
  const [create, creating] = useCreateThresholdSetMutation();
  const [update, updating] = useUpdateThresholdSetMutation();
  const [error, setError] = useState<string | null>(null);
  const offered = magnitudesForNorma(magnitudes.data ?? [], standard.techniques).filter(
    (magnitude) => magnitude.code === row?.magnitude_code || !standard.scale.some((s) => s.magnitude_code === magnitude.code),
  );
  const [magnitudeCode, setMagnitudeCode] = useState(row?.magnitude_code ?? '');
  const [bands, setBands] = useState<ThresholdSetDraft['bands']>(
    row?.bands.map((band) => ({ status_code: band.status_code, min_value: band.min_value, max_value: band.max_value })) ?? [
      { status_code: '', min_value: null, max_value: null },
    ],
  );
  // As the norma's service names them (UT's "Medio" is the plant's Alarma).
  const conditionStatuses = standard.status_options?.length
    ? standard.status_options
    : (statuses.data ?? []).filter((status) => status.kind === 'condition');
  const magnitude = magnitudes.data?.find((m) => m.code === magnitudeCode);
  const busy = creating.isLoading || updating.isLoading;

  async function submit() {
    if (!magnitude) return;
    setError(null);
    const draft: ThresholdSetDraft = {
      magnitude_code: magnitude.code,
      standard_code: standard.code,
      machine_class_code: null,
      scope: 'global',
      scope_ref_id: null,
      unit_code: row?.unit_code ?? magnitude.unit_code,
      aggregation: row?.aggregation ?? magnitude.aggregation,
      rationale: t('scale.rationale', { name: standard.name }),
      bands: bands.filter((band) => band.status_code),
    };
    try {
      if (row) await update({ ...draft, id: row.set_id }).unwrap();
      else await create(draft).unwrap();
      onClose();
    } catch (cause) {
      setError(readError(cause) ?? t('form.genericError'));
    }
  }

  function patch(index: number, change: Partial<ThresholdSetDraft['bands'][number]>) {
    setBands(bands.map((band, position) => (position === index ? { ...band, ...change } : band)));
  }

  return (
    <Modal
      title={t('scale.modalTitle', { name: standard.name })}
      description={t('scale.modalHint')}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>{t('common:action.cancel')}</Button>
          <Button
            variant="primary"
            disabled={busy || !magnitude || bands.every((band) => !band.status_code)}
            onClick={() => void submit()}
          >
            {t('common:action.save')}
          </Button>
        </>
      }
    >
      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <FormField label={t('scale.magnitude')}>
        <Select value={magnitudeCode} disabled={Boolean(row)} onChange={(event) => setMagnitudeCode(event.target.value)}>
          <option value="">—</option>
          {offered.map((option) => (
            <option key={option.code} value={option.code}>
              {option.name} ({option.unit_code})
            </option>
          ))}
        </Select>
      </FormField>
      <FormField label={t('form.bands')} hint={t('scale.bandsHint')}>
        <div className="space-y-2">
          {bands.map((band, index) => (
            <div key={index} className="grid grid-cols-[1fr_6rem_6rem_2rem] gap-2">
              <Select
                aria-label={t('scale.status')}
                value={band.status_code}
                onChange={(event) => patch(index, { status_code: event.target.value })}
              >
                <option value="">—</option>
                {conditionStatuses.map((status) => (
                  <option key={status.code} value={status.code}>
                    {status.name}
                  </option>
                ))}
              </Select>
              <TextInput
                aria-label={t('scale.from')}
                inputMode="decimal"
                placeholder="−∞"
                value={band.min_value ?? ''}
                onChange={(event) => patch(index, { min_value: event.target.value || null })}
              />
              <TextInput
                aria-label={t('scale.to')}
                inputMode="decimal"
                placeholder="+∞"
                value={band.max_value ?? ''}
                onChange={(event) => patch(index, { max_value: event.target.value || null })}
              />
              <Button variant="ghost" onClick={() => setBands(bands.filter((_, position) => position !== index))}>
                ✕
              </Button>
            </div>
          ))}
          <Button onClick={() => setBands([...bands, { status_code: '', min_value: null, max_value: null }])}>
            + {t('form.addBand')}
          </Button>
        </div>
      </FormField>
    </Modal>
  );
}
