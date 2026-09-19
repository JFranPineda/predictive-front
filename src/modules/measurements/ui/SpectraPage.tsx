import { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';

import { useAppSelector } from '@app/hooks';
import { Button } from '@shared/ui/Button';
import { Card } from '@shared/ui/Card';
import { EmptyState } from '@shared/ui/EmptyState';
import { FormField, Select, TextInput } from '@shared/ui/Form';
import { Page } from '@shared/ui/Page';
import { PageHeader } from '@shared/ui/PageHeader';
import { Spinner } from '@shared/ui/Spinner';

import type { Spectrum } from '../domain/types';
import {
  useCreateSpectrumMutation,
  useDeleteSpectrumMutation,
  useMatrixQuery,
  useSpectraQuery,
  useSpectrumCurveQuery,
  useUpdateSpectrumMutation,
} from '../infrastructure/endpoints';

const TYPES = ['velocity', 'envelope', 'acceleration', 'demodulation', 'waveform'];

/**
 * The spectra of one machine: the capture, the numbers, or both.
 *
 * The model and the import have existed since the numeric spectra landed, but
 * there was nowhere to upload a CSV or look at a curve — so in practice the
 * system still only held screenshots.
 */
export default function SpectraPage() {
  const { equipmentId } = useParams();
  const id = Number(equipmentId);
  const { t } = useTranslation(['measurements', 'common']);
  const permissions = useAppSelector((state) => state.session.permissions);
  const canManage =
    permissions.includes('vibration.diagnose') || permissions.includes('measurements.add_reading');

  const { data, isLoading } = useSpectraQuery({ equipment: id });
  const [opened, setOpened] = useState<Spectrum | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (isLoading) return <Spinner label={t('spectra.loading')} />;

  return (
    <Page>
      <PageHeader title={t('spectra.title')} description={t('spectra.subtitle')} />
      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      {canManage && <UploadCard equipmentId={id} onError={setError} />}

      {(data ?? []).length === 0 ? (
        <Card>
          <EmptyState title={t('spectra.empty')} body={t('spectra.emptyHint')} />
        </Card>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {(data ?? []).map((spectrum) => (
            <SpectrumCard
              key={spectrum.id}
              spectrum={spectrum}
              canManage={canManage}
              onOpen={() => setOpened(spectrum)}
              onError={setError}
            />
          ))}
        </ul>
      )}

      {opened && <CurveModal spectrum={opened} onClose={() => setOpened(null)} />}
    </Page>
  );
}

function SpectrumCard({
  spectrum,
  canManage,
  onOpen,
  onError,
}: {
  spectrum: Spectrum;
  canManage: boolean;
  onOpen: () => void;
  onError: (message: string | null) => void;
}) {
  const { t } = useTranslation(['measurements', 'common']);
  const [update] = useUpdateSpectrumMutation();
  const [remove] = useDeleteSpectrumMutation();

  async function run(action: () => Promise<unknown>) {
    onError(null);
    try {
      await action();
    } catch (cause) {
      const body = (cause as { data?: unknown })?.data;
      onError(Array.isArray(body) ? String(body[0]) : t('common:state.failed'));
    }
  }

  return (
    <li className="rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-800">
      <div className="mb-2 flex items-center gap-2">
        <span className="font-mono text-xs text-slate-400">{spectrum.point_label}</span>
        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] dark:bg-slate-800">
          {t(`spectra.type.${spectrum.spectrum_type}`, { defaultValue: spectrum.spectrum_type })}
        </span>
        <time className="ml-auto text-xs text-slate-400">{spectrum.taken_at.slice(0, 10)}</time>
      </div>

      {spectrum.thumb_url && (
        <img
          src={spectrum.thumb_url}
          alt={spectrum.caption}
          loading="lazy"
          className="mb-2 aspect-4/3 w-full rounded object-cover"
        />
      )}

      {/* The caption under a spectrum IS the finding in the source reports,
          and it is refined on review, so it cannot be write-once. */}
      {canManage ? (
        <TextInput
          defaultValue={spectrum.caption}
          placeholder={t('spectra.captionPlaceholder')}
          onBlur={(event) =>
            event.target.value !== spectrum.caption &&
            void run(() => update({ id: spectrum.id, caption: event.target.value }).unwrap())
          }
        />
      ) : (
        <p className="text-xs text-slate-500">{spectrum.caption}</p>
      )}

      {spectrum.diagnosis.length > 0 && (
        <p className="mt-1 flex flex-wrap gap-1">
          {spectrum.diagnosis.map((fault) => (
            <span
              key={fault.id}
              className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] text-amber-800 dark:bg-amber-950 dark:text-amber-200"
            >
              {fault.name}
            </span>
          ))}
        </p>
      )}

      <div className="mt-2 flex items-center gap-3 text-xs">
        {spectrum.has_numeric_data ? (
          <button onClick={onOpen} className="font-medium text-sky-600">
            {t('spectra.openCurve', { lines: spectrum.lines ?? 0 })}
          </button>
        ) : (
          <span className="text-slate-400">{t('spectra.captureOnly')}</span>
        )}
        {spectrum.peak_hz !== null && (
          <span className="text-slate-500">
            {t('spectra.peak', {
              hz: spectrum.peak_hz.toFixed(1),
              value: spectrum.peak_amplitude?.toFixed(2),
              unit: spectrum.unit,
            })}
          </span>
        )}
        {canManage && (
          <button
            onClick={() => void run(() => remove(spectrum.id).unwrap())}
            className="ml-auto text-red-600"
          >
            {t('common:action.delete')}
          </button>
        )}
      </div>
    </li>
  );
}

