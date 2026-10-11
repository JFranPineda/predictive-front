import { useEffect, type ReactNode } from 'react';

const APP_NAME = '1A-MIG Predictivo';

/**
 * Every screen opens the same way: what this is, what it means, what you can
 * do. The explanation line is not decoration — without it a table of numbers
 * is just a table of numbers.
 */
export function PageHeader({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children?: ReactNode;
}) {
  // The browser tab says which screen it is: with five tabs open, "SimiAI"
  // five times is no help.
  useEffect(() => {
    document.title = `${title} · ${APP_NAME}`;
  }, [title]);

  return (
    <header className="mb-6 border-b border-slate-200 pb-5 dark:border-slate-800">
      <div className="flex flex-wrap items-start gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {description && (
            <p className="mt-1 max-w-3xl text-sm leading-relaxed text-slate-500">{description}</p>
          )}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
      {children && <div className="mt-4">{children}</div>}
    </header>
  );
}
