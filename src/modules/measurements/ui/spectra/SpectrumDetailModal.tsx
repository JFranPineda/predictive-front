import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { formatDate } from '@app/i18n/format';
import { useFaultModesQuery } from '@modules/diagnostics';
import { Button } from '@shared/ui/Button';
import { FormField, Select, TextArea, TextInput } from '@shared/ui/Form';
import { Modal } from '@shared/ui/Modal';
import { Spinner } from '@shared/ui/Spinner';

import { SPECTRUM_TYPES } from '../../domain/spectra';
import type { Spectrum } from '../../domain/types';
import {
  useDeleteSpectrumMutation,
  useSpectrumCurveQuery,
  useUpdateSpectrumMutation,
} from '../../infrastructure/endpoints';
import { readSpectrumError } from './readSpectrumError';

/**
 * One spectrum, opened: the only place its fields are edited (V3-15).
 *
 * The finding under a capture is several sentences in the source reports, so
 * it is a multi-line text, and it is refined on review, so it stays editable.
 */
export function SpectrumDetailModal({
  spectrum,
  canManage,
  onClose,
}: {
  spectrum: Spectrum;
  canManage: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation(['measurements', 'common']);
  const faults = useFaultModesQuery({ technique: 'vibration' });
  const [update, updating] = useUpdateSpectrumMutation();
  const [remove, removing] = useDeleteSpectrumMutation();
  const [caption, setCaption] = useState(spectrum.caption);
  const [type, setType] = useState(spectrum.spectrum_type);
  const [rpm, setRpm] = useState(spectrum.rpm_at_capture === null ? '' : String(spectrum.rpm_at_capture));
  const [diagnosis, setDiagnosis] = useState(new Set(spectrum.diagnosis.map((fault) => fault.id)));
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(action: () => Promise<unknown>) {
    setError(null);
    try {
      await action();
      onClose();
    } catch (cause) {
      setError(readSpectrumError(cause) ?? t('common:state.failed'));
    }
  }

  const save = () =>
    run(() =>
      update({
        id: spectrum.id,
        caption: caption.trim(),
        spectrum_type: type,
        rpm_at_capture: rpm === '' ? null : Number(rpm),
        diagnosis: [...diagnosis],
      }).unwrap(),
    );

  return (
    <Modal
      title={`${spectrum.equipment_name} · ${spectrum.point_label}`}
      description={formatDate(spectrum.taken_at)}
      onClose={onClose}
      footer={
        confirming ? (
          <>
            <span className="mr-auto self-center text-sm text-red-700">{t('spectra.confirmDelete')}</span>
            <Button onClick={() => setConfirming(false)}>{t('common:action.cancel')}</Button>
            <Button variant="danger" disabled={removing.isLoading} onClick={() => void run(() => remove(spectrum.id).unwrap())}>
              {t('common:action.delete')}
            </Button>
          </>
        ) : (
          <>
            {canManage && (
              <Button variant="danger" className="mr-auto" onClick={() => setConfirming(true)}>
                {t('common:action.delete')}
              </Button>
            )}
            {spectrum.image_url && (
              <a
                href={spectrum.image_url}
                target="_blank"
                rel="noreferrer"
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-sky-700 hover:bg-slate-100 dark:text-sky-300 dark:hover:bg-slate-800"
              >
                {t('spectra.openCapture')}
              </a>
            )}
            {canManage && (
              <Button variant="primary" disabled={updating.isLoading} onClick={() => void save()}>
                {t('common:action.save')}
              </Button>
            )}
            <Button onClick={onClose}>{t('common:action.close')}</Button>
          </>
        )
      }
    >
      {error && <p className="rounded-lg bg-red-50 p-2 text-xs text-red-700">{error}</p>}

      {spectrum.image_url && (
        <img src={spectrum.image_url} alt={spectrum.caption || spectrum.point_label} className="w-full rounded-lg" />
      )}
      {spectrum.has_numeric_data && <Curve spectrum={spectrum} />}

      {canManage ? (
        <>
          <FormField label={t('spectra.finding')} hint={t('spectra.findingHint')}>
            <TextArea
              rows={5}
              value={caption}
              placeholder={t('spectra.captionPlaceholder')}
              onChange={(event) => setCaption(event.target.value)}
            />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label={t('spectra.typeLabel')}>
              <Select value={type} onChange={(event) => setType(event.target.value)}>
                {SPECTRUM_TYPES.map((row) => (
                  <option key={row} value={row}>
                    {t(`spectra.type.${row}`)}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label={t('spectra.rpm')}>
              <TextInput type="number" value={rpm} onChange={(event) => setRpm(event.target.value)} />
            </FormField>
          </div>
          <FormField label={t('spectra.diagnosis')}>
            <div className="flex flex-wrap gap-1.5">
              {(faults.data ?? []).map((fault) => {
                const active = diagnosis.has(fault.id);
                return (
                  <button
                    key={fault.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => {
                      const next = new Set(diagnosis);
                      if (active) next.delete(fault.id);
                      else next.add(fault.id);
                      setDiagnosis(next);
                    }}
                    className={
                      active
                        ? 'rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-900 dark:bg-amber-950 dark:text-amber-200'
                        : 'rounded-full border border-slate-200 px-2 py-0.5 text-xs text-slate-600 dark:border-slate-700 dark:text-slate-300'
                    }
                  >
                    {fault.name}
                  </button>
                );
              })}
            </div>
          </FormField>
        </>
      ) : (
        <p className="whitespace-pre-line text-sm">{spectrum.caption || t('spectra.noFinding')}</p>
      )}
    </Modal>
  );
}

/** The numbers, drawn. Fetched only when a spectrum is opened. */
function Curve({ spectrum }: { spectrum: Spectrum }) {
  const { t } = useTranslation('measurements');
  const { data, isLoading } = useSpectrumCurveQuery(spectrum.id);
  const path = useMemo(() => {
    if (!data?.amp.length) return '';
    const max = Math.max(...data.amp) || 1;
    const step = 1000 / (data.amp.length - 1);
    return data.amp
      .map((value, index) => `${index === 0 ? 'M' : 'L'}${(index * step).toFixed(1)},${(260 - (value / max) * 250).toFixed(1)}`)
      .join(' ');
  }, [data]);

  if (isLoading) return <Spinner label={t('spectra.loadingCurve')} />;
  return (
    <figure>
      <svg viewBox="0 0 1000 280" className="w-full" role="img" aria-label={t('spectra.curve')}>
        <line x1="0" y1="260" x2="1000" y2="260" className="stroke-slate-300" />
        <path d={path} fill="none" className="stroke-sky-500" strokeWidth="1.5" />
      </svg>
      <figcaption className="text-xs text-slate-500">
        {t('spectra.span', { from: spectrum.fmin_hz ?? 0, to: spectrum.fmax_hz ?? 0, rpm: spectrum.rpm_at_capture ?? '—' })}
      </figcaption>
    </figure>
  );
}
