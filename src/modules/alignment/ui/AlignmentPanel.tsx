import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useStandardsQuery } from '@modules/thresholds';
import { Button } from '@shared/ui/Button';
import { Card } from '@shared/ui/Card';
import { FormField, Select, TextArea, TextInput } from '@shared/ui/Form';

import {
  useAlignmentRecordsQuery,
  useCreateAlignmentRecordMutation,
  useUpdateAlignmentRecordMutation,
  useUploadAlignmentPhotoMutation,
} from '../infrastructure/endpoints';
import { PHASES, type AlignmentRecord, type Phase } from '../domain/types';

const PHOTO_KINDS = ['alignment_group', 'alignment_observation', 'alignment_before', 'alignment_after'] as const;

/**
 * The visit's alignment job, in the SKF before/after shape (V3-17): eight
 * values, ✓/✗ from the tolerance the server already froze, and up to four
 * photos with their fixed roles.
 */
export function AlignmentPanel({ visitId, assetGroupId }: { visitId: number; assetGroupId: number }) {
  const records = useAlignmentRecordsQuery({ service_visit: visitId });
  const record = records.data?.[0];

  if (records.isLoading) return null;
  return record ? (
    <ExistingRecord record={record} />
  ) : (
    <NewRecordForm visitId={visitId} assetGroupId={assetGroupId} />
  );
}

function NewRecordForm({ visitId, assetGroupId }: { visitId: number; assetGroupId: number }) {
  const { t } = useTranslation(['alignment', 'common']);
  const [create, { isLoading }] = useCreateAlignmentRecordMutation();
  const [driverLabel, setDriverLabel] = useState('');
  const [drivenLabel, setDrivenLabel] = useState('');
  const [rpm, setRpm] = useState('');
  const [standard, setStandard] = useState(0);
  const [instrument, setInstrument] = useState('');
  const standards = useStandardsQuery();
  const normas = (standards.data ?? []).filter(
    (row) => row.is_active && row.techniques.some((technique) => technique.code === 'alignment'),
  );
  const [before, setBefore] = useState<Record<Phase, string>>(emptyPhase());
  const [after, setAfter] = useState<Record<Phase, string>>(emptyPhase());
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    if (!rpm.trim()) {
      setError(t('form.rpmRequired'));
      return;
    }
    try {
      await create({
        asset_group: assetGroupId,
        service_visit: visitId,
        driver_label: driverLabel.trim(),
        driven_label: drivenLabel.trim(),
        rpm: rpm.trim(),
        standard: standard || null,
        instrument: instrument.trim(),
        ...prefixed('before', before),
        ...prefixed('after', after),
      }).unwrap();
    } catch (cause) {
      const data = (cause as { data?: { detail?: string } })?.data;
      setError(data?.detail ?? t('form.genericError'));
    }
  }

  return (
    <Card title={t('panel.title')} description={t('panel.hint')}>
      {error && <p className="mb-3 rounded-lg bg-red-50 p-2 text-sm text-red-700">{error}</p>}
      <div className="grid gap-4 sm:grid-cols-3">
        <FormField label={t('field.driver')}>
          <TextInput value={driverLabel} onChange={(event) => setDriverLabel(event.target.value)} />
        </FormField>
        <FormField label={t('field.driven')}>
          <TextInput value={drivenLabel} onChange={(event) => setDrivenLabel(event.target.value)} />
        </FormField>
        <FormField label={t('field.rpm')}>
          <TextInput type="number" step="1" value={rpm} onChange={(event) => setRpm(event.target.value)} />
        </FormField>
        <FormField label={t('field.instrument')}>
          <TextInput value={instrument} onChange={(event) => setInstrument(event.target.value)} />
        </FormField>
        <FormField label={t('field.standard')} hint={t('field.standardHint')}>
          <Select value={standard || ''} onChange={(event) => setStandard(Number(event.target.value))}>
            <option value="">{t('field.standardDefault')}</option>
            {normas.map((row) => (
              <option key={row.id} value={row.id}>
                {row.name}
              </option>
            ))}
          </Select>
        </FormField>
      </div>

      <div className="mt-4 grid gap-6 sm:grid-cols-2">
        <PhaseColumn title={t('phase.before')} values={before} onChange={setBefore} />
        <PhaseColumn title={t('phase.after')} values={after} onChange={setAfter} />
      </div>

      <Button variant="primary" className="mt-4" disabled={isLoading} onClick={() => void submit()}>
        {t('panel.save')}
      </Button>
    </Card>
  );
}

function PhaseColumn({
  title,
  values,
  onChange,
}: {
  title: string;
  values: Record<Phase, string>;
  onChange: (next: Record<Phase, string>) => void;
}) {
  const { t } = useTranslation('alignment');
  return (
    <div>
      <h4 className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">{title}</h4>
      <div className="grid grid-cols-2 gap-3">
        {PHASES.map((axis) => (
          <FormField key={axis} label={t(`axis.${axis}`)}>
            <TextInput
              type="number"
              step="0.01"
              value={values[axis]}
              onChange={(event) => onChange({ ...values, [axis]: event.target.value })}
            />
          </FormField>
        ))}
      </div>
    </div>
  );
}

