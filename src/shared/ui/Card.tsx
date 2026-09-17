import type { ReactNode } from 'react';

export function Card({
  id,
  title,
  description,
  actions,
  children,
  padded = true,
}: {
  id?: string;
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  padded?: boolean;
}) {
  return (
    <section
      id={id}
      className="scroll-mt-6 rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
    >
      {(title || actions) && (
        <header className="flex flex-wrap items-start gap-3 border-b border-slate-100 px-4 py-3 dark:border-slate-800">
          <div className="min-w-0 flex-1">
            {title && <h2 className="font-medium">{title}</h2>}
            {description && <p className="mt-0.5 text-xs text-slate-500">{description}</p>}
          </div>
          {actions}
        </header>
      )}
      <div className={padded ? 'p-4' : ''}>{children}</div>
    </section>
  );
}

/** A label/value pair, aligned across the whole card. The label column is
 * narrow enough to survive a sidebar and wraps instead of pushing the value
 * out of view. */
export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex gap-3 py-1.5 text-sm">
      <dt className="w-28 shrink-0 text-slate-500">{label}</dt>
      <dd className="min-w-0 flex-1 font-medium break-words">{children}</dd>
    </div>
  );
}
