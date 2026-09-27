import clsx from 'clsx';
import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@shared/ui/Button';
import { Card } from '@shared/ui/Card';
import { FormField, Select, TextArea, TextInput } from '@shared/ui/Form';
import { Spinner } from '@shared/ui/Spinner';

import {
  ACCESS,
  INDICATION_KINDS,
  SIDES,
  journalDirty,
  journalDraft,
  type Access,
  type IndicationKind,
  type JournalDraft,
  type JournalRow,
  type ReportImage,
  type Side,
} from '../domain/types';
import {
  useCreateIndicationMutation,
  useDeleteIndicationMutation,
  useGroupReportQuery,
  useJournalsQuery,
  useRemoveReportImageMutation,
  useRollerResultsQuery,
  useSaveGroupReportMutation,
  useSaveJournalsMutation,
  useUploadReportImageMutation,
} from '../infrastructure/endpoints';

/**
 * The press rollers' journals (Q15), one table per side as the client's
 * report prints them: roller, diameter, external and total length, state —
 * and the findings behind the state.
 */
export function JournalSheet({ order, group, canCapture }: { order: number; group: number; canCapture: boolean }) {
  const { t } = useTranslation(['ut_rollers', 'common']);
  const { data, isLoading } = useJournalsQuery({ order, group });

  if (isLoading) return <Spinner label={t('common:loading')} />;
  if (!data) return null;
  return (
    <div className="space-y-6">
      {SIDES.map((side) => (
        <SideTable key={side} order={order} group={group} side={side} rows={data.sides[side]} canCapture={canCapture} />
      ))}
    </div>
  );
}

