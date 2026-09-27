import { currentLocale } from '@app/i18n';

import type { ActivityFilters, ActivityKind } from './types';

/** The order the filter chips read in: getting in, looking, changing. */
export const KIND_ORDER: ActivityKind[] = [
  'login',
  'login_failed',
  'navigation',
  'click',
  'create',
  'update',
  'delete',
  'upload',
  'action',
  'denied',
];

export const KIND_STYLE: Record<ActivityKind, { chip: string; dot: string; ring: string }> = {
  login: {
    chip: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
    dot: 'bg-emerald-500',
    ring: 'ring-emerald-400',
  },
  login_failed: {
    chip: 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300',
    dot: 'bg-red-500',
    ring: 'ring-red-400',
  },
  logout: {
    chip: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
    dot: 'bg-slate-400',
    ring: 'ring-slate-400',
  },
  navigation: {
    chip: 'bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300',
    dot: 'bg-sky-500',
    ring: 'ring-sky-400',
  },
  click: {
    chip: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
    dot: 'bg-slate-500',
    ring: 'ring-slate-400',
  },
  create: {
    chip: 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300',
    dot: 'bg-green-500',
    ring: 'ring-green-400',
  },
  update: {
    chip: 'bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
    dot: 'bg-amber-500',
    ring: 'ring-amber-400',
  },
  delete: {
    chip: 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300',
    dot: 'bg-rose-500',
    ring: 'ring-rose-400',
  },
  upload: {
    chip: 'bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-300',
    dot: 'bg-violet-500',
    ring: 'ring-violet-400',
  },
  action: {
    chip: 'bg-cyan-50 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300',
    dot: 'bg-cyan-500',
    ring: 'ring-cyan-400',
  },
  denied: {
    chip: 'bg-orange-50 text-orange-800 dark:bg-orange-950 dark:text-orange-300',
    dot: 'bg-orange-500',
    ring: 'ring-orange-400',
  },
};

/** The local calendar day of an instant, to group rows under it. */
export function dayKey(at: string): string {
  const date = new Date(at);
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

/** "hace 3 min", "hace 2 h", "hace 5 días". */
export function relativeTime(at: string, now = Date.now(), locale = currentLocale()): string {
  const seconds = Math.round((new Date(at).getTime() - now) / 1000);
  const format = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  const abs = Math.abs(seconds);
  if (abs < 60) return format.format(seconds, 'second');
  if (abs < 3600) return format.format(Math.round(seconds / 60), 'minute');
  if (abs < 86_400) return format.format(Math.round(seconds / 3600), 'hour');
  return format.format(Math.round(seconds / 86_400), 'day');
}

export function queryString(filters: ActivityFilters): string {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== '') params.set(key, String(value));
  });
  const text = params.toString();
  return text ? `?${text}` : '';
}
