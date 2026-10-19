import clsx from 'clsx';
import { type ButtonHTMLAttributes, useContext } from 'react';

import { WriteGate } from './writeGate';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';

const VARIANT: Record<Variant, string> = {
  primary:
    'bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white',
  secondary:
    'border border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800',
  danger: 'border border-red-300 text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-300',
  ghost: 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800',
};

/**
 * What the licence may stop: `write` (saving, deleting — the default for
 * primary and danger buttons), `report` (issuing a work report, stopped only
 * once the subscription lapses) or `none` (anything that does not change data
 * and must keep working: retry, stay signed in, load a licence).
 */
type Gate = 'write' | 'report' | 'none';

export function Button({
  variant = 'secondary',
  gate,
  className,
  disabled,
  title,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; gate?: Gate }) {
  const licence = useContext(WriteGate);
  const kind = gate ?? (variant === 'primary' || variant === 'danger' ? 'write' : 'none');
  const refused = (kind === 'write' && licence.readOnly) || (kind === 'report' && licence.lapsed);
  return (
    <button
      {...props}
      disabled={disabled || refused}
      title={refused ? licence.reason : title}
      className={clsx(
        'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-40',
        VARIANT[variant],
        className,
      )}
    />
  );
}
