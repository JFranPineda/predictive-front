import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';

import { formatDateTime } from '@app/i18n/format';
import { FaultPicker } from '@modules/diagnostics';
import { captureKindFor, MediaGallery } from '@modules/media';
import { useCompanyUsersQuery } from '@modules/users';
import { Button } from '@shared/ui/Button';
import { Card, Field } from '@shared/ui/Card';
import { EmptyState } from '@shared/ui/EmptyState';
import { ErrorState } from '@shared/ui/ErrorState';
import { Page } from '@shared/ui/Page';
import { PageHeader } from '@shared/ui/PageHeader';
import { Spinner } from '@shared/ui/Spinner';
import { StatusBadge } from '@shared/ui/StatusBadge';

import { ENTRY_ORDER } from '../domain/authorship';
import { OperatingSection } from './OperatingSection';
import type { EntryType } from '../domain/types';
import {
  useAddParticipantMutation,
  useAddVisitEntryMutation,
  useDeleteLogEntryMutation,
  useRemoveParticipantMutation,
  useSaveVisitReadingsMutation,
  useUpdateLogEntryMutation,
  useVisitQuery,
} from '../infrastructure/endpoints';
import { readServiceError } from './readServiceError';

export default function VisitDetailPage() {
  const { t } = useTranslation(['services', 'media']);
  const { visitId } = useParams();
  const id = Number(visitId);
  const { data, isLoading, isError } = useVisitQuery(id);
  const [saveReadings, saving] = useSaveVisitReadingsMutation();
  const [addEntry, adding] = useAddVisitEntryMutation();

  const [draft, setDraft] = useState<Record<number, string>>({});
  const [entryText, setEntryText] = useState('');
  const [entryType, setEntryType] = useState<EntryType>('observation');
  const [error, setError] = useState<string | null>(null);

  // The form mirrors the server until the user types; re-mirroring after a
  // save is what makes the recalculated statuses show up.
  useEffect(() => {
    if (!data) return;
    setDraft(
      Object.fromEntries(
        data.points.flatMap((point) =>
          point.values.map((value) => [value.reading_id, trim(value.value, value.decimals)]),
        ),
      ),
    );
  }, [data]);

  const magnitudes = useMemo(() => {
    const seen = new Map<string, { code: string; name: string; unit: string }>();
    data?.points.forEach((point) =>
      point.values.forEach((value) =>
        seen.set(value.magnitude_code, {
          code: value.magnitude_code,
          name: value.magnitude_name,
          unit: value.unit,
        }),
      ),
    );
    return [...seen.values()];
  }, [data]);

  if (isLoading) return <Spinner label={t('visit.loading')} />;
  if (isError || !data) {
    return (
      <Page>
      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <ErrorState title={t('visit.notFound')} body={t('visit.notFoundBody')} />
      </Page>
    );
  }

  // Compare against the *displayed* original, not the raw column value:
  // trimming 0.8700 to 0.87 is not an edit, and counting it as one offered to
  // save 18 changes nobody made.
  const dirty = Object.entries(draft).filter(([readingId, value]) => {
    const original = data.points
      .flatMap((point) => point.values)
      .find((entry) => entry.reading_id === Number(readingId));
    return trim(original?.value ?? null, original?.decimals ?? 2) !== value.trim();
  });

  async function save() {
    await saveReadings({
      visitId: id,
      readings: dirty.map(([readingId, value]) => ({
        reading_id: Number(readingId),
        value: value === '' ? null : value,
      })),
    });
  }

  async function submitEntry() {
    if (!entryText.trim()) return;
    await addEntry({ visitId: id, entry_type: entryType, text: entryText.trim() });
    setEntryText('');
  }

  return (
    <Page>
      <PageHeader
        title={`${data.equipment.tag} · ${data.equipment.name}`}
        description={t('visit.description', {
          area: data.equipment.area_label,
          group: data.equipment.asset_group,
        })}
        actions={
          <Link
            to="/services/authorship"
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm dark:border-slate-700"
          >
            {t('visit.back')}
          </Link>
        }
      />

      {!data.can_edit && (
        <ErrorState
          title={t('visit.readOnly')}
          body={data.report_issued ? t('lock.issued') : t('lock.closed')}
        />
      )}

      <nav className="flex flex-wrap gap-2 text-sm">
        {SECTIONS.map((section) => (
          <a
            key={section}
            href={`#${section}`}
            className="rounded-lg border border-slate-200 px-3 py-1 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            {t(`section.${section}`)}
          </a>
        ))}
      </nav>

      <div id="readings" className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,22rem)]">
        <Card
          title={t('visit.readings')}
          description={t('visit.readingsHint')}
          actions={
            data.can_edit && (
              <button
                onClick={() => void save()}
                disabled={dirty.length === 0 || saving.isLoading}
                className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40 dark:bg-slate-100 dark:text-slate-900"
              >
                {dirty.length > 0
                  ? t('visit.saveCount', { count: dirty.length })
                  : t('visit.saved')}
              </button>
            )
          }
          padded={false}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800">
                  <th className="px-4 py-2 text-left">{t('visit.column.point')}</th>
                  {magnitudes.map((magnitude) => (
                    <th key={magnitude.code} className="px-3 py-2 text-right">
                      {magnitude.name}
                      <span className="ml-1 font-normal normal-case text-slate-400">
                        ({magnitude.unit})
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.points.map((point) => (
                  <tr key={point.point_id} className="border-b border-slate-100 dark:border-slate-800/60">
                    <td className="px-4 py-2">
                      <span className="font-mono text-xs font-medium">{point.label}</span>
                      <span className="ml-2 text-xs text-slate-400">
                        {t(`side.${point.side}`, { defaultValue: '' })}
                      </span>
                    </td>
                    {magnitudes.map((magnitude) => {
                      const value = point.values.find((v) => v.magnitude_code === magnitude.code);
                      if (!value) return <td key={magnitude.code} className="px-3 py-2" />;
                      return (
                        <td key={magnitude.code} className="px-3 py-2">
                          <div className="flex items-center justify-end gap-2">
                            {data.can_edit ? (
                              <input
                                inputMode="decimal"
                                value={draft[value.reading_id] ?? ''}
                                onChange={(event) =>
                                  setDraft({ ...draft, [value.reading_id]: event.target.value })
                                }
                                className="w-24 rounded-md border border-slate-300 px-2 py-1 text-right text-sm tabular-nums dark:border-slate-700 dark:bg-slate-800"
                              />
                            ) : (
                              <span className="tabular-nums">
                                {trim(value.value, value.decimals) || '—'}
                              </span>
                            )}
                            {value.status && (
                              <StatusBadge
                                label={value.status.name}
                                color={value.status.color}
                                size="sm"
                              />
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="min-w-0 space-y-6">
          <Card title={t('visit.summary')}>
            <dl>
              <Field label={t('visit.field.order')}>{data.service_order.code}</Field>
              <Field label={t('visit.field.clientOrder')}>
                {data.service_order.client_work_order || '—'}
              </Field>
              <Field label={t('visit.field.technique')}>{data.technique_name}</Field>
              <Field label={t('visit.field.date')}>{formatDateTime(data.visited_at)}</Field>
              <Field label={t('visit.field.instrument')}>{data.instrument ?? '—'}</Field>
              <Field label={t('visit.field.availability')}>
                {data.availability_status ? (
                  <StatusBadge
                    label={data.availability_status.name}
                    color={data.availability_status.color}
                  />
                ) : (
                  '—'
                )}
              </Field>
              <Field label={t('visit.field.performedBy')}>
                <span className="flex flex-wrap gap-1.5">
                  {data.participants.map((participant) => (
                    <span
                      key={participant.user_id}
                      title={t(`role.${participant.role}`)}
                      className="rounded-full border border-slate-200 px-2 py-0.5 text-xs dark:border-slate-700"
                    >
                      {participant.full_name}
                      {participant.is_external && (
                        <span className="ml-1 text-slate-400">· {t('external')}</span>
                      )}
                    </span>
                  ))}
                  {data.can_edit && (
                    <ParticipantPicker
                      visitId={id}
                      taken={data.participants.map((row) => row.user_id)}
                      onError={setError}
                    />
                  )}
                </span>
              </Field>
            </dl>
          </Card>

          <Card id="diary" title={t('visit.diary')} description={t('visit.diaryHint')}>
            {data.entries.length === 0 ? (
              <EmptyState title={t('visit.noEntries')} />
            ) : (
              <ul className="space-y-3">
                {[...data.entries]
                  .sort(
                    (a, b) =>
                      ENTRY_ORDER.indexOf(a.entry_type) - ENTRY_ORDER.indexOf(b.entry_type),
                  )
                  .map((entry) => (
                    <li key={entry.id} className="text-sm">
                      <div className="flex items-baseline gap-2">
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium dark:bg-slate-800">
                          {t(`entry.${entry.entry_type}`)}
                        </span>
                        <time className="text-xs tabular-nums text-slate-400">
                          {entry.entry_date}
                        </time>
                        {entry.from_this_visit && (
                          <span className="text-[11px] text-sky-600">{t('visit.thisVisit')}</span>
                        )}
                      </div>
                      <DiaryText
                        entry={entry}
                        visitId={id}
                        canEdit={data.can_edit && entry.from_this_visit}
                        onError={setError}
                      />
                      <p className="mt-0.5 text-xs text-slate-400">{entry.author_name}</p>
                    </li>
                  ))}
              </ul>
            )}

            {data.can_edit && (
              <div className="mt-4 space-y-2 border-t border-slate-100 pt-4 dark:border-slate-800">
                <select
                  value={entryType}
                  onChange={(event) => setEntryType(event.target.value as EntryType)}
                  className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800"
                >
                  {ENTRY_ORDER.map((type) => (
                    <option key={type} value={type}>
                      {t(`entry.${type}`)}
                    </option>
                  ))}
                </select>
                <textarea
                  value={entryText}
                  onChange={(event) => setEntryText(event.target.value)}
                  rows={3}
                  placeholder={t('visit.entryPlaceholder')}
                  className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800"
                />
                <button
                  onClick={() => void submitEntry()}
                  disabled={!entryText.trim() || adding.isLoading}
                  className="w-full rounded-lg bg-slate-900 py-1.5 text-xs font-medium text-white disabled:opacity-40 dark:bg-slate-100 dark:text-slate-900"
                >
                  {t('visit.addEntry')}
                </button>
              </div>
            )}
          </Card>
        </div>
      </div>

      <div id="operating">
        <OperatingSection visitId={id} canEdit={data.can_edit} />
      </div>

      <div id="faults">
        <FaultPicker
          visitId={id}
          technique={data.technique_code}
          selected={data.fault_modes}
          canEdit={data.can_edit}
        />
      </div>

      {data.can_edit && data.points.length > 0 && (
        <Link
          to={`/services/visits/${id}/capture`}
          className="inline-block rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white dark:bg-slate-100 dark:text-slate-900"
        >
          {t('visit.capture')}
        </Link>
      )}

      <div id="captures">
        <MediaGallery
          ownerType="visit"
          ownerId={id}
          kind={captureKindFor(data.technique_code)}
          title={t(`media:captures.${data.technique_code}`, {
            defaultValue: t('media:captures.maintenance'),
          })}
          description={t(`media:captures.${data.technique_code}Hint`, {
            defaultValue: t('media:captures.maintenanceHint'),
          })}
          canEdit={data.can_edit}
        />
      </div>

      <div id="photos">
        <MediaGallery
          ownerType="visit"
          ownerId={id}
          kind="photo"
          title={t('media:equipmentPhotos')}
          description={t('media:equipmentPhotosHint')}
          canEdit={data.can_edit}
        />
      </div>
    </Page>
  );
}

/** The order the customer's own report prints them in. */
const SECTIONS = ['readings', 'operating', 'faults', 'captures', 'photos', 'diary'] as const;

/** `0.8700` for a two-decimal magnitude is false precision, and it is what the
 * database column happens to store, not what was measured. */
function trim(value: string | null, decimals: number): string {
  if (value === null || value === '') return '';
  const numeric = Number(value);
  return Number.isNaN(numeric) ? value : String(Number(numeric.toFixed(decimals)));
}


/**
 * The diary is a dated line with an author, not a text box.
 *
 * It was add-only, so a finding typed with a typo stayed in the report for
 * good. Only the lines this visit wrote can be touched, and only while the
 * visit is open — a closed round is what a customer was already told.
 */
function DiaryText({
  entry,
  visitId,
  canEdit,
  onError,
}: {
  entry: { id: number; text: string };
  visitId: number;
  canEdit: boolean;
  onError: (message: string | null) => void;
}) {
  const { t } = useTranslation(['services', 'common']);
  const [update] = useUpdateLogEntryMutation();
  const [remove] = useDeleteLogEntryMutation();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(entry.text);

  async function run(action: () => Promise<unknown>) {
    onError(null);
    try {
      await action();
    } catch (cause) {
      onError(readServiceError(cause) ?? t('form.genericError'));
    }
  }

  if (editing) {
    return (
      <div className="mt-1 space-y-1">
        <textarea
          autoFocus
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          rows={3}
          className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800"
        />
        <span className="flex gap-2">
          <Button
            variant="primary"
            onClick={() =>
              void run(async () => {
                await update({ id: entry.id, visitId, text: draft }).unwrap();
                setEditing(false);
              })
            }
          >
            {t('common:action.save')}
          </Button>
          <Button onClick={() => setEditing(false)}>{t('common:action.cancel')}</Button>
        </span>
      </div>
    );
  }

  return (
    <p className="mt-1 leading-relaxed">
      {entry.text}
      {canEdit && (
        <span className="ml-2 inline-flex gap-2 align-middle">
          <button onClick={() => setEditing(true)} className="text-xs text-sky-600">
            {t('common:action.edit')}
          </button>
          <button
            onClick={() => void run(() => remove({ id: entry.id, visitId }).unwrap())}
            className="text-xs text-red-600"
          >
            {t('common:action.delete')}
          </button>
        </span>
      )}
    </p>
  );
}

/** Who performed the service. It only ever came from the seed. */
function ParticipantPicker({
  visitId,
  taken,
  onError,
}: {
  visitId: number;
  taken: number[];
  onError: (message: string | null) => void;
}) {
  const { t } = useTranslation(['services', 'common']);
  const users = useCompanyUsersQuery();
  const [add] = useAddParticipantMutation();
  const [remove] = useRemoveParticipantMutation();
  const [open, setOpen] = useState(false);

  const available = (users.data ?? []).filter((user) => !taken.includes(user.id));

  async function run(action: () => Promise<unknown>) {
    onError(null);
    try {
      await action();
    } catch (cause) {
      onError(readServiceError(cause) ?? t('form.genericError'));
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-full border border-dashed border-slate-300 px-2 py-0.5 text-xs text-slate-500 dark:border-slate-600"
      >
        + {t('visit.addPerformer')}
      </button>
    );
  }

  return (
    <span className="flex items-center gap-2">
      <select
        defaultValue=""
        onChange={(event) => {
          const user = Number(event.target.value);
          if (user) {
            void run(() => add({ visitId, user, role: 'assistant' }).unwrap());
            setOpen(false);
          }
        }}
        className="rounded-md border border-slate-300 px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-800"
      >
        <option value="">{t('visit.pickPerformer')}</option>
        {available.map((user) => (
          <option key={user.id} value={user.id}>
            {user.full_name}
          </option>
        ))}
      </select>
      {taken.length > 1 && (
        <button
          onClick={() => {
            void run(() => remove({ visitId, user: taken[taken.length - 1]! }).unwrap());
            setOpen(false);
          }}
          className="text-xs text-red-600"
        >
          {t('visit.removeLastPerformer')}
        </button>
      )}
      <button onClick={() => setOpen(false)} className="text-xs text-slate-500">
        {t('common:action.cancel')}
      </button>
    </span>
  );
}
