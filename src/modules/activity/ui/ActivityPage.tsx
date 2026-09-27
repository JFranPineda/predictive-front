import clsx from 'clsx';
import { Fragment, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { usePermissions } from '@app/hooks';
import { currentLocale } from '@app/i18n';
import { Button } from '@shared/ui/Button';
import { Card } from '@shared/ui/Card';
import { EmptyState } from '@shared/ui/EmptyState';
import { Page } from '@shared/ui/Page';
import { PageHeader } from '@shared/ui/PageHeader';
import { Spinner } from '@shared/ui/Spinner';
import { useDownload } from '@shared/hooks/useDownload';

import { dayKey, KIND_ORDER, KIND_STYLE, queryString, relativeTime } from '../domain/presentation';
import type { ActivityEvent, ActivityFilters, ActivityKind } from '../domain/types';
import { useActivityActorsQuery, useActivityQuery } from '../infrastructure/endpoints';

/**
 * Who did what, and when (Q20): every login, click, page, record created,
 * changed or deleted and every file uploaded, newest first, grouped by day.
 */
export default function ActivityPage() {
  const { t } = useTranslation(['activity', 'common']);
  const permissions = usePermissions();
  const actors = useActivityActorsQuery();
  const { download, isDownloading } = useDownload();

  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const [user, setUser] = useState(0);
  const [kinds, setKinds] = useState<ActivityKind[]>([]);
  const [since, setSince] = useState('');
  const [until, setUntil] = useState('');
  const [cursor, setCursor] = useState<number | undefined>();
  const [rows, setRows] = useState<ActivityEvent[]>([]);

  // Typing is not a query per key: the search waits for a pause.
  useEffect(() => {
    const timer = window.setTimeout(() => setQ(search.trim()), 350);
    return () => window.clearTimeout(timer);
  }, [search]);

  const filters: ActivityFilters = {
    user: user || undefined,
    kind: kinds.length ? kinds.join(',') : undefined,
    q: q || undefined,
    since: since || undefined,
    until: until || undefined,
  };
  const key = JSON.stringify(filters);
  // A new filter is a new list; an old cursor would page into it.
  useEffect(() => {
    setCursor(undefined);
    setRows([]);
  }, [key]);

  // The log is live: what happened a second ago matters, so never the cache.
  const page = useActivityQuery({ ...filters, before: cursor }, { refetchOnMountOrArgChange: true });
  const first = useActivityQuery(filters, { refetchOnMountOrArgChange: true });
  // "Load more" appends: each page is its own query, accumulated here.
  useEffect(() => {
    const items = page.currentData?.items;
    if (!items) return;
    setRows((previous) =>
      cursor === undefined ? items : [...previous.filter((row) => !items.some((i) => i.id === row.id)), ...items],
    );
  }, [page.currentData, cursor]);
  const active = user !== 0 || kinds.length > 0 || q !== '' || since !== '' || until !== '';

  function toggle(kind: ActivityKind) {
    setKinds((current) => (current.includes(kind) ? current.filter((k) => k !== kind) : [...current, kind]));
  }

  function clear() {
    setSearch('');
    setQ('');
    setUser(0);
    setKinds([]);
    setSince('');
    setUntil('');
  }

  return (
    <Page>
      <PageHeader
        title={t('title')}
        description={t('subtitle')}
        actions={
          <>
            <Button
              disabled={first.isFetching}
              onClick={() => {
                setCursor(undefined);
                void first.refetch();
              }}
            >
              {t('refresh')}
            </Button>
            {permissions.has('activity.export') && (
              <Button
                disabled={isDownloading}
                onClick={() => void download(`activity/export/${queryString(filters)}`, 'actividad.csv')}
              >
                {isDownloading ? t('exporting') : t('export')}
              </Button>
            )}
          </>
        }
      />

      <Card padded>
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex min-w-[16rem] flex-1 flex-col gap-1 text-xs font-medium text-slate-500">
            {t('filter.search')}
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t('filter.searchHint')}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
            {t('filter.user')}
            <select
              value={user}
              onChange={(event) => setUser(Number(event.target.value))}
              className="rounded-lg border border-slate-300 px-2 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            >
              <option value={0}>{t('filter.everyone')}</option>
              {(actors.data?.users ?? []).map((person) => (
                <option key={person.id} value={person.id}>
                  {person.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
            {t('filter.since')}
            <input
              type="date"
              value={since}
              onChange={(event) => setSince(event.target.value)}
              className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
            {t('filter.until')}
            <input
              type="date"
              value={until}
              onChange={(event) => setUntil(event.target.value)}
              className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </label>
          {active && (
            <Button variant="ghost" onClick={clear}>
              {t('filter.clear')}
            </Button>
          )}
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {KIND_ORDER.map((kind) => {
            const on = kinds.includes(kind);
            const count = first.data?.counts?.[kind];
            return (
              <button
                key={kind}
                type="button"
                onClick={() => toggle(kind)}
                aria-pressed={on}
                className={clsx(
                  'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition',
                  on
                    ? `${KIND_STYLE[kind].chip} border-transparent ring-2 ring-offset-1 ${KIND_STYLE[kind].ring} dark:ring-offset-slate-900`
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800',
                )}
              >
                <span className={clsx('h-2 w-2 rounded-full', KIND_STYLE[kind].dot)} />
                {t(`kind.${kind}`)}
                {count !== undefined && <span className="tabular-nums text-slate-400">{count}</span>}
              </button>
            );
          })}
        </div>
      </Card>

      <Card
        title={
          first.data
            ? t('count', { count: first.data.total, formatted: first.data.total.toLocaleString(currentLocale()) })
            : t('title')
        }
        description={t('readOnly')}
        padded={false}
      >
        {first.isLoading ? (
          <div className="p-6">
            <Spinner label={t('loading')} />
          </div>
        ) : rows.length === 0 && !page.isFetching ? (
          <div className="p-6">
            <EmptyState title={active ? t('emptyFiltered') : t('empty')} body={t('emptyHint')} />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-[11px] uppercase tracking-wider text-slate-500 dark:border-slate-800">
                  <th className="w-44 px-4 py-2.5 font-semibold">{t('column.at')}</th>
                  <th className="w-56 px-4 py-2.5 font-semibold">{t('column.user')}</th>
                  <th className="w-44 px-4 py-2.5 font-semibold">{t('column.event')}</th>
                  <th className="px-4 py-2.5 font-semibold">{t('column.description')}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <Fragment key={row.id}>
                    {(index === 0 || dayKey(rows[index - 1]!.at) !== dayKey(row.at)) && <DayRow at={row.at} />}
                    <EventRow row={row} />
                  </Fragment>
                ))}
                {page.currentData?.next_before && (
                  <tr>
                    <td colSpan={4} className="px-4 py-4 text-center">
                      <Button disabled={page.isFetching} onClick={() => setCursor(page.currentData!.next_before!)}>
                        {page.isFetching ? t('loading') : t('more')}
                      </Button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </Page>
  );
}

function DayRow({ at }: { at: string }) {
  const { t } = useTranslation('activity');
  const date = new Date(at);
  const today = dayKey(new Date().toISOString());
  const yesterday = dayKey(new Date(Date.now() - 86_400_000).toISOString());
  const key = dayKey(at);
  const label =
    key === today
      ? t('today')
      : key === yesterday
        ? t('yesterday')
        : new Intl.DateTimeFormat(currentLocale(), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(date);
  return (
    <tr>
      <td
        colSpan={4}
        className="bg-slate-50 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:bg-slate-800/60 dark:text-slate-400"
      >
        {label}
      </td>
    </tr>
  );
}

function EventRow({ row }: { row: ActivityEvent }) {
  const { t } = useTranslation('activity');
  const style = KIND_STYLE[row.kind] ?? KIND_STYLE.action;
  const time = new Intl.DateTimeFormat(currentLocale(), {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(row.at));

  return (
    <tr className="border-b border-slate-100 align-top transition hover:bg-slate-50/70 dark:border-slate-800/70 dark:hover:bg-slate-800/40">
      <td className="px-4 py-3">
        <div className="font-mono text-sm tabular-nums text-slate-800 dark:text-slate-200">{time}</div>
        <div className="text-[11px] text-slate-400" title={new Date(row.at).toLocaleString(currentLocale())}>
          {relativeTime(row.at)}
        </div>
      </td>
      <td className="px-4 py-3">
        {row.user ? (
          <div className="flex items-center gap-2.5">
            <span
              className={clsx(
                'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white',
                avatarTone(row.user.name),
              )}
            >
              {row.initials}
            </span>
            <span className="font-medium text-slate-800 dark:text-slate-100">{row.user.name}</span>
          </div>
        ) : (
          <span className="text-slate-400">{t('anonymous')}</span>
        )}
      </td>
      <td className="px-4 py-3">
        <span className={clsx('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold', style.chip)}>
          <span className={clsx('h-1.5 w-1.5 rounded-full', style.dot)} />
          {t(`kind.${row.kind}`)}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="text-slate-700 dark:text-slate-200">{row.description}</div>
        {(row.method || row.ip) && (
          <div className="mt-0.5 font-mono text-[11px] text-slate-400">
            {row.method && `${row.method} ${row.path}`}
            {row.status_code ? ` · ${row.status_code}` : ''}
            {row.ip ? ` · ${row.ip}` : ''}
          </div>
        )}
      </td>
    </tr>
  );
}

const AVATAR_TONES = [
  'bg-sky-600',
  'bg-violet-600',
  'bg-emerald-600',
  'bg-amber-600',
  'bg-rose-600',
  'bg-cyan-600',
  'bg-indigo-600',
  'bg-teal-600',
];

function avatarTone(name: string): string {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return AVATAR_TONES[hash % AVATAR_TONES.length]!;
}
