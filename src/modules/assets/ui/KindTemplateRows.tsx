import clsx from 'clsx';
import { useState, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';

import { useInstalled } from '@app/hooks';
import { useMagnitudesQuery } from '@modules/thresholds';
import { useToast } from '@shared/feedback/FeedbackProvider';
import { Button } from '@shared/ui/Button';
import { Select, TextInput } from '@shared/ui/Form';

import { groupByService, type MagnitudeName } from '../domain/magnitudeGroups';
import {
  addAxis,
  groupPoints,
  insertPoint,
  removePoint,
  type TemplatePoint,
} from '../domain/templateLayout';
import { POINT_SIDES, type KindComponent, type PointTemplateRow } from '../domain/types';

// One literal per layout: Tailwind only ships the classes it can read here.
const GRID = {
  3: 'grid-cols-[3.5rem_9.5rem_repeat(3,minmax(0,1fr))_2rem]',
  4: 'grid-cols-[3.5rem_9.5rem_repeat(4,minmax(0,1fr))_2rem]',
} as const;

// A colour per service, so a row of chips reads at a glance: blue is
// vibration, orange is thermography.
const SERVICE_TONE: Record<string, string> = {
  vibration: 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200',
  thermography: 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-200',
  ultrasound: 'bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-200',
  ndt_thickness: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200',
};
const OTHER_TONE = 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200';

interface Open {
  number: number;
  axis: string;
}

/**
 * The point-by-point template: one line per point, its axes side by side.
 *
 * `onChange(rows, true)` means points were added or removed, so the counts the
 * components declare must follow.
 */
export function KindTemplateRows({
  templates,
  components,
  badRows,
  onChange,
}: {
  templates: PointTemplateRow[];
  components: KindComponent[];
  badRows: Set<number>;
  onChange: (rows: PointTemplateRow[], recount?: boolean) => void;
}) {
  const { t } = useTranslation(['assets', 'common']);
  const toast = useToast();
  const hasMeasurements = useInstalled('measurements');
  const magnitudes = useMagnitudesQuery(undefined, { skip: !hasMeasurements });
  const catalogue = magnitudes.data ?? [];
  const [open, setOpen] = useState<Open | null>(null);

  const sections = groupPoints(templates, components);
  const axes = templates.some((row) => row.axis === 'N') ? ['H', 'V', 'A', 'N'] : ['H', 'V', 'A'];
  const grid = GRID[axes.length as 3 | 4];

  const editPoint = (point: TemplatePoint, changes: Partial<PointTemplateRow>) =>
    onChange(templates.map((row, index) => (point.indexes.includes(index) ? { ...row, ...changes } : row)));

  const editRow = (index: number, changes: Partial<PointTemplateRow>) =>
    onChange(templates.map((row, position) => (position === index ? { ...row, ...changes } : row)));

  // A number is committed when the field is left: typing "12" would otherwise
  // pass through point 1 and merge with it on the way.
  function renumber(point: TemplatePoint, number: number) {
    if (!number || number === point.number) return;
    if (templates.some((row) => row.number === number)) {
      toast.error(t('kinds.numberTaken', { number }));
      return;
    }
    setOpen(null);
    editPoint(point, { number });
  }

  function applyToAxis(axis: string, codes: string[]) {
    const previous = templates;
    const count = templates.filter((row) => row.axis === axis).length;
    onChange(templates.map((row) => (row.axis === axis ? { ...row, magnitudes: [...codes] } : row)));
    toast.success(t('kinds.appliedToAxis', { count, axis }), {
      label: t('common:feedback.undo'),
      run: () => onChange(previous),
    });
  }

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[640px] space-y-3">
        <div className={clsx('grid gap-2 px-2 text-[11px] uppercase tracking-wide text-slate-400', grid)}>
          <span>{t('kinds.column.point')}</span>
          <span>{t('kinds.column.side')}</span>
          {axes.map((axis) => (
            <span key={axis} title={t(`kinds.axisName.${axis}`)}>
              {t('kinds.column.axis')} {axis}
            </span>
          ))}
          <span />
        </div>

        {sections.map((section) => (
          <section
            key={section.label || '—'}
            className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800"
          >
            <header className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 dark:bg-slate-800/60">
              <span className="text-sm font-semibold">
                {section.known ? section.label || t('kinds.unnamedComponent') : t('kinds.orphans')}
              </span>
              <span className="text-xs text-slate-500">
                {section.known
                  ? t('kinds.pointsCount', { count: section.points.length })
                  : t('kinds.orphansHint')}
              </span>
              {section.known && (
                <Button
                  variant="ghost"
                  className="ml-auto py-1 text-xs"
                  onClick={() => onChange(insertPoint(templates, components, section.label), true)}
                >
                  + {t('kinds.addPointTo', { label: section.label || t('kinds.unnamedComponent') })}
                </Button>
              )}
            </header>

            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {section.points.map((point) => (
                <div
                  key={`${section.label}-${point.number}`}
                  data-template-rows={point.indexes.join(' ')}
                  className={clsx(
                    'space-y-2 p-2',
                    point.indexes.some((index) => badRows.has(index)) &&
                      'bg-red-50 ring-2 ring-inset ring-red-400 dark:bg-red-950',
                  )}
                >
                  <div className={clsx('grid items-center gap-2', grid)}>
                    <PointNumber
                      key={point.number}
                      value={point.number}
                      onCommit={(number) => renumber(point, number)}
                    />
                    <Select
                      value={point.side}
                      aria-label={t('kinds.column.side')}
                      onChange={(event) => editPoint(point, { side: event.target.value })}
                    >
                      {POINT_SIDES.map((side) => (
                        <option key={side} value={side}>
                          {t(`side.${side}`, { defaultValue: side })}
                        </option>
                      ))}
                    </Select>
                    {axes.map((axis) => {
                      const index = point.axes[axis];
                      const active = open?.number === point.number && open.axis === axis;
                      return index === undefined ? (
                        <button
                          key={axis}
                          type="button"
                          onClick={() => {
                            onChange(addAxis(templates, point.number, axis));
                            setOpen({ number: point.number, axis });
                          }}
                          className="h-full min-h-8 rounded-md border border-dashed border-slate-300 text-xs text-slate-400 hover:border-slate-400 hover:text-slate-600 dark:border-slate-700"
                        >
                          + {axis}
                        </button>
                      ) : (
                        <button
                          key={axis}
                          type="button"
                          aria-expanded={active}
                          aria-label={t('kinds.editAxis', { number: point.number, axis })}
                          onClick={() => setOpen(active ? null : { number: point.number, axis })}
                          className={clsx(
                            'flex min-h-8 flex-wrap content-center gap-1 rounded-md border px-1.5 py-1 text-left',
                            active
                              ? 'border-sky-500 ring-2 ring-sky-200 dark:ring-sky-900'
                              : 'border-slate-200 hover:border-slate-400 dark:border-slate-700',
                          )}
                        >
                          <MagnitudeChips codes={templates[index]!.magnitudes} catalogue={catalogue} />
                        </button>
                      );
                    })}
                    <Button
                      variant="ghost"
                      className="px-2"
                      aria-label={t('kinds.removePoint', { number: point.number })}
                      title={t('kinds.removePoint', { number: point.number })}
                      onClick={() => {
                        setOpen(null);
                        onChange(removePoint(templates, point.number), true);
                      }}
                    >
                      ✕
                    </Button>
                  </div>

                  {open?.number === point.number && point.axes[open.axis] !== undefined && (
                    <MagnitudeEditor
                      number={point.number}
                      axis={open.axis}
                      selected={templates[point.axes[open.axis]!]!.magnitudes}
                      catalogue={catalogue}
                      onlyAxis={Object.keys(point.axes).length === 1}
                      onToggle={(code) => {
                        const index = point.axes[open.axis]!;
                        const current = templates[index]!.magnitudes;
                        editRow(index, {
                          magnitudes: current.includes(code)
                            ? current.filter((value) => value !== code)
                            : [...current, code],
                        });
                      }}
                      onApplyToAxis={() =>
                        applyToAxis(open.axis, templates[point.axes[open.axis]!]!.magnitudes)
                      }
                      onRemoveAxis={() => {
                        const index = point.axes[open.axis]!;
                        setOpen(null);
                        onChange(templates.filter((_, position) => position !== index));
                      }}
                      onClose={() => setOpen(null)}
                    />
                  )}
                </div>
              ))}
              {section.points.length === 0 && (
                <p className="px-3 py-2 text-xs text-slate-400">{t('kinds.noPoints')}</p>
              )}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function PointNumber({ value, onCommit }: { value: number; onCommit: (number: number) => void }) {
  const { t } = useTranslation('assets');
  const [draft, setDraft] = useState(String(value));
  return (
    <TextInput
      type="number"
      min={1}
      value={draft}
      aria-label={t('kinds.column.point')}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={() => {
        onCommit(Number(draft));
        setDraft(String(value));
      }}
      onKeyDown={(event) => event.key === 'Enter' && event.currentTarget.blur()}
    />
  );
}

/** What an axis reads, as short coloured chips; the full name is on hover. */
function MagnitudeChips({ codes, catalogue }: { codes: string[]; catalogue: MagnitudeName[] }) {
  const { t } = useTranslation('assets');
  if (codes.length === 0) return <span className="text-xs text-slate-400">{t('kinds.nothingRead')}</span>;
  return (
    <>
      {codes.map((code) => {
        const magnitude = catalogue.find((row) => row.code === code);
        return (
          <span
            key={code}
            title={magnitude?.name ?? code}
            className={clsx(
              'rounded px-1.5 py-0.5 text-[11px] font-medium leading-tight',
              SERVICE_TONE[magnitude?.technique_code ?? ''] ?? OTHER_TONE,
            )}
          >
            {t(`kinds.short.${code}`, { defaultValue: magnitude?.name ?? code })}
          </span>
        );
      })}
    </>
  );
}

function MagnitudeEditor({
  number,
  axis,
  selected,
  catalogue,
  onlyAxis,
  onToggle,
  onApplyToAxis,
  onRemoveAxis,
  onClose,
}: {
  number: number;
  axis: string;
  selected: string[];
  catalogue: MagnitudeName[];
  onlyAxis: boolean;
  onToggle: (code: string) => void;
  onApplyToAxis: () => void;
  onRemoveAxis: () => void;
  onClose: () => void;
}) {
  const { t } = useTranslation(['assets', 'common']);

  // Escape closes this panel, not the whole dialog underneath it.
  function onKeyDown(event: KeyboardEvent) {
    if (event.key !== 'Escape') return;
    event.stopPropagation();
    onClose();
  }

  return (
    <div
      onKeyDown={onKeyDown}
      className="space-y-3 rounded-lg border border-sky-200 bg-sky-50/60 p-3 dark:border-sky-900 dark:bg-sky-950/40"
    >
      <p className="text-sm font-medium">{t('kinds.editorTitle', { number, axis })}</p>
      {catalogue.length === 0 ? (
        <p className="text-xs text-slate-500">{t('kinds.noCatalogue')}</p>
      ) : (
        <div className="space-y-2">
          {groupByService(catalogue).map(([service, rows]) => (
            <div key={service} className="flex flex-col gap-1.5 sm:flex-row sm:items-start">
              <span className="shrink-0 pt-1 text-xs text-slate-500 sm:w-44">{service}</span>
              <div className="flex flex-wrap gap-1.5">
                {rows.map((magnitude) => {
                  const pressed = selected.includes(magnitude.code);
                  return (
                    <button
                      key={magnitude.code}
                      type="button"
                      aria-pressed={pressed}
                      onClick={() => onToggle(magnitude.code)}
                      className={clsx(
                        'rounded-full border px-2.5 py-1 text-xs transition-colors',
                        pressed
                          ? 'border-sky-600 bg-sky-600 text-white dark:border-sky-400 dark:bg-sky-400 dark:text-slate-900'
                          : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200',
                      )}
                    >
                      {pressed ? '✓ ' : ''}
                      {magnitude.name}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
      <p className="text-xs text-slate-500">{t('kinds.magnitudesHint')}</p>
      <div className="flex flex-wrap items-center gap-2 border-t border-sky-100 pt-2 dark:border-sky-900">
        <Button className="text-xs" onClick={onApplyToAxis}>
          {t('kinds.applyToAxis', { axis })}
        </Button>
        <button
          type="button"
          disabled={onlyAxis}
          title={onlyAxis ? t('kinds.lastAxis') : undefined}
          onClick={onRemoveAxis}
          className="rounded-lg px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-40 dark:text-red-400 dark:hover:bg-red-950"
        >
          {t('kinds.removeAxis', { axis })}
        </button>
        <Button variant="primary" className="ml-auto text-xs" onClick={onClose}>
          {t('kinds.done')}
        </Button>
      </div>
    </div>
  );
}
