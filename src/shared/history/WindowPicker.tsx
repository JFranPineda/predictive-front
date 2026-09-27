import { useTranslation } from 'react-i18next';

import { formatDateRange } from '@app/i18n/format';

import { clampWindow, earliestStart, WINDOW_DAYS, type DateWindow } from './window';

/**
 * The two dates that bound a log screen, and the sentence that explains why
 * they cannot be further apart than a fortnight.
 *
 * Both ends empty means the default window — the last two weeks — which the
 * server answers with, and reports back so the reader sees the dates.
 */
export function WindowPicker({
  value,
  shown,
  days = WINDOW_DAYS,
  onChange,
}: {
  value: DateWindow;
  /** What the server actually served, to print under the inputs. */
  shown?: { since: string; until: string };
  days?: number;
  onChange: (window: DateWindow) => void;
}) {
  const { t } = useTranslation('common');
  const minSince = value.until ? earliestStart(value.until, days) : undefined;

  return (
    <div className="flex flex-wrap items-end gap-3">
      <Field label={t('history.since')}>
        <input
          type="date"
          value={value.since}
          min={minSince}
          max={value.until || undefined}
          onChange={(event) => onChange(clampWindow({ ...value, since: event.target.value }, 'since', days))}
          className={INPUT}
        />
      </Field>
      <Field label={t('history.until')}>
        <input
          type="date"
          value={value.until}
          onChange={(event) => onChange(clampWindow({ ...value, until: event.target.value }, 'until', days))}
          className={INPUT}
        />
      </Field>
      <p className="max-w-md pb-1 text-xs text-slate-500">
        {shown && (
          <span className="mr-1 font-medium text-slate-600 dark:text-slate-300">
            {formatDateRange(shown.since, shown.until)}.
          </span>
        )}
        {t('history.windowHint', { days })}
      </p>
    </div>
  );
}

const INPUT =
  'rounded-lg border border-slate-300 px-2 py-1.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
      {label}
      {children}
    </label>
  );
}
