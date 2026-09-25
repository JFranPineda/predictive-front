import clsx from 'clsx';
import { useTranslation } from 'react-i18next';

import { useMagnitudesQuery } from '@modules/thresholds';
import { Button } from '@shared/ui/Button';
import { Select, TextInput } from '@shared/ui/Form';

import { groupByService } from '../domain/magnitudeGroups';
import { POINT_AXES, POINT_SIDES, type KindComponent, type PointTemplateRow } from '../domain/types';

/** The point-by-point template, with the rows the server rejected marked. */
export function KindTemplateRows({
  templates,
  components,
  badRows,
  onChange,
}: {
  templates: PointTemplateRow[];
  components: KindComponent[];
  badRows: Set<number>;
  onChange: (rows: PointTemplateRow[]) => void;
}) {
  const { t } = useTranslation('assets');
  const magnitudes = useMagnitudesQuery();
  const byService = groupByService(magnitudes.data ?? []);

  const edit = (index: number, changes: Partial<PointTemplateRow>) =>
    onChange(templates.map((row, position) => (position === index ? { ...row, ...changes } : row)));

  return (
    <>
      <div className="grid grid-cols-[4rem_1fr_1fr_1fr_1.5fr_2rem] gap-2 text-[11px] uppercase tracking-wide text-slate-400">
        <span>{t('kinds.column.point')}</span>
        <span>{t('kinds.column.axis')}</span>
        <span>{t('kinds.column.component')}</span>
        <span>{t('kinds.column.side')}</span>
        <span>{t('kinds.column.magnitudes')}</span>
        <span />
      </div>
      {templates.map((row, index) => (
        <div
          key={index}
          id={`template-row-${index}`}
          className={clsx(
            'grid grid-cols-[4rem_1fr_1fr_1fr_1.5fr_2rem] gap-2 rounded-lg',
            badRows.has(index) && 'bg-red-50 ring-2 ring-red-400 dark:bg-red-950',
          )}
        >
          <TextInput
            type="number"
            min={1}
            value={row.number}
            onChange={(event) => edit(index, { number: Number(event.target.value) })}
          />
          <Select value={row.axis} onChange={(event) => edit(index, { axis: event.target.value })}>
            {POINT_AXES.map((axis) => (
              <option key={axis} value={axis}>
                {axis}
              </option>
            ))}
          </Select>
          <Select
            value={row.component_label ?? ''}
            onChange={(event) => edit(index, { component_label: event.target.value })}
          >
            <option value="">—</option>
            {components.map((component) => (
              <option key={component.label} value={component.label}>
                {component.label}
              </option>
            ))}
          </Select>
          <Select value={row.side} onChange={(event) => edit(index, { side: event.target.value })}>
            {POINT_SIDES.map((side) => (
              <option key={side} value={side}>
                {t(`side.${side}`, { defaultValue: side })}
              </option>
            ))}
          </Select>
          <Select
            multiple
            value={row.magnitudes}
            aria-label={t('kinds.column.magnitudes')}
            onChange={(event) =>
              edit(index, {
                magnitudes: Array.from(event.target.selectedOptions).map((option) => option.value),
              })
            }
            className="h-16"
          >
            {byService.map(([service, rows]) => (
              <optgroup key={service} label={service}>
                {rows.map((magnitude) => (
                  <option key={magnitude.code} value={magnitude.code}>
                    {magnitude.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </Select>
          <Button variant="ghost" onClick={() => onChange(templates.filter((_, p) => p !== index))}>
            ✕
          </Button>
        </div>
      ))}
      <p className="text-xs text-slate-400">{t('kinds.magnitudesHint')}</p>
    </>
  );
}
