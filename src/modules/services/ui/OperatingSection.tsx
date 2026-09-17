import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@shared/ui/Button';
import { Card } from '@shared/ui/Card';
import { EmptyState } from '@shared/ui/EmptyState';

import {
  useSaveVisitOperatingMutation,
  useVisitOperatingQuery,
} from '../infrastructure/endpoints';

/**
 * What the equipment was doing while it was measured.
 *
 * The real reports carry these beside the vibration values, and without them
 * two readings are not comparable: 4.6 mm/s at 60 Hz and 4.6 mm/s at 54 Hz
 * are different measurements of a different machine state.
 */
export function OperatingSection({ visitId, canEdit }: { visitId: number; canEdit: boolean }) {
  const { t } = useTranslation(['services', 'common']);
  const { data } = useVisitOperatingQuery(visitId);
  const [save, { isLoading }] = useSaveVisitOperatingMutation();
  const [draft, setDraft] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!data) return;
    setDraft(Object.fromEntries(data.map((row) => [row.code, row.value ?? ''])));
  }, [data]);

  if (!data) return null;
  if (data.length === 0) {
    return (
      <Card title={t('operating.title')}>
        <EmptyState title={t('operating.empty')} body={t('operating.emptyHint')} />
      </Card>
    );
  }

  const dirty = data.filter((row) => (row.value ?? '') !== (draft[row.code] ?? ''));

  return (
    <Card
      title={t('operating.title')}
      description={t('operating.hint')}
      actions={
        canEdit && (
          <Button
            variant="primary"
            disabled={dirty.length === 0 || isLoading}
            onClick={() =>
              void save({
                visitId,
                values: dirty.map((row) => ({
                  code: row.code,
                  value: draft[row.code] === '' ? null : (draft[row.code] ?? null),
                })),
              })
            }
          >
            {dirty.length > 0 ? t('visit.saveCount', { count: dirty.length }) : t('visit.saved')}
          </Button>
        )
      }
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {data.map((row) => (
          <label key={row.code} className="flex items-center gap-2 text-sm">
            <span className="min-w-0 flex-1 truncate text-slate-600 dark:text-slate-300">
              {row.name}
            </span>
            <input
              inputMode="decimal"
              disabled={!canEdit}
              value={draft[row.code] ?? ''}
              onChange={(event) => setDraft({ ...draft, [row.code]: event.target.value })}
              className="w-24 rounded-md border border-slate-300 px-2 py-1 text-right text-sm tabular-nums disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800"
            />
            <span className="w-12 shrink-0 text-xs text-slate-400">{row.unit_code}</span>
          </label>
        ))}
      </div>
    </Card>
  );
}
