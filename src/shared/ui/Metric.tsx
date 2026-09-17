import clsx from 'clsx';
import type { ReactNode } from 'react';

type Tone = 'neutral' | 'good' | 'warn' | 'bad';

const TONE: Record<Tone, string> = {
  neutral: 'text-slate-900 dark:text-slate-100',
  good: 'text-emerald-600',
  warn: 'text-amber-600',
  bad: 'text-red-600',
};

/** One number with its name and, when the number needs it, what it means. */
export function Metric({
  label,
  value,
  hint,
  tone = 'neutral',
  swatch,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: Tone;
  swatch?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center gap-2">
        {swatch && <span className="size-2.5 rounded-full" style={{ backgroundColor: swatch }} />}
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      </div>
      <p className={clsx('mt-1 text-2xl font-semibold tabular-nums', TONE[tone])}>{value}</p>
      {/* One line only: a paragraph in a tile breaks the row's rhythm. */}
      {hint && <p className="mt-0.5 truncate text-xs text-slate-400" title={hint}>{hint}</p>}
    </div>
  );
}

export function MetricRow({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">{children}</div>
  );
}
