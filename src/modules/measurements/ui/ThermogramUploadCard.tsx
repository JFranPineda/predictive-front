import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useEquipmentPointsQuery } from '@modules/assets';
import { Button } from '@shared/ui/Button';
import { Card } from '@shared/ui/Card';
import { FormField, Select, TextInput } from '@shared/ui/Form';

import { useCreateThermogramMutation } from '../infrastructure/endpoints';

/**
 * Termografía's unit of work is the image, not a grid cell (V3-16).
 *
 * Upload one termogram per element observed: the point it was taken on, its
 * Tmax (proposed from the FLIR matrix when the file carries one) and a
 * reference temperature to compute ΔT. The visit's readings table below picks
 * up `ir_tmax` and `delta_temp` the moment the upload succeeds.
 */
export function ThermogramUploadCard({
  visitId,
  equipmentId,
  onUploaded,
}: {
  visitId: number;
  equipmentId: number;
  onUploaded?: () => void;
}) {
  const { t } = useTranslation(['measurements', 'common']);
  const points = useEquipmentPointsQuery(equipmentId);
  const [create, { isLoading }] = useCreateThermogramMutation();
  const file = useRef<HTMLInputElement>(null);
  const [point, setPoint] = useState(0);
  const [tmax, setTmax] = useState('');
  const [reference, setReference] = useState('');
  const [caption, setCaption] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [suggested, setSuggested] = useState<string | null>(null);

  async function submit() {
    setError(null);
    setSuggested(null);
    const chosen = file.current?.files?.[0];
    if (!chosen || !point) return;
    const body = new FormData();
    body.append('image', chosen);
    body.append('point', String(point));
    if (tmax.trim()) body.append('tmax', tmax.trim());
    if (reference.trim()) body.append('reference', reference.trim());
    if (caption.trim()) body.append('caption', caption.trim());
    try {
      const result = await create({ visitId, body }).unwrap();
      if (!tmax.trim() && result.tmax) {
        // The camera's own matrix proposed this one; the technician can still
        // correct it before the next upload, or later from the record.
        setSuggested(result.tmax);
      }
      if (file.current) file.current.value = '';
      setTmax('');
      setReference('');
      setCaption('');
      onUploaded?.();
    } catch (cause) {
      const data = (cause as { data?: unknown })?.data;
      setError(Array.isArray(data) ? String(data[0]) : t('thermogram.uploadFailed'));
    }
  }

  return (
    <Card title={t('thermogram.title')} description={t('thermogram.hint')}>
      {error && <p className="mb-3 rounded-lg bg-red-50 p-2 text-sm text-red-700">{error}</p>}
      {suggested && (
        <p className="mb-3 rounded-lg bg-sky-50 p-2 text-sm text-sky-800 dark:bg-sky-950 dark:text-sky-200">
          {t('thermogram.suggested', { value: suggested })}
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <FormField label={t('thermogram.point')}>
          <Select value={point || ''} onChange={(event) => setPoint(Number(event.target.value))}>
            <option value="">—</option>
            {(points.data ?? []).map((row) => (
              <option key={row.id} value={row.id}>
                {row.label}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label={t('thermogram.tmax')} hint={t('thermogram.tmaxHint')}>
          <TextInput
            type="number"
            step="0.1"
            value={tmax}
            placeholder="72.0"
            onChange={(event) => setTmax(event.target.value)}
          />
        </FormField>
        <FormField label={t('thermogram.reference')} hint={t('thermogram.referenceHint')}>
          <TextInput
            type="number"
            step="0.1"
            value={reference}
            placeholder="38.0"
            onChange={(event) => setReference(event.target.value)}
          />
        </FormField>
        <FormField label={t('thermogram.image')}>
          <input
            ref={file}
            type="file"
            accept="image/*"
            className="block w-full text-xs file:mr-2 file:rounded-md file:border file:border-slate-300 file:bg-white file:px-2 file:py-1 file:text-xs dark:file:border-slate-700 dark:file:bg-slate-800"
          />
        </FormField>
        <FormField label={t('thermogram.caption')} hint={t('thermogram.captionHint')}>
          <TextInput value={caption} onChange={(event) => setCaption(event.target.value)} />
        </FormField>
      </div>
      <Button variant="primary" disabled={isLoading || !point} onClick={() => void submit()}>
        {t('thermogram.upload')}
      </Button>
    </Card>
  );
}
