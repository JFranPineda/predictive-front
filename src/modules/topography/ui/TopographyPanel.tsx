import clsx from 'clsx';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { formatDate } from '@app/i18n/format';
import { Button } from '@shared/ui/Button';
import { Card } from '@shared/ui/Card';
import { FormField, TextArea, TextInput } from '@shared/ui/Form';

import {
  signed,
  suggestedDisplacement,
  type Box,
  type Image,
  type Measure,
  type SurveyText,
  type TopographyElement,
  type TopographySurvey,
} from '../domain/types';
import {
  useCreateTopographyElementMutation,
  useDeleteTopographyElementMutation,
  useRemoveBoxPhotoMutation,
  useRemoveSurveyImageMutation,
  useTopographyElementsQuery,
  useTopographyHistoryQuery,
  useTopographySurveyQuery,
  useUpdateTopographyElementMutation,
  useUpdateTopographySurveyMutation,
  useUploadBoxPhotoMutation,
  useUploadSurveyImageMutation,
} from '../infrastructure/endpoints';

/** The sheet's two views, each read on the drive side (reference) and the transmission side. */
const VIEWS: { key: 'parallel' | 'level'; boxes: [[Box, Measure], [Box, Measure]]; displacement: Measure }[] = [
  {
    key: 'parallel',
    boxes: [
      ['parallel_drive', 'parallel_drive_mm'],
      ['parallel_transmission', 'parallel_transmission_mm'],
    ],
    displacement: 'horizontal_displacement_mm',
  },
  {
    key: 'level',
    boxes: [
      ['level_drive', 'level_drive_mm'],
      ['level_transmission', 'level_transmission_mm'],
    ],
    displacement: 'vertical_displacement_mm',
  },
];

/**
 * A topography service, as the client's sheet (Q11): the survey's frame —
 * date, main component, notes, the train's schema and the plan of the whole
 * analysis with its notes — and, per roller read against the main
 * component, the four boxes with their separation in mm and their photo,
 * and the horizontal and vertical displacement it needs.
 */
