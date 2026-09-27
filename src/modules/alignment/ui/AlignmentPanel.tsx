import clsx from 'clsx';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useStandardsQuery } from '@modules/thresholds';
import { Button } from '@shared/ui/Button';
import { Card } from '@shared/ui/Card';
import { FormField, Select, TextArea, TextInput } from '@shared/ui/Form';

import {
  useAlignmentRecordsQuery,
  useCreateAlignmentRecordMutation,
  useDeleteAlignmentPhotoMutation,
  useUpdateAlignmentRecordMutation,
  useUploadAlignmentPhotoMutation,
} from '../infrastructure/endpoints';
import {
  PHASES,
  type Aligner,
  type AlignmentRecord,
  type AxisValue,
  type Phase,
  type PhotoKind,
  type StateRef,
} from '../domain/types';

/** The SKF "Alignment Results" layout: each view shows its angular and its offset. */
const VIEWS: { key: 'horizontal' | 'vertical'; axes: Phase[] }[] = [
  { key: 'horizontal', axes: ['angular_h', 'parallel_h'] },
  { key: 'vertical', axes: ['angular_v', 'parallel_v'] },
];

/** The train's images, in the order the report shows them. */
const PHOTO_ORDER: PhotoKind[] = [
  'alignment_result',
  'alignment_before',
  'alignment_after',
  'alignment_group',
  'alignment_observation',
];

/**
 * The visit's alignment job (V3-17, Q10): the eight values before and after,
 * ✓/✗ and the equipment's state from the norma's frozen scale, and the
 * train's images — the aligner's own screens (one for SKF, two for any
 * other aligner), the train and the finding.
 */
export function AlignmentPanel({
  visitId,
  assetGroupId,
  canEdit = true,
}: {
  visitId: number;
  assetGroupId: number;
  canEdit?: boolean;
}) {
  const records = useAlignmentRecordsQuery({ service_visit: visitId });
  const record = records.data?.[0];

  if (records.isLoading) return null;
  return record ? (
    <ExistingRecord record={record} canEdit={canEdit} />
  ) : canEdit ? (
    <NewRecordForm visitId={visitId} assetGroupId={assetGroupId} />
  ) : null;
}

function useAlignmentNormas() {
  const standards = useStandardsQuery();
  return (standards.data ?? []).filter(
    (row) => row.is_active && row.techniques.some((technique) => technique.code === 'alignment'),
  );
}