function ExistingRecord({ record }: { record: AlignmentRecord }) {
  const { t } = useTranslation(['alignment', 'common']);
  const [update] = useUpdateAlignmentRecordMutation();
  const [upload, { isLoading: uploading }] = useUploadAlignmentPhotoMutation();
  const file = useRef<HTMLInputElement>(null);
  const [kind, setKind] = useState<(typeof PHOTO_KINDS)[number]>('alignment_group');
  const [caption, setCaption] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function submitEdit(phase: 'before' | 'after', axis: Phase, value: string) {
    await update({ id: record.id, [`${phase}_${axis}`]: value });
  }

  async function submitPhoto() {
    setError(null);
    const chosen = file.current?.files?.[0];
    if (!chosen) return;
    const body = new FormData();
    body.append('file', chosen);
    body.append('kind', kind);
    if (caption.trim()) body.append('caption', caption.trim());
    try {
      await upload({ recordId: record.id, body }).unwrap();
      if (file.current) file.current.value = '';
      setCaption('');
    } catch (cause) {
      const data = (cause as { data?: unknown })?.data;
      setError(Array.isArray(data) ? String(data[0]) : t('form.genericError'));
    }
  }

  return (
    <Card
      title={t('panel.title')}
      description={
        record.all_ok
          ? t('panel.verdictOk')
          : t('panel.verdictBad')
      }
    >
      <div className="grid gap-6 sm:grid-cols-2">
        <ReadonlyPhase title={t('phase.before')} values={record.before} />
        <ReadonlyPhase title={t('phase.after')} values={record.after} onEdit={(axis, value) => void submitEdit('after', axis, value)} />
      </div>

      <p className="mt-3 text-xs text-slate-500">
        {t('panel.tolerance', {
          parallel: record.tolerance.parallel_mm,
          angular: record.tolerance.angular_mm_per_100mm,
        })}
        {record.standard && ` · ${record.standard.name}`}
      </p>

      <div className="mt-4 border-t border-slate-100 pt-4 dark:border-slate-800">
        <h4 className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">{t('photos.title')}</h4>
        {error && <p className="mb-2 rounded-lg bg-red-50 p-2 text-sm text-red-700">{error}</p>}
        <div className="mb-3 flex flex-wrap gap-2">
          {record.photos.map((photo) => (
            <a key={photo.id} href={photo.url} target="_blank" rel="noreferrer" title={photo.caption}>
              <img
                src={photo.thumb_url ?? photo.url}
                alt={t(`photos.kind.${photo.kind}`)}
                className="size-16 rounded object-cover ring-1 ring-slate-200 dark:ring-slate-700"
              />
            </a>
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <FormField label={t('photos.role')}>
            <Select value={kind} onChange={(event) => setKind(event.target.value as typeof kind)}>
              {PHOTO_KINDS.map((option) => (
                <option key={option} value={option}>
                  {t(`photos.kind.${option}`)}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label={t('photos.file')}>
            <input
              ref={file}
              type="file"
              accept="image/*"
              className="block w-full text-xs file:mr-2 file:rounded-md file:border file:border-slate-300 file:bg-white file:px-2 file:py-1 file:text-xs dark:file:border-slate-700 dark:file:bg-slate-800"
            />
          </FormField>
          <FormField label={t('photos.caption')}>
            <TextArea rows={1} value={caption} onChange={(event) => setCaption(event.target.value)} />
          </FormField>
        </div>
        <Button variant="secondary" className="mt-2" disabled={uploading} onClick={() => void submitPhoto()}>
          {t('photos.upload')}
        </Button>
      </div>
    </Card>
  );
}

function ReadonlyPhase({
  title,
  values,
  onEdit,
}: {
  title: string;
  values: AlignmentRecord['before'];
  onEdit?: (axis: Phase, value: string) => void;
}) {
  const { t } = useTranslation('alignment');
  return (
    <div>
      <h4 className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">{title}</h4>
      <dl className="grid grid-cols-2 gap-2 text-sm">
        {PHASES.map((axis) => (
          <div key={axis} className="flex items-center justify-between rounded-md border border-slate-200 px-2 py-1 dark:border-slate-700">
            <span className="text-xs text-slate-500">{t(`axis.${axis}`)}</span>
            {onEdit ? (
              <input
                inputMode="decimal"
                defaultValue={values[axis].value ?? ''}
                onBlur={(event) => onEdit(axis, event.target.value)}
                className="w-16 rounded border border-slate-300 px-1 text-right text-xs tabular-nums dark:border-slate-700 dark:bg-slate-800"
              />
            ) : (
              <span className="tabular-nums">{values[axis].value ?? '—'}</span>
            )}
            <span className={values[axis].ok === false ? 'text-red-600' : 'text-emerald-600'}>
              {values[axis].ok === null ? '' : values[axis].ok ? '✓' : '✗'}
            </span>
          </div>
        ))}
      </dl>
    </div>
  );
}

function emptyPhase(): Record<Phase, string> {
  return { angular_h: '', parallel_h: '', angular_v: '', parallel_v: '' };
}

function prefixed(phase: 'before' | 'after', values: Record<Phase, string>): Record<string, string> {
  const out: Record<string, string> = {};
  PHASES.forEach((axis) => {
    if (values[axis].trim()) out[`${phase}_${axis}`] = values[axis].trim();
  });
  return out;
}