export function TopographyPanel({
  visitId,
  assetGroupId,
  canEdit,
}: {
  visitId: number;
  assetGroupId: number;
  canEdit: boolean;
}) {
  const { t } = useTranslation(['topography', 'common']);
  const survey = useTopographySurveyQuery(visitId);
  const elements = useTopographyElementsQuery(visitId);
  const [create, { isLoading }] = useCreateTopographyElementMutation();
  const [label, setLabel] = useState('');
  const [reference, setReference] = useState('');
  const [error, setError] = useState<string | null>(null);
  const main = survey.data?.reference_label || t('sheet.mainComponent');

  async function addRow() {
    setError(null);
    if (!label.trim()) return;
    try {
      await create({ service_visit: visitId, element_label: label.trim(), reference_label: reference.trim() }).unwrap();
      setLabel('');
      setReference('');
    } catch (cause) {
      setError(readError(cause) ?? t('form.genericError'));
    }
  }

  return (
    <div className="space-y-6">
      {survey.data && <SurveyCard key={survey.data.id ?? 'new'} visitId={visitId} survey={survey.data} canEdit={canEdit} />}

      <Card title={t('sheet.title')} description={t('sheet.hint', { main })}>
        {error && <p className="mb-3 rounded-lg bg-red-50 p-2 text-sm text-red-700">{error}</p>}
        <div className="space-y-5">
          {(elements.data ?? []).map((row) => (
            <RollerSheet
              key={row.id}
              row={row}
              visitId={visitId}
              assetGroupId={assetGroupId}
              main={row.reference_label || main}
              canEdit={canEdit}
            />
          ))}
          {(elements.data ?? []).length === 0 && <p className="text-sm text-slate-400">{t('sheet.empty')}</p>}
        </div>
        {canEdit && (
          <div className="mt-5 flex flex-wrap items-end gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
            <FormField label={t('form.element')}>
              <TextInput value={label} onChange={(event) => setLabel(event.target.value)} placeholder={t('form.elementPlaceholder')} />
            </FormField>
            <FormField label={t('form.reference')} hint={t('form.referenceHint', { main })}>
              <TextInput value={reference} onChange={(event) => setReference(event.target.value)} placeholder={main} />
            </FormField>
            <Button variant="primary" disabled={isLoading || !label.trim()} onClick={() => void addRow()}>
              + {t('form.addElement')}
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}

function SurveyCard({ visitId, survey, canEdit }: { visitId: number; survey: TopographySurvey; canEdit: boolean }) {
  const { t } = useTranslation(['topography', 'common']);
  const [update, { isLoading }] = useUpdateTopographySurveyMutation();
  const [draft, setDraft] = useState<SurveyText>(() => textOf(survey));
  const [error, setError] = useState<string | null>(null);
  const dirty = JSON.stringify(draft) !== JSON.stringify(textOf(survey));
  const set = (change: Partial<SurveyText>) => setDraft({ ...draft, ...change });

  async function save() {
    setError(null);
    try {
      await update({ visitId, ...draft }).unwrap();
    } catch (cause) {
      setError(readError(cause) ?? t('form.genericError'));
    }
  }

  return (
    <Card
      title={t('survey.title')}
      description={t('survey.hint')}
      actions={
        canEdit && (
          <Button variant="primary" disabled={!dirty || isLoading} onClick={() => void save()}>
            {t('survey.save')}
          </Button>
        )
      }
    >
      {error && <p className="mb-3 rounded-lg bg-red-50 p-2 text-sm text-red-700">{error}</p>}
      <fieldset disabled={!canEdit} className="grid gap-3 sm:grid-cols-3">
        <div className="sm:col-span-2">
          <FormField label={t('survey.titleField')}>
            <TextInput value={draft.title} placeholder={t('survey.titlePlaceholder')} onChange={(e) => set({ title: e.target.value })} />
          </FormField>
        </div>
        <FormField label={t('survey.date')}>
          <TextInput type="date" value={draft.survey_date ?? ''} onChange={(e) => set({ survey_date: e.target.value || null })} />
        </FormField>
        <FormField label={t('survey.reference')} hint={t('survey.referenceHint')}>
          <TextInput value={draft.reference_label} placeholder="Prensa 1" onChange={(e) => set({ reference_label: e.target.value })} />
        </FormField>
        <FormField label={t('survey.planNumber')}>
          <TextInput value={draft.plan_number} placeholder="1AMIG-TOP-103" onChange={(e) => set({ plan_number: e.target.value })} />
        </FormField>
        <FormField label={t('survey.instrument')}>
          <TextInput value={draft.instrument} placeholder="Estación total Leica TS09 Plus" onChange={(e) => set({ instrument: e.target.value })} />
        </FormField>
        <div className="sm:col-span-3">
          <FormField label={t('survey.notes')} hint={t('survey.notesHint')}>
            <TextArea rows={4} value={draft.notes} onChange={(e) => set({ notes: e.target.value })} />
          </FormField>
        </div>
      </fieldset>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <SurveyImage visitId={visitId} role="schema" image={survey.schema_image} canEdit={canEdit} />
        <div className="space-y-2">
          <SurveyImage visitId={visitId} role="plan" image={survey.plan_image} canEdit={canEdit} />
          <FormField label={t('survey.planNotes')}>
            <TextArea
              rows={3}
              disabled={!canEdit}
              value={draft.plan_notes}
              placeholder={t('survey.planNotesPlaceholder')}
              onChange={(e) => set({ plan_notes: e.target.value })}
            />
          </FormField>
        </div>
      </div>
      {survey.survey_date && (
        <p className="mt-3 text-xs text-slate-400">{t('survey.dated', { date: formatDate(survey.survey_date) })}</p>
      )}
    </Card>
  );
}

function SurveyImage({
  visitId,
  role,
  image,
  canEdit,
}: {
  visitId: number;
  role: 'schema' | 'plan';
  image: Image | null;
  canEdit: boolean;
}) {
  const { t } = useTranslation(['topography', 'common']);
  const [upload, { isLoading }] = useUploadSurveyImageMutation();
  const [remove] = useRemoveSurveyImageMutation();
  const [error, setError] = useState<string | null>(null);

  async function send(file: File) {
    setError(null);
    const body = new FormData();
    body.append('role', role);
    body.append('file', file);
    try {
      await upload({ visitId, body }).unwrap();
    } catch (cause) {
      setError(readError(cause) ?? t('form.genericError'));
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">{t(`survey.image.${role}`)}</span>
        {image && canEdit && (
          <button type="button" className="text-xs text-red-600 hover:underline" onClick={() => void remove({ visitId, role })}>
            {t('photo.remove')}
          </button>
        )}
      </div>
      {error && <p className="mb-2 rounded bg-red-50 p-1.5 text-xs text-red-700">{error}</p>}
      {image ? (
        <a href={image.url} target="_blank" rel="noreferrer">
          <img src={image.url} alt={t(`survey.image.${role}`)} className="max-h-72 w-full rounded-lg object-contain ring-1 ring-slate-200 dark:ring-slate-700" />
        </a>
      ) : canEdit ? (
        <Picker label={isLoading ? t('photo.uploading') : t('photo.add')} onPick={(file) => void send(file)} tall />
      ) : (
        <p className="text-sm text-slate-400">{t('photo.none')}</p>
      )}
    </div>
  );
}

function RollerSheet({
  row,
  visitId,
  assetGroupId,
  main,
  canEdit,
}: {
  row: TopographyElement;
  visitId: number;
  assetGroupId: number;
  main: string;
  canEdit: boolean;
}) {
  const { t } = useTranslation(['topography', 'common']);
  const [update] = useUpdateTopographyElementMutation();
  const [remove] = useDeleteTopographyElementMutation();
  const [history, setHistory] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(change: Partial<Record<Measure, string | null>> & { observation?: string }) {
    setError(null);
    try {
      await update({ id: row.id, visitId, ...change }).unwrap();
    } catch (cause) {
      setError(readError(cause) ?? t('form.genericError'));
    }
  }

  return (
    <section className="overflow-hidden rounded-xl border border-slate-300 dark:border-slate-700">
      <header className="flex flex-wrap items-center gap-3 bg-slate-50 px-4 py-2 dark:bg-slate-800/60">
        <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-200">
          {row.element_label} <span className="font-normal normal-case text-slate-400">{t('sheet.versus', { main })}</span>
        </h4>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="ghost" onClick={() => setHistory(!history)}>
            {t('column.history')}
          </Button>
          {canEdit && (
            <Button variant="ghost" onClick={() => void remove({ id: row.id, visitId })}>
              {t('form.remove')}
            </Button>
          )}
        </div>
      </header>
      {error && <p className="m-3 rounded-lg bg-red-50 p-2 text-sm text-red-700">{error}</p>}
      <div className="grid gap-px bg-slate-200 2xl:grid-cols-2 dark:bg-slate-700">
        {VIEWS.map((view) => (
          <div key={view.key} className="bg-white p-3 dark:bg-slate-900">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                {t(`sheet.view.${view.key}`)}
              </span>
              <Displacement
                label={t(`sheet.displacement.${view.key}`)}
                value={row[view.displacement]}
                suggested={suggestedDisplacement(row[view.boxes[0][1]], row[view.boxes[1][1]])}
                canEdit={canEdit}
                onSave={(value) => void save({ [view.displacement]: value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              {view.boxes.map(([box, measure]) => (
                <BoxCell
                  key={box}
                  row={row}
                  visitId={visitId}
                  box={box}
                  value={row[measure]}
                  canEdit={canEdit}
                  onSave={(value) => void save({ [measure]: value })}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="border-t border-slate-200 p-3 dark:border-slate-700">
        <FormField label={t('column.observation')}>
          <TextArea
            rows={2}
            disabled={!canEdit}
            defaultValue={row.observation}
            onBlur={(event) => event.target.value !== row.observation && void save({ observation: event.target.value })}
          />
        </FormField>
      </div>
      {history && <History group={assetGroupId} element={row.element_label} />}
    </section>
  );
}

function BoxCell({
  row,
  visitId,
  box,
  value,
  canEdit,
  onSave,
}: {
  row: TopographyElement;
  visitId: number;
  box: Box;
  value: string | null;
  canEdit: boolean;
  onSave: (value: string | null) => void;
}) {
  const { t } = useTranslation(['topography', 'common']);
  const [upload, { isLoading }] = useUploadBoxPhotoMutation();
  const [remove] = useRemoveBoxPhotoMutation();
  const photo = row.photos[box];
  const reference = box.endsWith('drive');

  async function send(file: File) {
    const body = new FormData();
    body.append('box', box);
    body.append('file', file);
    await upload({ id: row.id, visitId, body });
  }

  return (
    <div className={clsx('rounded-lg border p-2', reference ? 'border-emerald-200 dark:border-emerald-900' : 'border-slate-200 dark:border-slate-700')}>
      <p className={clsx('mb-1 text-[11px] font-semibold uppercase', reference ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-500')}>
        {t(`sheet.side.${reference ? 'drive' : 'transmission'}`)}
      </p>
      <div className="flex items-baseline gap-1">
        {canEdit ? (
          <input
            key={value ?? ''}
            aria-label={t(`sheet.box.${box}`)}
            inputMode="decimal"
            defaultValue={value ?? ''}
            onBlur={(event) => event.target.value !== (value ?? '') && onSave(event.target.value || null)}
            className="w-24 rounded border border-slate-300 bg-white px-1.5 py-0.5 text-right text-lg font-bold tabular-nums text-red-600 dark:border-slate-600 dark:bg-slate-900"
          />
        ) : (
          <span className="text-lg font-bold tabular-nums text-red-600">{value ?? '—'}</span>
        )}
        <span className="text-xs text-slate-400">mm</span>
      </div>
      <div className="mt-2">
        {photo ? (
          <div className="relative inline-block">
            <a href={photo.url} target="_blank" rel="noreferrer">
              <img src={photo.thumb_url ?? photo.url} alt={t(`sheet.box.${box}`)} className="h-20 w-28 rounded object-cover ring-1 ring-slate-200 dark:ring-slate-700" />
            </a>
            {canEdit && (
              <button
                type="button"
                aria-label={t('photo.remove')}
                onClick={() => void remove({ id: row.id, visitId, box })}
                className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-xs text-white"
              >
                ✕
              </button>
            )}
          </div>
        ) : canEdit ? (
          <Picker label={isLoading ? t('photo.uploading') : t('photo.addBox')} onPick={(file) => void send(file)} />
        ) : null}
      </div>
    </div>
  );
}

function Displacement({
  label,
  value,
  suggested,
  canEdit,
  onSave,
}: {
  label: string;
  value: string | null;
  suggested: string | null;
  canEdit: boolean;
  onSave: (value: string | null) => void;
}) {
  const { t } = useTranslation('topography');
  return (
    <label className="flex shrink-0 items-center gap-2 text-xs text-slate-500">
      <span className="whitespace-nowrap">{label}</span>
      {canEdit ? (
        <input
          key={value ?? ''}
          inputMode="decimal"
          defaultValue={value ?? ''}
          placeholder={suggested ?? '±0'}
          title={suggested ? t('sheet.suggested', { value: signed(suggested) }) : undefined}
          onBlur={(event) => event.target.value !== (value ?? '') && onSave(event.target.value || null)}
          className="w-16 rounded border border-slate-300 bg-white px-1.5 py-0.5 text-right font-semibold tabular-nums dark:border-slate-600 dark:bg-slate-900"
        />
      ) : null}
      <span className="rounded bg-slate-900 px-1.5 py-0.5 font-semibold text-white dark:bg-slate-200 dark:text-slate-900">
        {signed(value)}
      </span>
    </label>
  );
}

function Picker({ label, onPick, tall = false }: { label: string; onPick: (file: File) => void; tall?: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <label
      className={clsx(
        'flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 text-xs text-slate-500 hover:border-sky-400 hover:text-sky-600 dark:border-slate-600',
        tall ? 'h-40 w-full' : 'h-20 w-28',
      )}
    >
      <span className="text-lg">+</span>
      {label}
      <input
        ref={input}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onPick(file);
          if (input.current) input.current.value = '';
        }}
      />
    </label>
  );
}

function History({ group, element }: { group: number; element: string }) {
  const { t } = useTranslation('topography');
  const { data } = useTopographyHistoryQuery({ group, element });
  if (!data?.length) return <p className="border-t border-slate-200 p-3 text-xs text-slate-400 dark:border-slate-700">{t('history.empty')}</p>;
  return (
    <table className="w-full border-t border-slate-200 text-xs dark:border-slate-700">
      <thead>
        <tr className="text-left text-slate-500">
          <th className="px-3 py-1">{t('column.date')}</th>
          <th className="px-3 py-1 text-right">{t('sheet.view.parallel')}</th>
          <th className="px-3 py-1 text-right">{t('sheet.displacement.parallel')}</th>
          <th className="px-3 py-1 text-right">{t('sheet.view.level')}</th>
          <th className="px-3 py-1 text-right">{t('sheet.displacement.level')}</th>
        </tr>
      </thead>
      <tbody>
        {data.map((entry) => (
          <tr key={entry.id} className="border-t border-slate-100 dark:border-slate-800">
            <td className="px-3 py-1">{formatDate(entry.visited_at)}</td>
            <td className="px-3 py-1 text-right tabular-nums">
              {entry.parallel_drive_mm ?? '—'} / {entry.parallel_transmission_mm ?? '—'}
            </td>
            <td className="px-3 py-1 text-right tabular-nums">{signed(entry.horizontal_displacement_mm)}</td>
            <td className="px-3 py-1 text-right tabular-nums">
              {entry.level_drive_mm ?? '—'} / {entry.level_transmission_mm ?? '—'}
            </td>
            <td className="px-3 py-1 text-right tabular-nums">{signed(entry.vertical_displacement_mm)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function textOf(survey: TopographySurvey): SurveyText {
  return {
    title: survey.title,
    survey_date: survey.survey_date,
    reference_label: survey.reference_label,
    plan_number: survey.plan_number,
    instrument: survey.instrument,
    notes: survey.notes,
    plan_notes: survey.plan_notes,
  };
}

function readError(cause: unknown): string | null {
  const data = (cause as { data?: unknown })?.data;
  if (Array.isArray(data)) return String(data[0]);
  if (data && typeof data === 'object' && 'detail' in data) return String((data).detail);
  return null;
}
