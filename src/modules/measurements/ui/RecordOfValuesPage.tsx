import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';

import { formatDate } from '@app/i18n/format';
import { Button } from '@shared/ui/Button';
import { EmptyState } from '@shared/ui/EmptyState';
import { ErrorState } from '@shared/ui/ErrorState';
import { Page } from '@shared/ui/Page';
import { PageHeader } from '@shared/ui/PageHeader';
import { NameplateModal } from '@modules/nameplate';
import { useDownload } from '@shared/hooks/useDownload';
import { Spinner } from '@shared/ui/Spinner';

import {
  groupByVisit,
  spansOf,
  trimValue,
  type MatrixBlock,
  type MatrixCell,
  type MatrixColumn,
} from '../domain/matrix';
import { useMatrixQuery, useSaveMatrixColumnMutation } from '../infrastructure/endpoints';
import { TrendChart } from './TrendChart';

/**
 * The record of values, laid out as `TABLA DE TENDENCIAS.xls` lays it out and
 * editable in place.
 *
 * Filling a round meant opening one visit per machine; here the whole train is
 * one grid, the history is visible while typing — which is the point, because
 * a value only means something next to the ones before it — and each column
 * saves through its own visit, so the ownership rule still holds.
 */
export default function RecordOfValuesPage() {
  const { t } = useTranslation(['measurements', 'common', 'nameplate']);
  const { equipmentId } = useParams();
  const id = Number(equipmentId);
  const [scope, setScope] = useState<'group' | 'equipment'>('group');
  const { data, isLoading, isError } = useMatrixQuery({ equipment: id, scope });
  const [saveColumn, saving] = useSaveMatrixColumnMutation();
  const [draft, setDraft] = useState<Record<number, string>>({});
  const [error, setError] = useState<string | null>(null);
  const { download, isDownloading, error: downloadError } = useDownload();
  const [editingPlate, setEditingPlate] = useState(false);

  // Mirror the server until the user types; re-mirroring after a save is what
  // makes the recalculated statuses appear.
  useEffect(() => {
    if (!data) return;
    const initial: Record<number, string> = {};
    for (const block of data.blocks) {
      for (const row of block.rows) {
        for (const cell of row.cells) {
          if (cell) initial[cell.reading_id] = trimValue(cell.value, block.decimals);
        }
      }
    }
    setDraft(initial);
  }, [data]);

  const edits = useMemo(() => {
    if (!data) return [];
    const changed: { cell: MatrixCell; value: string }[] = [];
    for (const block of data.blocks) {
      for (const row of block.rows) {
        for (const cell of row.cells) {
          if (!cell) continue;
          const typed = draft[cell.reading_id] ?? '';
          if (typed !== trimValue(cell.value, block.decimals)) changed.push({ cell, value: typed });
        }
      }
    }
    return changed;
  }, [data, draft]);

  async function save() {
    setError(null);
    for (const [visitId, readings] of groupByVisit(edits)) {
      try {
        await saveColumn({ visitId, readings }).unwrap();
      } catch {
        setError(t('record.saveFailed'));
      }
    }
  }

  if (isLoading) return <Spinner label={t('record.loading')} />;
  if (isError || !data) {
    return (
      <Page>
        <ErrorState title={t('common:state.failed')} body={t('common:state.failedBody')} />
      </Page>
    );
  }

  return (
    <Page>
      <PageHeader
        title={t('record.title')}
        description={`${data.equipment.tag} · ${data.equipment.group} · ${data.equipment.area}`}
        actions={
          <>
            <div className="flex rounded-lg border border-slate-200 p-0.5 text-sm dark:border-slate-700">
              {(['group', 'equipment'] as const).map((option) => (
                <button
                  key={option}
                  onClick={() => setScope(option)}
                  className={[
                    'rounded-md px-3 py-1',
                    scope === option
                      ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                      : 'text-slate-500',
                  ].join(' ')}
                >
                  {t(`record.scope.${option}`)}
                </button>
              ))}
            </div>
            <Link
              to="/measurements"
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm dark:border-slate-700"
            >
              {t('trend.back')}
            </Link>
            <Button onClick={() => setEditingPlate(true)}>{t('nameplate:open')}</Button>
            <Button
              disabled={isDownloading}
              onClick={() =>
                void download(
                  `equipments/${id}/matrix/export/?scope=${scope}`,
                  `registro-${data?.equipment.tag ?? id}.xlsx`,
                )
              }
            >
              {isDownloading ? t('record.exporting') : t('record.export')}
            </Button>
            <Button variant="primary" disabled={edits.length === 0 || saving.isLoading} onClick={() => void save()}>
              {edits.length > 0 ? t('record.save', { count: edits.length }) : t('record.saved')}
            </Button>
          </>
        }
      />

      {error && <ErrorState title={error} />}
      {downloadError && <ErrorState title={t('record.exportFailed')} />}

      {data.blocks.length === 0 ? (
        <EmptyState title={t('trend.empty')} body={t('trend.emptyBody')} />
      ) : (
        data.blocks.map((block) => (
          <Block
            key={block.key}
            block={block}
            columns={data.columns}
            draft={draft}
            onChange={(readingId, value) => setDraft({ ...draft, [readingId]: value })}
          />
        ))
      )}

      <p className="text-xs text-slate-400">{t('record.legend')}</p>

      {editingPlate && (
        <NameplateModal equipmentId={id} onClose={() => setEditingPlate(false)} />
      )}
    </Page>
  );
}

