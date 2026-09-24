import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { formatDateTime } from '@app/i18n/format';
import { Button } from '@shared/ui/Button';
import { Card } from '@shared/ui/Card';
import { EmptyState } from '@shared/ui/EmptyState';
import { Page } from '@shared/ui/Page';
import { PageHeader } from '@shared/ui/PageHeader';
import { Spinner } from '@shared/ui/Spinner';

import { AUDIT_FAMILIES, describeChange, type AuditEntry } from '../domain/audit';
import { useAuditLogQuery, useCompanyUsersQuery } from '../infrastructure/endpoints';

/** Field data is what the manager watches most, so it gets the loud colour. */
const FAMILY_TONE: Record<string, string> = {
  reading: 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300',
  user: 'bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300',
  role: 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300',
  auth: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
};

/**
 * "Solo lectura + auditoría": the maintenance manager sees who changed what,
 * and when, and can change none of it.
 *
 * Newest first, a page at a time — the log only grows, and it is read from
 * the top: what happened on the last shift.
 */
export default function AuditPage() {
  const { t } = useTranslation(['users', 'common']);
  const [family, setFamily] = useState('');
  const [user, setUser] = useState(0);
  const [before, setBefore] = useState<number | undefined>();
  const people = useCompanyUsersQuery();
  const { data, isLoading, isFetching } = useAuditLogQuery({
    action: family || undefined,
    user: user || undefined,
    before,
  });

  // A new filter is a new list; an old cursor would page into it.
  function narrow(next: { family?: string; user?: number }) {
    if (next.family !== undefined) setFamily(next.family);
    if (next.user !== undefined) setUser(next.user);
    setBefore(undefined);
  }

  if (isLoading) return <Spinner label={t('audit.loading')} />;
  const rows = data?.items ?? [];

  return (
    <Page>
      <PageHeader title={t('audit.title')} description={t('audit.subtitle')} />

      <Card
        title={t('audit.table')}
        description={t('audit.readOnly')}
        actions={
          <div className="flex flex-wrap gap-2">
            <select
              value={family}
              onChange={(event) => narrow({ family: event.target.value })}
              className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800"
            >
              <option value="">{t('audit.allFamilies')}</option>
              {AUDIT_FAMILIES.map((code) => (
                <option key={code} value={code}>
                  {t(`audit.family.${code}`)}
                </option>
              ))}
            </select>
            <select
              value={user}
              onChange={(event) => narrow({ user: Number(event.target.value) })}
              className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800"
            >
              <option value={0}>{t('audit.everyone')}</option>
              {(people.data ?? []).map((person) => (
                <option key={person.id} value={person.id}>
                  {person.full_name}
                </option>
              ))}
            </select>
          </div>
        }
        padded={false}
      >
        {rows.length === 0 ? (
          <div className="p-6">
            <EmptyState title={t('audit.empty')} body={t('audit.emptyHint')} />
          </div>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {rows.map((entry) => (
              <AuditRow key={entry.id} entry={entry} />
            ))}
          </ul>
        )}
      </Card>

      {data?.next_before && (
        <Button disabled={isFetching} onClick={() => setBefore(data.next_before ?? undefined)}>
          {t('audit.more')}
        </Button>
      )}
    </Page>
  );
}

function AuditRow({ entry }: { entry: AuditEntry }) {
  const { t } = useTranslation('users');
  const family = entry.action.split('.')[0] ?? '';
  const change = describeChange(
    entry,
    (key) => t(`audit.field.${key}`, { defaultValue: key }),
    // Status codes and booleans-as-text read as the plant says them; any
    // other value (a TAG, a number) is shown exactly as recorded.
    (raw) => t(`audit.value.${raw}`, { defaultValue: raw }),
  );

  return (
    <li className="flex flex-wrap items-start gap-x-4 gap-y-1 px-4 py-3 text-sm">
      <time className="w-40 shrink-0 tabular-nums text-xs text-slate-500">
        {formatDateTime(entry.at)}
      </time>
      <span className="w-40 shrink-0 font-medium">
        {entry.actor ?? <span className="text-slate-400">{t('audit.anonymous')}</span>}
      </span>
      <span
        className={`shrink-0 rounded px-2 py-0.5 text-[11px] font-semibold ${
          FAMILY_TONE[family] ?? FAMILY_TONE.auth
        }`}
      >
        {t(`audit.action.${entry.action}`, { defaultValue: entry.action })}
      </span>
      <span className="min-w-0 flex-1 text-slate-600 dark:text-slate-300">
        {change || <span className="text-slate-400">—</span>}
        {entry.object_type && (
          <span className="ml-2 font-mono text-[11px] text-slate-400">
            {entry.object_type}#{entry.object_id}
          </span>
        )}
      </span>
      {entry.ip && <span className="font-mono text-[11px] text-slate-400">{entry.ip}</span>}
    </li>
  );
}
