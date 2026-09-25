import { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@shared/ui/Button';
import { Card } from '@shared/ui/Card';
import { FormField, Select, TextArea, TextInput } from '@shared/ui/Form';

import { SPECTRUM_TYPES } from '../../domain/spectra';
import { useCreateSpectrumMutation, useTrainMatrixQuery } from '../../infrastructure/endpoints';
import { readSpectrumError } from './readSpectrumError';

/**
 * Importing a spectrum: the image the software exports, the numbers, or both.
 *
 * IPSA's spectra are cascade plots exported as images, not CSV; with a single
 * "file" field taking CSV, the image went to the CSV parser and came back as
 * "no frequency/amplitude pairs" (V3-15).
 */
export function SpectrumUploadCard({ group }: { group: number }) {
  const { t } = useTranslation(['measurements', 'common']);
  const matrix = useTrainMatrixQuery({ group });
  const [create, { isLoading }] = useCreateSpectrumMutation();
  const capture = useRef<HTMLInputElement>(null);
  const data = useRef<HTMLInputElement>(null);
  const [point, setPoint] = useState(0);
  const [type, setType] = useState('velocity');
  const [rpm, setRpm] = useState('');
  const [caption, setCaption] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const points = useMemo(() => {
    const seen = new Map<number, string>();
    for (const block of matrix.data?.blocks ?? []) {
      for (const row of block.rows) seen.set(row.point_id, `${row.component} · ${row.label}`);
    }
    return [...seen].map(([id, label]) => ({ id, label }));
  }, [matrix.data]);

  async function submit() {
    setError(null);
    setDone(false);
    const image = capture.current?.files?.[0];
    const numbers = data.current?.files?.[0];
    if (!image && !numbers) {
      setError(t('spectra.needOne'));
      return;
    }
    const body = new FormData();
    body.append('point', String(point));
    body.append('spectrum_type', type);
    if (rpm) body.append('rpm_at_capture', rpm);
    if (caption.trim()) body.append('caption', caption.trim());
    if (image) body.append('capture', image);
    if (numbers) body.append('data', numbers);
    try {
      await create(body).unwrap();
      [capture, data].forEach((input) => {
        if (input.current) input.current.value = '';
      });
      setCaption('');
      setDone(true);
    } catch (cause) {
      setError(readSpectrumError(cause) ?? t('spectra.uploadFailed'));
    }
  }

  return (
    <Card title={t('spectra.import')} description={t('spectra.importHint')}>
      {error && <p className="mb-3 rounded-lg bg-red-50 p-2 text-sm text-red-700">{error}</p>}
      {done && <p className="mb-3 rounded-lg bg-emerald-50 p-2 text-sm text-emerald-800">{t('spectra.imported')}</p>}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <FormField label={t('spectra.point')}>
          <Select value={point || ''} onChange={(event) => setPoint(Number(event.target.value))}>
            <option value="">—</option>
            {points.map((row) => (
              <option key={row.id} value={row.id}>
                {row.label}
              </option>
            ))}
          </Select>
        </FormField>
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
          <TextInput type="number" value={rpm} placeholder="1770" onChange={(event) => setRpm(event.target.value)} />
        </FormField>
        <FormField label={t('spectra.capture')} hint={t('spectra.captureHint')}>
          <input ref={capture} type="file" accept="image/png,image/jpeg,image/webp" className="block w-full text-xs file:mr-2 file:rounded-md file:border file:border-slate-300 file:bg-white file:px-2 file:py-1 file:text-xs dark:file:border-slate-700 dark:file:bg-slate-800" />
        </FormField>
        <FormField label={t('spectra.file')} hint={t('spectra.fileHint')}>
          <input ref={data} type="file" accept=".csv,.txt" className="block w-full text-xs file:mr-2 file:rounded-md file:border file:border-slate-300 file:bg-white file:px-2 file:py-1 file:text-xs dark:file:border-slate-700 dark:file:bg-slate-800" />
        </FormField>
        <FormField label={t('spectra.finding')}>
          <TextArea rows={2} value={caption} onChange={(event) => setCaption(event.target.value)} />
        </FormField>
      </div>
      <Button variant="primary" disabled={isLoading || !point} onClick={() => void submit()}>
        {t('spectra.upload')}
      </Button>
    </Card>
  );
}
