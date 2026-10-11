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
  onClick,
  active = false,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: Tone;
  swatch?: string;
  /** A tile that filters the list below it: "26 en alarma" shows those 26. */
  onClick?: () => void;
  active?: boolean;
}) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      aria-pressed={onClick ? active : undefined}
      className={clsx(
        'rounded-xl border bg-white px-4 py-3 text-left dark:bg-slate-900',
        active ? 'border-sky-500 ring-2 ring-sky-200 dark:ring-sky-900' : 'border-slate-200 dark:border-slate-800',
        onClick && 'transition hover:border-slate-300 hover:shadow-sm dark:hover:border-slate-600',
      )}
    >
      <div className="flex items-center gap-2">
        {swatch && <span className="size-2.5 rounded-full" style={{ backgroundColor: swatch }} />}
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      </div>
      <p className={clsx('mt-1 text-2xl font-semibold tabular-nums', TONE[tone])}>{value}</p>
      {/* One line only: a paragraph in a tile breaks the row's rhythm. */}
      {hint && <p className="mt-0.5 truncate text-xs text-slate-400" title={hint}>{hint}</p>}
    </Tag>
  );
}

export function MetricRow({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">{children}</div>
  );
}
