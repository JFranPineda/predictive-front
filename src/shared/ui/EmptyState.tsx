import type { ReactNode } from 'react';

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body?: string;
  /** What the user can do about it, e.g. clear a filter that matched nothing. */
  action?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center dark:border-slate-700">
      <p className="font-medium text-slate-600 dark:text-slate-300">{title}</p>
      {body && <p className="mx-auto mt-1 max-w-md text-sm text-slate-400">{body}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
