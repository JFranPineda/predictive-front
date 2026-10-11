import type { ReactNode } from 'react';

/** Consistent page frame: one max width, one gutter, one rhythm. */
export function Page({ children }: { children: ReactNode }) {
  return <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">{children}</div>;
}