/** The numbers, drawn. Fetched only when somebody opens one. */
function CurveModal({ spectrum, onClose }: { spectrum: Spectrum; onClose: () => void }) {
  const { t } = useTranslation(['measurements', 'common']);
  const { data, isLoading } = useSpectrumCurveQuery(spectrum.id);

  const path = useMemo(() => {
    if (!data?.amp.length) return '';
    const max = Math.max(...data.amp) || 1;
    const step = 1000 / (data.amp.length - 1);
    return data.amp
      .map((value, index) => `${index === 0 ? 'M' : 'L'}${(index * step).toFixed(1)},${(260 - (value / max) * 250).toFixed(1)}`)
      .join(' ');
  }, [data]);

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6"
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-4xl rounded-xl bg-white p-5 dark:bg-slate-900"
      >
        <h2 className="mb-1 font-medium">
          {spectrum.point_label} · {spectrum.taken_at.slice(0, 10)}
        </h2>
        <p className="mb-3 text-xs text-slate-500">
          {t('spectra.span', {
            from: spectrum.fmin_hz ?? 0,
            to: spectrum.fmax_hz ?? 0,
            rpm: spectrum.rpm_at_capture ?? '—',
          })}
        </p>

        {isLoading ? (
          <Spinner label={t('spectra.loadingCurve')} />
        ) : (
          <svg viewBox="0 0 1000 280" className="w-full" role="img">
            <line x1="0" y1="260" x2="1000" y2="260" className="stroke-slate-300" />
            <path d={path} fill="none" className="stroke-sky-500" strokeWidth="1.5" />
          </svg>
        )}

        <p className="mt-2 text-sm">{spectrum.caption}</p>
        <Button onClick={onClose}>{t('common:action.close')}</Button>
      </div>
    </div>
  );
}

/** Importing what SEMAPI and SKF export. */
function UploadCard({
  equipmentId,
  onError,
}: {
  equipmentId: number;
  onError: (message: string | null) => void;
}) {
  const { t } = useTranslation(['measurements', 'common']);
  const matrix = useMatrixQuery({ equipment: equipmentId, scope: 'group' });
  const [create, { isLoading }] = useCreateSpectrumMutation();
  const file = useRef<HTMLInputElement>(null);
  const [point, setPoint] = useState(0);
  const [type, setType] = useState('velocity');
  const [rpm, setRpm] = useState('');

  const points = useMemo(() => {
    const seen = new Map<number, string>();
    for (const block of matrix.data?.blocks ?? []) {
      for (const row of block.rows) seen.set(row.point_id, `${row.component} · ${row.label}`);
    }
    return [...seen].map(([id, label]) => ({ id, label }));
  }, [matrix.data]);

  async function submit() {
    onError(null);
    const chosen = file.current?.files?.[0];
    if (!chosen || !point) return;
    const body = new FormData();
    body.append('data', chosen);
    body.append('point', String(point));
    body.append('spectrum_type', type);
    if (rpm) body.append('rpm_at_capture', rpm);
    try {
      await create(body).unwrap();
      if (file.current) file.current.value = '';
    } catch (cause) {
      const data = (cause as { data?: unknown })?.data;
      onError(Array.isArray(data) ? String(data[0]) : t('spectra.uploadFailed'));
    }
  }

  return (
    <Card title={t('spectra.import')} description={t('spectra.importHint')}>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
            {TYPES.map((row) => (
              <option key={row} value={row}>
                {t(`spectra.type.${row}`, { defaultValue: row })}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label={t('spectra.rpm')}>
          <TextInput
            type="number"
            value={rpm}
            placeholder="1770"
            onChange={(event) => setRpm(event.target.value)}
          />
        </FormField>
        <FormField label={t('spectra.file')} hint={t('spectra.fileHint')}>
          <input ref={file} type="file" accept=".csv,.txt" className="text-sm" />
        </FormField>
      </div>
      <Button variant="primary" disabled={isLoading || !point} onClick={() => void submit()}>
        {t('spectra.upload')}
      </Button>
    </Card>
  );
}
