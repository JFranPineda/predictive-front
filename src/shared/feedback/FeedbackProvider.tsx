import clsx from 'clsx';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@shared/ui/Button';
import { Modal } from '@shared/ui/Modal';

/**
 * The two things every screen needs to say and nobody should rebuild:
 * "are you sure?" before something that cannot be undone, and "done" or
 * "that failed" after an action — said where the person is looking, not in a
 * line at the top of a page they scrolled away from.
 */

export interface ConfirmRequest {
  title: string;
  body?: string;
  confirmLabel?: string;
  /** Destructive actions get the red button; the rest the primary one. */
  tone?: 'danger' | 'primary';
}

type ToastTone = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  tone: ToastTone;
  text: string;
  action?: { label: string; run: () => void };
}

interface Feedback {
  confirm: (request: ConfirmRequest) => Promise<boolean>;
  toast: (tone: ToastTone, text: string, action?: Toast['action']) => void;
}

const FeedbackContext = createContext<Feedback | null>(null);

// Long enough to read a sentence and reach the undo button, short enough
// that a burst of saves does not stack into a wall.
const TOAST_MS = 5000;

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<(ConfirmRequest & { resolve: (ok: boolean) => void }) | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const confirm = useCallback(
    (request: ConfirmRequest) => new Promise<boolean>((resolve) => setPending({ ...request, resolve })),
    [],
  );
  const toast = useCallback((tone: ToastTone, text: string, action?: Toast['action']) => {
    const id = nextId.current++;
    setToasts((current) => [...current.slice(-3), { id, tone, text, action }]);
  }, []);
  const dismiss = useCallback((id: number) => setToasts((current) => current.filter((row) => row.id !== id)), []);

  function settle(ok: boolean) {
    pending?.resolve(ok);
    setPending(null);
  }

  return (
    <FeedbackContext.Provider value={{ confirm, toast }}>
      {children}
      {pending && <ConfirmDialog request={pending} onSettle={settle} />}
      <div aria-live="polite" className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2">
        {toasts.map((row) => (
          <ToastCard key={row.id} toast={row} onDismiss={() => dismiss(row.id)} />
        ))}
      </div>
    </FeedbackContext.Provider>
  );
}

function ConfirmDialog({
  request,
  onSettle,
}: {
  request: ConfirmRequest;
  onSettle: (ok: boolean) => void;
}) {
  const { t } = useTranslation('common');
  return (
    <Modal
      title={request.title}
      onClose={() => onSettle(false)}
      footer={
        <>
          <Button onClick={() => onSettle(false)}>{t('action.cancel')}</Button>
          <Button
            variant={request.tone === 'primary' ? 'primary' : 'danger'}
            autoFocus
            onClick={() => onSettle(true)}
          >
            {request.confirmLabel ?? t('feedback.confirm')}
          </Button>
        </>
      }
    >
      {request.body && <p className="text-sm text-slate-700 dark:text-slate-200">{request.body}</p>}
      {request.tone !== 'primary' && (
        <p className="text-sm text-slate-500 dark:text-slate-400">{t('feedback.cannotUndo')}</p>
      )}
    </Modal>
  );
}

const TOAST_TONE: Record<ToastTone, string> = {
  success: 'border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-100',
  error: 'border-red-300 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-100',
  info: 'border-slate-300 bg-white text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100',
};

function ToastCard({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const { t } = useTranslation('common');
  // An error stays until it is read; good news goes on its own.
  useEffect(() => {
    if (toast.tone === 'error') return undefined;
    const timer = window.setTimeout(onDismiss, TOAST_MS);
    return () => window.clearTimeout(timer);
  }, [toast.tone, onDismiss]);

  return (
    <div
      role={toast.tone === 'error' ? 'alert' : 'status'}
      className={clsx('pointer-events-auto flex items-start gap-3 rounded-xl border px-4 py-3 text-sm shadow-lg', TOAST_TONE[toast.tone])}
    >
      <span className="flex-1">{toast.text}</span>
      {toast.action && (
        <button
          type="button"
          onClick={() => {
            toast.action?.run();
            onDismiss();
          }}
          className="font-semibold underline"
        >
          {toast.action.label}
        </button>
      )}
      <button type="button" onClick={onDismiss} aria-label={t('feedback.dismiss')} className="opacity-60 hover:opacity-100">
        ×
      </button>
    </div>
  );
}

/** `if (!(await confirm({ title }))) return;` before anything irreversible. */
export function useConfirm(): Feedback['confirm'] {
  const context = useContext(FeedbackContext);
  if (!context) throw new Error('useConfirm needs <FeedbackProvider>');
  return context.confirm;
}

/** `toast.success('Guardado')` after an action, `toast.error(reason)` when it fails. */
export function useToast() {
  const context = useContext(FeedbackContext);
  if (!context) throw new Error('useToast needs <FeedbackProvider>');
  const { toast } = context;
  return {
    success: (text: string, action?: Toast['action']) => toast('success', text, action),
    error: (text: string) => toast('error', text),
    info: (text: string) => toast('info', text),
  };
}
