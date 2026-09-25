import { useTranslation } from 'react-i18next';

import { formatDate } from '@app/i18n/format';

import { firstLine } from '../../domain/spectra';
import type { Spectrum } from '../../domain/types';

/** A spectrum, closed: capture, type, date and the first line of its finding. */
export function SpectrumTile({ spectrum, onOpen }: { spectrum: Spectrum; onOpen: () => void }) {
  const { t } = useTranslation('measurements');
  return (
    <li>
      <button
        onClick={onOpen}
        className="w-full rounded-xl border border-slate-200 p-2 text-left hover:border-sky-300 dark:border-slate-800"
      >
        {spectrum.thumb_url ? (
          <img
            src={spectrum.thumb_url}
            alt={spectrum.caption || spectrum.point_label}
            loading="lazy"
            className="aspect-4/3 w-full rounded object-cover"
          />
        ) : (
          <span className="flex aspect-4/3 w-full items-center justify-center rounded bg-slate-50 text-xs text-slate-400 dark:bg-slate-800">
            {spectrum.has_numeric_data ? t('spectra.numericOnly', { lines: spectrum.lines ?? 0 }) : '—'}
          </span>
        )}
        <span className="mt-1.5 flex items-center gap-2 text-xs">
          <span className="rounded bg-slate-100 px-1.5 py-0.5 dark:bg-slate-800">
            {t(`spectra.type.${spectrum.spectrum_type}`, { defaultValue: spectrum.spectrum_type })}
          </span>
          <time className="ml-auto text-slate-400">{formatDate(spectrum.taken_at)}</time>
        </span>
        <span className="mt-1 block truncate text-xs text-slate-500">
          {firstLine(spectrum.caption) || t('spectra.noFinding')}
        </span>
      </button>
    </li>
  );
}
