import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { useAppSelector } from '@app/hooks';
import { formatDateTime } from '@app/i18n/format';
import { Button } from '@shared/ui/Button';
import { Card } from '@shared/ui/Card';
import { EmptyState } from '@shared/ui/EmptyState';
import { ErrorState } from '@shared/ui/ErrorState';
import { Page } from '@shared/ui/Page';
import { PageHeader } from '@shared/ui/PageHeader';
import { Spinner } from '@shared/ui/Spinner';

import { groupEntries, lockReason, signature } from '../domain/authorship';
import type { ServiceAuthorship } from '../domain/types';
import {
  useAuthorshipQuery,
  useDeleteVisitMutation,
  useUpdateVisitMutation,
} from '../infrastructure/endpoints';
import { readServiceError } from './readServiceError';
import { VisitFormModal } from './VisitFormModal';

export default function AuthorshipPage() {
  const { t } = useTranslation(['services', 'common']);
  const [onlyMine, setOnlyMine] = useState(false);
  const currentUserId = useAppSelector((state) => state.session.userId);
  const permissions = useAppSelector((state) => state.session.permissions);
  const canCreate = permissions.includes('measurements.add_reading');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { data, isLoading, isError } = useAuthorshipQuery(
    onlyMine && currentUserId ? { performed_by: currentUserId } : {},
  );

  if (isLoading) return <Spinner label={t('loading')} />;

  const rows = data?.results ?? [];

  return (
    <Page>
      <PageHeader
        title={t('title')}
        description={t('subtitle')}
        actions={
          <>
            <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 text-sm dark:border-slate-700">
              <input
                type="checkbox"
                checked={onlyMine}
                onChange={(event) => setOnlyMine(event.target.checked)}
              />
              {t('onlyMine')}
            </label>
            {canCreate && (
              <Button variant="primary" onClick={() => setCreating(true)}>
                + {t('visitForm.new')}
              </Button>
            )}
          </>
        }
      />

      {error && <ErrorState title={error} />}

      {isError ? (
        <ErrorState title={t('common:state.failed')} body={t('common:state.failedBody')} />
      ) : rows.length === 0 ? (
        <EmptyState title={t('empty')} body={t('emptyBody')} />
      ) : (
        <div className="space-y-4">
          {rows.map((visit) => (
            <VisitCard
              key={visit.visit_id}
              visit={visit}
              currentUserId={currentUserId ?? -1}
              onError={setError}
            />
          ))}
        </div>
      )}

      {creating && <VisitFormModal onClose={() => setCreating(false)} />}
    </Page>
  );
}

function VisitCard({
  visit,
  currentUserId,
  onError,
}: {
  visit: ServiceAuthorship;
  currentUserId: number;
  onError: (message: string | null) => void;
}) {
  const { t } = useTranslation(['services', 'common']);
  const [updateVisit] = useUpdateVisitMutation();
  const [deleteVisit] = useDeleteVisitMutation();
  const locked = lockReason(visit, currentUserId);
  const groups = groupEntries(visit.entries);

  async function run(action: () => Promise<unknown>) {
    onError(null);
    try {
      await action();
    } catch (cause) {
      onError(readServiceError(cause) ?? t('form.genericError'));
    }
  }

  return (
    <Card padded={false}>
      <header className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-slate-100 px-4 py-3 dark:border-slate-800">
        <Link
          to={`/services/visits/${visit.visit_id}`}
          className="font-medium hover:text-sky-600"
        >
          {visit.equipment_name}
        </Link>
        <span className="font-mono text-xs text-slate-500">{visit.equipment_tag}</span>
        <span className="text-sm text-slate-500">{visit.area_label}</span>
        <span className="rounded bg-slate-100 px-2 py-0.5 text-xs dark:bg-slate-800">
          {visit.technique_name}
        </span>
        <time className="ml-auto text-sm text-slate-500">{formatDateTime(visit.visited_at)}</time>
      </header>

      <div className="flex flex-wrap items-center gap-2 px-4 py-3">
        {visit.participants.map((participant) => (
          <span
            key={participant.user_id}
            className="flex items-center gap-1.5 rounded-full border border-slate-200 py-0.5 pl-0.5 pr-2.5 text-xs dark:border-slate-700"
            title={t(`role.${participant.role}`)}
          >
            <span className="flex size-5 items-center justify-center rounded-full bg-slate-900 text-[10px] font-semibold text-white dark:bg-slate-100 dark:text-slate-900">
              {participant.initials || participant.full_name.slice(0, 2).toUpperCase()}
            </span>
            {participant.full_name}
            {participant.is_external && <span className="text-slate-400">· {t('external')}</span>}
          </span>
        ))}
        <span className="ml-auto text-xs text-slate-400">
          {t('signature', {
            readings: visit.reading_count,
            media: visit.media_count,
            signature: signature(visit.participants),
          })}
        </span>
      </div>

      {groups.length > 0 && (
        <div className="space-y-3 border-t border-slate-100 px-4 py-3 dark:border-slate-800">
          {groups.map((group) => (
            <section key={group.type}>
              <h3 className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
                {t(`entry.${group.type}`)}
              </h3>
              <ul className="mt-1 space-y-1">
                {group.entries.map((entry) => (
                  <li key={entry.id} className="flex gap-3 text-sm">
                    <time className="shrink-0 tabular-nums text-slate-400">{entry.entry_date}</time>
                    <p className="flex-1 leading-relaxed">{entry.text}</p>
                    <span className="shrink-0 text-xs text-slate-400">{entry.author_name}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      <footer className="border-t border-slate-100 px-4 py-2 text-xs dark:border-slate-800">
        {locked ? (
          <span className="flex items-center gap-2 text-slate-500">
            <span>🔒 {t(locked.key, locked.values)}</span>
            <Link to={`/services/visits/${visit.visit_id}`} className="font-medium text-sky-600">
              {t('viewOnly')}
            </Link>
          </span>
        ) : (
          <span className="flex items-center gap-3">
            <Link to={`/services/visits/${visit.visit_id}`} className="font-medium text-sky-600">
              {t('editMine')}
            </Link>
            <button
              onClick={() => void run(() => updateVisit({ id: visit.visit_id, close: true }).unwrap())}
              className="font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            >
              {t('closeVisit')}
            </button>
            {visit.reading_count === 0 && (
              <button
                onClick={() => void run(() => deleteVisit(visit.visit_id).unwrap())}
                className="font-medium text-red-600"
              >
                {t('common:action.delete')}
              </button>
            )}
          </span>
        )}
      </footer>
    </Card>
  );
}