function NewRecordForm({ visitId, assetGroupId }: { visitId: number; assetGroupId: number }) {
  const { t } = useTranslation(['alignment', 'common']);
  const [create, { isLoading }] = useCreateAlignmentRecordMutation();
  const normas = useAlignmentNormas();
  const [driverLabel, setDriverLabel] = useState('');
  const [drivenLabel, setDrivenLabel] = useState('');
  const [rpm, setRpm] = useState('');
  const [standard, setStandard] = useState(0);
  const [aligner, setAligner] = useState<Aligner>('skf');
  const [instrument, setInstrument] = useState('');
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
        aligner,
        instrument: instrument.trim(),
        ...prefixed('before', before),
        ...prefixed('after', after),
      }).unwrap();
    } catch (cause) {
      setError(readError(cause) ?? t('form.genericError'));
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
        <FormField label={t('field.aligner')} hint={t('field.alignerHint')}>
          <Select value={aligner} onChange={(event) => setAligner(event.target.value as Aligner)}>
            <option value="skf">{t('aligner.skf')}</option>
            <option value="other">{t('aligner.other')}</option>
          </Select>
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
          <FormField key={axis} label={`${t(`axis.${axis}`)} (${t(`unit.${axis.split('_')[0]}`)})`}>
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

function ExistingRecord({ record, canEdit }: { record: AlignmentRecord; canEdit: boolean }) {
  const { t } = useTranslation(['alignment', 'common']);
  const [update] = useUpdateAlignmentRecordMutation();
  const [error, setError] = useState<string | null>(null);

  async function saveValue(phase: 'before' | 'after', axis: Phase, value: string) {
    if (value.trim() === shown(record[phase][axis].value)) return;
    setError(null);
    try {
      await update({ id: record.id, [`${phase}_${axis}`]: value.trim() }).unwrap();
    } catch (cause) {
      setError(readError(cause) ?? t('form.genericError'));
    }
  }

  return (
    <Card
      title={t('panel.title')}
      description={record.all_ok ? t('panel.verdictOk') : t('panel.verdictBad')}
      actions={
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <StateBadge label={t('state.found')} state={record.found_state} />
          <StateBadge label={t('state.left')} state={record.state} />
        </div>
      }
    >
      {error && <p className="mb-3 rounded-lg bg-red-50 p-2 text-sm text-red-700">{error}</p>}

      <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
        <div className="bg-slate-500 px-4 py-2 text-center text-sm font-semibold tracking-wide text-white dark:bg-slate-700">
          {t('results.title')}
        </div>
        <div className="space-y-3 p-3 text-sm">
          <div className="grid grid-cols-2 gap-3 text-center text-xs font-semibold text-slate-600 dark:text-slate-300">
            <span>{t('phase.before')}</span>
            <span>{t('phase.after')}</span>
          </div>
          {VIEWS.map((view) => (
            <ResultRow
              key={view.key}
              label={t(`results.${view.key}`)}
              axes={view.axes}
              record={record}
              canEdit={canEdit}
              onSave={(phase, axis, value) => void saveValue(phase, axis, value)}
            />
          ))}
        </div>
      </div>

      <p className="mt-2 text-xs text-slate-500">
        {t('panel.tolerance', {
          parallel: record.tolerance.parallel_mm,
          angular: record.tolerance.angular_mm_per_100mm,
        })}
        {record.standard && ` · ${record.standard.name}`}
      </p>
      <ScaleLine record={record} />

      <Details record={record} canEdit={canEdit} />
      <Images record={record} canEdit={canEdit} />
    </Card>
  );
}

function ResultRow({
  label,
  axes,
  record,
  canEdit,
  onSave,
}: {
  label: string;
  axes: Phase[];
  record: AlignmentRecord;
  canEdit: boolean;
  onSave: (phase: 'before' | 'after', axis: Phase, value: string) => void;
}) {
  return (
    <div>
      <p className="mb-1 text-xs font-medium text-slate-600 dark:text-slate-300">{label}</p>
      <div className="grid grid-cols-2 gap-3">
        {(['before', 'after'] as const).map((phase) => (
          <div key={phase} className="space-y-2 rounded-lg bg-slate-100 p-2.5 dark:bg-slate-800/70">
            {axes.map((axis) => (
              <ValueCell
                key={`${record.id}-${phase}-${axis}-${record[phase][axis].value ?? ''}`}
                axis={axis}
                cell={record[phase][axis]}
                canEdit={canEdit}
                onSave={(value) => onSave(phase, axis, value)}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function ValueCell({
  axis,
  cell,
  canEdit,
  onSave,
}: {
  axis: Phase;
  cell: AxisValue;
  canEdit: boolean;
  onSave: (value: string) => void;
}) {
  const { t } = useTranslation('alignment');
  const kind = axis.split('_')[0] as 'angular' | 'parallel';
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
      <span className="w-full text-[11px] text-slate-500" title={t(`axis.${axis}`)}>
        {t(`kind.${kind}`)} · {t(`unit.${kind}`)}
      </span>
      {canEdit ? (
        <input
          aria-label={t(`axis.${axis}`)}
          inputMode="decimal"
          defaultValue={shown(cell.value)}
          onBlur={(event) => onSave(event.target.value)}
          className="w-20 rounded border border-slate-300 bg-white px-1.5 py-0.5 text-right text-base font-semibold tabular-nums dark:border-slate-600 dark:bg-slate-900"
        />
      ) : (
        <span className="w-20 text-right text-base font-semibold tabular-nums">{shown(cell.value) || '—'}</span>
      )}
      <span
        className={clsx(
          'text-xl font-bold leading-none',
          cell.ok === false ? 'text-red-600' : 'text-emerald-600',
        )}
      >
        {cell.ok === null ? '' : cell.ok ? '✓' : '✗'}
      </span>
      {cell.status && (
        <span
          className="rounded px-1.5 py-0.5 text-[10px] font-semibold text-white"
          style={{ backgroundColor: cell.status.color }}
        >
          {cell.status.name}
        </span>
      )}
    </div>
  );
}

/** As the aligner prints it: two decimals, more only when they matter. */
function shown(value: string | null): string {
  if (value === null || value === '') return '';
  const number = Number(value);
  if (Number.isNaN(number)) return value;
  return Number.isInteger(Math.round(number * 100 * 1e6) / 1e6) ? number.toFixed(2) : String(number);
}

function StateBadge({ label, state }: { label: string; state: StateRef | null }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-2 py-0.5 dark:border-slate-700">
      <span className="text-slate-500">{label}</span>
      <span
        className="rounded-full px-2 py-0.5 font-semibold text-white"
        style={{ backgroundColor: state?.color ?? '#94a3b8' }}
      >
        {state?.name ?? '—'}
      </span>
    </span>
  );
}

function ScaleLine({ record }: { record: AlignmentRecord }) {
  const { t } = useTranslation('alignment');
  const named = record.scale.filter((band) => band.status);
  if (named.length === 0) return null;
  return (
    <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
      <span>{t('panel.scale')}</span>
      {named.map((band, index) => (
        <span
          key={index}
          className="rounded-full px-2 py-0.5 font-medium text-white"
          style={{ backgroundColor: band.status!.color }}
        >
          {band.status!.name} ·{' '}
          {band.parallel_mm === null
            ? t('scale.above')
            : t('scale.upTo', { parallel: band.parallel_mm, angular: band.angular_mm_per_100mm })}
        </span>
      ))}
    </div>
  );
}

function Details({ record, canEdit }: { record: AlignmentRecord; canEdit: boolean }) {
  const { t } = useTranslation(['alignment', 'common']);
  const [update, { isLoading }] = useUpdateAlignmentRecordMutation();
  const normas = useAlignmentNormas();
  const [draft, setDraft] = useState(() => detailsOf(record));
  const [error, setError] = useState<string | null>(null);
  const dirty = JSON.stringify(draft) !== JSON.stringify(detailsOf(record));

  async function save() {
    setError(null);
    try {
      await update({
        id: record.id,
        driver_label: draft.driver_label,
        driven_label: draft.driven_label,
        rpm: draft.rpm,
        instrument: draft.instrument,
        aligner: draft.aligner,
        standard: draft.standard || null,
        backlash_within_tolerance: draft.backlash === '' ? null : draft.backlash === 'yes',
        notes: draft.notes,
      }).unwrap();
    } catch (cause) {
      setError(readError(cause) ?? t('form.genericError'));
    }
  }

  const set = (change: Partial<ReturnType<typeof detailsOf>>) => setDraft({ ...draft, ...change });

  return (
    <div className="mt-4 border-t border-slate-100 pt-4 dark:border-slate-800">
      <h4 className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">{t('details.title')}</h4>
      {error && <p className="mb-2 rounded-lg bg-red-50 p-2 text-sm text-red-700">{error}</p>}
      <fieldset disabled={!canEdit} className="grid gap-3 sm:grid-cols-3">
        <FormField label={t('field.driver')}>
          <TextInput value={draft.driver_label} onChange={(event) => set({ driver_label: event.target.value })} />
        </FormField>
        <FormField label={t('field.driven')}>
          <TextInput value={draft.driven_label} onChange={(event) => set({ driven_label: event.target.value })} />
        </FormField>
        <FormField label={t('field.rpm')} hint={t('field.rpmHint')}>
          <TextInput type="number" value={draft.rpm} onChange={(event) => set({ rpm: event.target.value })} />
        </FormField>
        <FormField label={t('field.aligner')} hint={t('field.alignerHint')}>
          <Select value={draft.aligner} onChange={(event) => set({ aligner: event.target.value as Aligner })}>
            <option value="skf">{t('aligner.skf')}</option>
            <option value="other">{t('aligner.other')}</option>
          </Select>
        </FormField>
        <FormField label={t('field.instrument')}>
          <TextInput value={draft.instrument} onChange={(event) => set({ instrument: event.target.value })} />
        </FormField>
        <FormField label={t('field.standard')} hint={t('field.standardHint')}>
          <Select value={draft.standard || ''} onChange={(event) => set({ standard: Number(event.target.value) })}>
            <option value="">{t('field.standardDefault')}</option>
            {normas.map((row) => (
              <option key={row.id} value={row.id}>
                {row.name}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label={t('field.backlash')}>
          <Select value={draft.backlash} onChange={(event) => set({ backlash: event.target.value })}>
            <option value="">—</option>
            <option value="yes">{t('field.yes')}</option>
            <option value="no">{t('field.no')}</option>
          </Select>
        </FormField>
        <div className="sm:col-span-2">
          <FormField label={t('field.notes')}>
            <TextArea rows={2} value={draft.notes} onChange={(event) => set({ notes: event.target.value })} />
          </FormField>
        </div>
      </fieldset>
      {canEdit && (
        <Button className="mt-2" variant="primary" disabled={!dirty || isLoading} onClick={() => void save()}>
          {t('details.save')}
        </Button>
      )}
    </div>
  );
}

function Images({ record, canEdit }: { record: AlignmentRecord; canEdit: boolean }) {
  const { t } = useTranslation(['alignment', 'common']);
  const kinds = PHOTO_ORDER.filter((kind) => record.photo_limits[kind]);
  // Images from a role the aligner no longer uses are still shown, never lost.
  const stray = record.photos.filter((photo) => !record.photo_limits[photo.kind]);

  return (
    <div className="mt-4 border-t border-slate-100 pt-4 dark:border-slate-800">
      <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('photos.title')}</h4>
      <p className="mb-3 text-xs text-slate-500">
        {record.aligner === 'skf' ? t('photos.hintSkf') : t('photos.hintOther')}
      </p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {kinds.map((kind) => (
          <PhotoSlot key={kind} record={record} kind={kind} canEdit={canEdit} />
        ))}
      </div>
      {stray.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {stray.map((photo) => (
            <a key={photo.id} href={photo.url} target="_blank" rel="noreferrer" title={t(`photos.kind.${photo.kind}`)}>
              <img src={photo.thumb_url ?? photo.url} alt="" className="size-16 rounded object-cover opacity-70" />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

function PhotoSlot({ record, kind, canEdit }: { record: AlignmentRecord; kind: PhotoKind; canEdit: boolean }) {
  const { t } = useTranslation(['alignment', 'common']);
  const [upload, { isLoading }] = useUploadAlignmentPhotoMutation();
  const [remove] = useDeleteAlignmentPhotoMutation();
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const photos = record.photos.filter((photo) => photo.kind === kind);
  const limit = record.photo_limits[kind] ?? 0;

  async function send(file: File) {
    setError(null);
    const body = new FormData();
    body.append('file', file);
    body.append('kind', kind);
    try {
      await upload({ recordId: record.id, body }).unwrap();
    } catch (cause) {
      setError(readError(cause) ?? t('form.genericError'));
    } finally {
      if (input.current) input.current.value = '';
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">{t(`photos.kind.${kind}`)}</span>
        <span className="text-[11px] text-slate-400">
          {photos.length}/{limit}
        </span>
      </div>
      {error && <p className="mb-2 rounded bg-red-50 p-1.5 text-xs text-red-700">{error}</p>}
      <div className="flex flex-wrap gap-2">
        {photos.map((photo) => (
          <div key={photo.id} className="relative">
            <a href={photo.url} target="_blank" rel="noreferrer">
              <img
                src={photo.thumb_url ?? photo.url}
                alt={t(`photos.kind.${kind}`)}
                className="h-24 w-32 rounded-lg object-cover ring-1 ring-slate-200 dark:ring-slate-700"
              />
            </a>
            {canEdit && (
              <button
                type="button"
                aria-label={t('photos.remove')}
                onClick={() => void remove({ recordId: record.id, photoId: photo.id })}
                className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-xs text-white shadow"
              >
                ✕
              </button>
            )}
          </div>
        ))}
        {canEdit && photos.length < limit && (
          <label className="flex h-24 w-32 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 text-xs text-slate-500 hover:border-sky-400 hover:text-sky-600 dark:border-slate-600">
            <span className="text-lg">+</span>
            {isLoading ? t('photos.uploading') : t('photos.add')}
            <input
              ref={input}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void send(file);
              }}
            />
          </label>
        )}
      </div>
    </div>
  );
}

function detailsOf(record: AlignmentRecord) {
  return {
    driver_label: record.driver_label,
    driven_label: record.driven_label,
    rpm: String(Number(record.rpm)),
    instrument: record.instrument,
    aligner: record.aligner,
    standard: record.standard?.id ?? 0,
    backlash: (record.backlash_within_tolerance === null ? '' : record.backlash_within_tolerance ? 'yes' : 'no'),
    notes: record.notes,
  };
}

function readError(cause: unknown): string | null {
  const data = (cause as { data?: unknown })?.data;
  if (Array.isArray(data)) return String(data[0]);
  if (data && typeof data === 'object' && 'detail' in data) return String((data).detail);
  return null;
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