function SideTable({
  order,
  group,
  side,
  rows,
  canCapture,
}: {
  order: number;
  group: number;
  side: Side;
  rows: JournalRow[];
  canCapture: boolean;
}) {
  const { t } = useTranslation(['ut_rollers', 'common']);
  const [save, saving] = useSaveJournalsMutation();
  const [drafts, setDrafts] = useState<Record<number, JournalDraft>>({});
  const [opened, setOpened] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDrafts(Object.fromEntries(rows.map((row) => [row.equipment_id, journalDraft(row)])));
  }, [rows]);

  const dirty = useMemo(
    () => rows.filter((row) => drafts[row.equipment_id] && journalDirty(row, drafts[row.equipment_id]!)),
    [rows, drafts],
  );

  function edit(row: JournalRow, change: Partial<JournalDraft>) {
    setDrafts({ ...drafts, [row.equipment_id]: { ...drafts[row.equipment_id]!, ...change } });
  }

  async function submit() {
    setError(null);
    try {
      await save({
        order,
        group,
        side,
        rows: dirty.map((row) => ({ equipment: row.equipment_id, ...drafts[row.equipment_id]! })),
      }).unwrap();
    } catch (cause) {
      const body = (cause as { data?: unknown })?.data;
      setError(Array.isArray(body) ? String(body[0]) : t('sheet.saveFailed'));
    }
  }

  const input =
    'w-20 rounded border border-slate-300 px-1.5 py-1 text-right tabular-nums disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800';

  return (
    <Card
      title={t(`journal.side.${side}`)}
      description={t('journal.hint')}
      padded={false}
      actions={
        canCapture && (
          <Button variant="primary" disabled={dirty.length === 0 || saving.isLoading} onClick={() => void submit()}>
            {dirty.length > 0 ? t('sheet.saveCount', { count: dirty.length }) : t('sheet.upToDate')}
          </Button>
        )
      }
    >
      {error && <p className="m-3 rounded-lg bg-red-50 p-2 text-sm text-red-700">{error}</p>}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800">
              <th className="px-3 py-2 text-left">{t('journal.roller')}</th>
              <th className="px-2 py-2 text-right">{t('journal.diameter')}</th>
              <th className="px-2 py-2 text-right">{t('journal.external')}</th>
              <th className="px-2 py-2 text-right">{t('journal.total')}</th>
              <th className="px-2 py-2 text-left">{t('journal.access')}</th>
              <th className="px-2 py-2 text-left">{t('journal.state')}</th>
              <th className="px-2 py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const draft = drafts[row.equipment_id] ?? journalDraft(row);
              const blocked = draft.access !== 'ok';
              return (
                <Fragment key={row.equipment_id}>
                  <tr className="border-b border-slate-100 align-top dark:border-slate-800/60">
                    <td className="px-3 py-1.5 font-medium">{row.number}</td>
                    {(['diameter_mm', 'external_length_mm', 'total_length_mm'] as const).map((field) => (
                      <td key={field} className="px-1 py-1.5 text-right">
                        {canCapture ? (
                          <input
                            inputMode="decimal"
                            aria-label={`${row.name} ${t(`journal.${field}`)}`}
                            disabled={blocked}
                            value={draft[field]}
                            onChange={(event) => edit(row, { [field]: event.target.value })}
                            className={input}
                          />
                        ) : (
                          <span className="tabular-nums">{draft[field] || '-'}</span>
                        )}
                      </td>
                    ))}
                    <td className="px-2 py-1.5">
                      <Select
                        aria-label={t('journal.access')}
                        disabled={!canCapture}
                        value={draft.access}
                        onChange={(event) => edit(row, { access: event.target.value as Access })}
                      >
                        {ACCESS.map((option) => (
                          <option key={option} value={option}>
                            {t(`journal.accessOption.${option}`)}
                          </option>
                        ))}
                      </Select>
                      {draft.access === 'no_access' && (
                        <input
                          aria-label={t('journal.accessNote')}
                          placeholder={t('journal.accessNotePlaceholder')}
                          disabled={!canCapture}
                          value={draft.access_note}
                          onChange={(event) => edit(row, { access_note: event.target.value })}
                          className="mt-1 w-56 rounded border border-slate-300 px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-800"
                        />
                      )}
                    </td>
                    <td className="px-2 py-1.5">
                      {canCapture ? (
                        <textarea
                          rows={2}
                          aria-label={t('journal.state')}
                          placeholder={row.state || t('journal.statePlaceholder')}
                          value={draft.state_text}
                          onChange={(event) => edit(row, { state_text: event.target.value })}
                          className="w-72 rounded border border-slate-300 px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-800"
                        />
                      ) : (
                        <span className="text-xs">{row.state || '—'}</span>
                      )}
                    </td>
                    <td className="px-2 py-1.5 text-right">
                      <button
                        onClick={() => setOpened(opened === row.equipment_id ? null : row.equipment_id)}
                        className={clsx(
                          'whitespace-nowrap text-xs',
                          row.findings.length ? 'font-semibold text-red-600' : 'text-sky-600',
                        )}
                      >
                        {t('journal.findings', { count: row.findings.length })}
                      </button>
                    </td>
                  </tr>
                  {opened === row.equipment_id && (
                    <tr>
                      <td colSpan={7} className="bg-slate-50 px-4 py-3 dark:bg-slate-900/40">
                        <Findings row={row} order={order} side={side} canEdit={canCapture} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function Findings({ row, order, side, canEdit }: { row: JournalRow; order: number; side: Side; canEdit: boolean }) {
  const { t } = useTranslation(['ut_rollers', 'common']);
  const [create, creating] = useCreateIndicationMutation();
  const [remove] = useDeleteIndicationMutation();
  const [kind, setKind] = useState<IndicationKind>('crack');
  const [length, setLength] = useState('');
  const [depth, setDepth] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function add() {
    setError(null);
    try {
      await create({
        equipment: row.equipment_id,
        kind,
        side,
        service_order: order,
        length_mm: length,
        depth_mm: depth,
      }).unwrap();
      setLength('');
      setDepth('');
    } catch (cause) {
      const body = (cause as { data?: unknown })?.data;
      setError(Array.isArray(body) ? String(body[0]) : t('sheet.saveFailed'));
    }
  }

  return (
    <div className="space-y-3">
      {row.findings.length === 0 && <p className="text-xs text-slate-500">{t('journal.noFindings')}</p>}
      <ul className="space-y-1">
        {row.findings.map((finding) => (
          <li key={finding.id} className="flex items-center justify-between gap-3 text-sm">
            <span>
              <strong className="text-red-600">{t(`indication.kind.${finding.kind}`)}</strong> · {finding.description}
            </span>
            {canEdit && (
              <button onClick={() => void remove(finding.id)} className="text-xs text-red-600">
                {t('common:action.delete')}
              </button>
            )}
          </li>
        ))}
      </ul>
      {canEdit && (
        <div className="grid gap-3 sm:grid-cols-4">
          <FormField label={t('indication.type')}>
            <Select value={kind} onChange={(event) => setKind(event.target.value as IndicationKind)}>
              {INDICATION_KINDS.map((option) => (
                <option key={option} value={option}>
                  {t(`indication.kind.${option}`)}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label={t('journal.at')}>
            <TextInput inputMode="decimal" value={length} onChange={(event) => setLength(event.target.value)} />
          </FormField>
          <FormField label={t('indication.depth')}>
            <TextInput inputMode="decimal" value={depth} onChange={(event) => setDepth(event.target.value)} />
          </FormField>
          <div className="flex items-end">
            <Button disabled={creating.isLoading} onClick={() => void add()}>
              {t('indication.add')}
            </Button>
          </div>
          {error && <p className="text-sm text-red-700 sm:col-span-4">{error}</p>}
        </div>
      )}
    </div>
  );
}

/** "Resumen de resultados", data by data, as the client's report opens with it. */
export function ResultsSummary({ order }: { order: number }) {
  const { t } = useTranslation(['ut_rollers', 'common']);
  const { data, isLoading } = useRollerResultsQuery(order);
  if (isLoading) return <Spinner label={t('common:loading')} />;
  const rows = data?.rows ?? [];
  const groups = [...new Set(rows.map((row) => row.group))];

  return (
    <Card title={t('results.title')} description={t('results.hint')} padded={false}>
      {rows.length === 0 ? (
        <p className="p-4 text-sm text-slate-400">{t('results.empty')}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-slate-900 text-left text-xs uppercase tracking-wide text-white dark:bg-slate-700">
                <th className="px-3 py-2">{t('results.group')}</th>
                <th className="px-3 py-2">{t('results.side')}</th>
                <th className="px-3 py-2">{t('results.kind')}</th>
                <th className="px-3 py-2">{t('results.description')}</th>
                <th className="px-3 py-2 text-center">{t('results.roller')}</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((group) => {
                const sides = rows.filter((row) => row.group === group);
                const span = sides.reduce((total, row) => total + Math.max(1, row.items.length), 0);
                return sides.flatMap((row, sideIndex) => {
                  const items = row.items.length ? row.items : [null];
                  return items.map((item, index) => (
                    <tr key={`${group}-${row.side}-${index}`} className="border-b border-slate-200 dark:border-slate-700">
                      {sideIndex === 0 && index === 0 && (
                        <td rowSpan={span} className="bg-slate-50 px-3 py-2 text-center font-semibold uppercase dark:bg-slate-800/60">
                          {group}
                        </td>
                      )}
                      {index === 0 && (
                        <td rowSpan={items.length} className="px-3 py-2 text-center">
                          {row.side_label}
                        </td>
                      )}
                      <td className="px-3 py-2">{item?.kind ?? '-'}</td>
                      <td className="px-3 py-2">{item?.description ?? '-'}</td>
                      <td className="px-3 py-2 text-center tabular-nums">{item?.roller ?? '-'}</td>
                    </tr>
                  ));
                });
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

/** What the report says about the group (Q15): conclusions, recommendations, plan and photos. */
export function GroupReportCard({ order, group, canEdit }: { order: number; group: number; canEdit: boolean }) {
  const { t } = useTranslation(['ut_rollers', 'common']);
  const { data } = useGroupReportQuery({ order, group });
  const [save, saving] = useSaveGroupReportMutation();
  const [upload, uploading] = useUploadReportImageMutation();
  const [remove] = useRemoveReportImageMutation();
  const [conclusions, setConclusions] = useState('');
  const [recommendations, setRecommendations] = useState('');
  const [caption, setCaption] = useState('');
  const [error, setError] = useState<string | null>(null);
  const photoInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!data) return;
    setConclusions(data.conclusions);
    setRecommendations(data.recommendations);
  }, [data]);

  if (!data) return null;
  const dirty = conclusions !== data.conclusions || recommendations !== data.recommendations;

  async function send(role: 'plan' | 'photo', file: File) {
    setError(null);
    const body = new FormData();
    body.append('role', role);
    body.append('file', file);
    if (role === 'photo' && caption.trim()) body.append('caption', caption.trim());
    try {
      await upload({ order, group, body }).unwrap();
      setCaption('');
    } catch (cause) {
      const response = (cause as { data?: unknown })?.data;
      setError(Array.isArray(response) ? String(response[0]) : t('sheet.saveFailed'));
    }
  }

  return (
    <div className="space-y-6">
      <Card
        title={t('report.title')}
        description={t('report.hint')}
        actions={
          canEdit && (
            <Button
              variant="primary"
              disabled={!dirty || saving.isLoading}
              onClick={() => void save({ order, group, conclusions, recommendations })}
            >
              {t('report.save')}
            </Button>
          )
        }
      >
        {error && <p className="mb-3 rounded-lg bg-red-50 p-2 text-sm text-red-700">{error}</p>}
        <div className="grid gap-4 lg:grid-cols-2">
          <FormField label={t('report.conclusions')}>
            <TextArea rows={5} disabled={!canEdit} value={conclusions} onChange={(event) => setConclusions(event.target.value)} />
          </FormField>
          <FormField label={t('report.recommendations')}>
            <TextArea
              rows={5}
              disabled={!canEdit}
              value={recommendations}
              onChange={(event) => setRecommendations(event.target.value)}
            />
          </FormField>
        </div>
      </Card>

      <Card title={t('report.plan')} description={t('report.planHint')}>
        {data.plan ? (
          <div className="space-y-2">
            <a href={data.plan.url} target="_blank" rel="noreferrer">
              <img src={data.plan.url} alt={t('report.plan')} className="max-h-[28rem] w-full rounded-lg object-contain ring-1 ring-slate-200 dark:ring-slate-700" />
            </a>
            {canEdit && (
              <Button variant="ghost" onClick={() => void remove({ order, group, asset: data.plan!.id })}>
                {t('report.removePlan')}
              </Button>
            )}
          </div>
        ) : canEdit ? (
          <FilePicker label={uploading.isLoading ? t('report.uploading') : t('report.addPlan')} onPick={(file) => void send('plan', file)} />
        ) : (
          <p className="text-sm text-slate-400">{t('report.noPlan')}</p>
        )}
      </Card>

      <Card title={t('report.photos')} description={t('report.photosHint')}>
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {data.photos.map((photo) => (
            <Photo key={photo.id} photo={photo} canEdit={canEdit} onRemove={() => void remove({ order, group, asset: photo.id })} />
          ))}
        </div>
        {canEdit && (
          <div className="mt-4 flex flex-wrap items-end gap-3">
            <FormField label={t('report.caption')}>
              <TextInput value={caption} placeholder={t('report.captionPlaceholder')} onChange={(event) => setCaption(event.target.value)} />
            </FormField>
            <Button onClick={() => photoInput.current?.click()} disabled={uploading.isLoading}>
              + {t('report.addPhoto')}
            </Button>
            <input
              ref={photoInput}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void send('photo', file);
                event.target.value = '';
              }}
            />
          </div>
        )}
      </Card>
    </div>
  );
}

function Photo({ photo, canEdit, onRemove }: { photo: ReportImage; canEdit: boolean; onRemove: () => void }) {
  const { t } = useTranslation('ut_rollers');
  return (
    <figure className="relative">
      <a href={photo.url} target="_blank" rel="noreferrer">
        <img src={photo.thumb_url ?? photo.url} alt={photo.caption} className="h-36 w-full rounded-lg object-cover ring-1 ring-slate-200 dark:ring-slate-700" />
      </a>
      {photo.caption && <figcaption className="mt-1 text-xs text-slate-500">{photo.caption}</figcaption>}
      {canEdit && (
        <button
          type="button"
          aria-label={t('report.removePhoto')}
          onClick={onRemove}
          className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-xs text-white"
        >
          ✕
        </button>
      )}
    </figure>
  );
}

function FilePicker({ label, onPick }: { label: string; onPick: (file: File) => void }) {
  return (
    <label className="flex h-40 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 text-sm text-slate-500 hover:border-sky-400 hover:text-sky-600 dark:border-slate-600">
      <span className="text-2xl">+</span>
      {label}
      <input
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onPick(file);
          event.target.value = '';
        }}
      />
    </label>
  );
}
