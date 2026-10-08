import { useEffect } from 'react';
import type { ReactNode } from 'react';

/** A form fits the default; a whole record with its images needs the room. */
const SIZES = {
  md: { box: 'max-w-2xl', body: 'max-h-[60vh]' },
  xl: { box: 'max-w-5xl', body: 'max-h-[78vh]' },
} as const;

export function Modal({
  title,
  description,
  onClose,
  children,
  footer,
  size = 'md',
}: {
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  size?: keyof typeof SIZES;
}) {
  // Escape closes: a dialog that can only be dismissed by hunting for the X is
  // a dialog people abandon the page from.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-6 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
        className={`w-full ${SIZES[size].box} rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900`}
      >
        <header className="border-b border-slate-100 px-5 py-4 dark:border-slate-800">
          <h2 className="text-lg font-semibold">{title}</h2>
          {description && <p className="mt-0.5 text-sm text-slate-500">{description}</p>}
        </header>
        <div className={`${SIZES[size].body} space-y-4 overflow-y-auto px-5 py-4`}>{children}</div>
        {footer && (
          <footer className="flex justify-end gap-2 border-t border-slate-100 px-5 py-3 dark:border-slate-800">
            {footer}
          </footer>
        )}
      </div>
    </div>
  );
}
