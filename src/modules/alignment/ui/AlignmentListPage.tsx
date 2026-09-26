import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { formatDateTime } from '@app/i18n/format';
import { EmptyState } from '@shared/ui/EmptyState';
import { Page } from '@shared/ui/Page';
import { PageHeader } from '@shared/ui/PageHeader';
import { Spinner } from '@shared/ui/Spinner';
import { TextInput } from '@shared/ui/Form';

import { useAlignmentRecordsQuery } from '../infrastructure/endpoints';

/** Mediciones → Alineamiento: what got aligned this month, before/after
 * thumbnails included, no need to open each visit (V3-17 AC-04). */
export default function AlignmentListPage() {
  const { t } = useTranslation(['alignment', 'common']);
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const { data, isLoading } = useAlignmentRecordsQuery({ month });

  return (
    <Page>
      <PageHeader title={t('list.title')} description={t('list.hint')} />
      <TextInput
        type="month"
        value={month}
        onChange={(event) => setMonth(event.target.value)}
        className="w-48"
      />

      {isLoading ? (
        <Spinner label={t('common:loading')} />
      ) : !data || data.length === 0 ? (
        <EmptyState title={t('list.empty')} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((record) => (
            <div
              key={record.id}
              className="rounded-xl border border-slate-200 p-4 dark:border-slate-800"
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">{record.asset_group.name}</span>
                <span className={record.all_ok ? 'text-emerald-600' : 'text-red-600'}>
                  {record.all_ok ? '✓' : '✗'}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                {record.driver_label} → {record.driven_label} · {record.rpm} rpm
              </p>
              <p className="text-xs text-slate-400">{formatDateTime(record.created_at)}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {record.photos.slice(0, 4).map((photo) => (
                  <img
                    key={photo.id}
                    src={photo.thumb_url ?? photo.url}
                    alt=""
                    className="size-12 rounded object-cover ring-1 ring-slate-200 dark:ring-slate-700"
                  />
                ))}
              </div>
              {record.service_visit_id && (
                <Link
                  to={`/services/visits/${record.service_visit_id}`}
                  className="mt-2 inline-block text-xs text-sky-600"
                >
                  {t('list.openVisit')}
                </Link>
              )}
            </div>
          ))}
        </div>
      )}
    </Page>
  );
}