function Block({
  block,
  columns,
  draft,
  onChange,
}: {
  block: MatrixBlock;
  columns: MatrixColumn[];
  draft: Record<number, string>;
  onChange: (readingId: number, value: string) => void;
}) {
  const { t } = useTranslation('measurements');
  const spans = spansOf(block.rows);

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
      <header className="bg-slate-800 px-4 py-2 text-sm font-semibold tracking-wide text-white dark:bg-slate-700">
        {/* Only the title is uppercased. A unit's case is part of the unit:
            uppercasing turned dB into "DB" and gE into "GE". */}
        <span className="uppercase">{block.title}</span> ( {block.unit} —{' '}
        <span className="uppercase">{block.aggregation}</span> )
      </header>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-slate-100 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-800">
              <th className="border border-slate-200 px-3 py-1.5 text-left dark:border-slate-700">
                {t('record.column.component')}
              </th>
              <th className="border border-slate-200 px-3 py-1.5 text-left dark:border-slate-700">
                {t('record.column.side')}
              </th>
              <th className="border border-slate-200 px-3 py-1.5 text-left dark:border-slate-700">
                {t('record.column.point')}
              </th>
              {columns.map((column) => (
                <th
                  key={column.key}
                  title={column.order_code}
                  className="border border-slate-200 px-2 py-1.5 text-right font-medium tabular-nums dark:border-slate-700"
                >
                  {formatDate(column.date)}
                  {!column.can_edit && <span className="ml-1 text-slate-400">🔒</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {block.rows.map((row, index) => (
              <tr key={row.point_id} className="odd:bg-white even:bg-slate-50/60 dark:odd:bg-slate-900 dark:even:bg-slate-800/40">
                {spans[index]!.component > 0 && (
                  <th
                    rowSpan={spans[index]!.component}
                    className="border border-slate-200 bg-slate-50 px-3 py-1 text-left align-middle font-semibold dark:border-slate-700 dark:bg-slate-800"
                  >
                    {row.component}
                  </th>
                )}
                {spans[index]!.side > 0 && (
                  <th
                    rowSpan={spans[index]!.side}
                    className="border border-slate-200 bg-slate-50/70 px-3 py-1 text-left align-middle text-xs font-medium uppercase text-slate-500 dark:border-slate-700 dark:bg-slate-800/60"
                  >
                    {t(`side.${row.side}`, { defaultValue: row.side })}
                  </th>
                )}
                <th className="border border-slate-200 bg-slate-50/70 px-3 py-1 text-left font-mono text-xs dark:border-slate-700 dark:bg-slate-800/60">
                  {row.label}
                </th>
                {row.cells.map((cell, position) => {
                  const column = columns[position]!;
                  if (!cell) {
                    return (
                      <td
                        key={column.key}
                        className="border border-slate-200 px-2 py-1 text-center text-slate-300 dark:border-slate-700 dark:text-slate-600"
                      >
                        ·
                      </td>
                    );
                  }
                  return (
                    <td
                      key={column.key}
                      className="border border-slate-200 p-0 dark:border-slate-700"
                      style={
                        cell.status_color ? { backgroundColor: `${cell.status_color}1a` } : undefined
                      }
                    >
                      <input
                        inputMode="decimal"
                        readOnly={!column.can_edit}
                        value={draft[cell.reading_id] ?? ''}
                        onChange={(event) => onChange(cell.reading_id, event.target.value)}
                        title={cell.status_code ?? undefined}
                        className="w-20 bg-transparent px-2 py-1 text-right tabular-nums outline-none read-only:text-slate-500 focus:bg-white focus:ring-2 focus:ring-sky-400 dark:focus:bg-slate-900"
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <TrendChart block={block} columns={columns} />
    </section>
  );
}
