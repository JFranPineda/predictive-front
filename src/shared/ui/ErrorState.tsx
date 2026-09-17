import type { ReactNode } from 'react';

/**
 * What a failed query looks like. Pages used to render a spinner forever when
 * a request failed, which is indistinguishable from a hung server.
 */
export function ErrorState({
  title,
  body,
  action,
}: {
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-6 dark:border-red-900/50 dark:bg-red-950/30">
      <p className="font-medium text-red-800 dark:text-red-300">{title}</p>
      {body && <p className="mt-1 text-sm text-red-700/80 dark:text-red-300/70">{body}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
