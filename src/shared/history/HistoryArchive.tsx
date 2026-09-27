import { useTranslation } from 'react-i18next';

import { usePermissions } from '@app/hooks';
import { currentLocale } from '@app/i18n';
import { useDownload } from '@shared/hooks/useDownload';
import { Button } from '@shared/ui/Button';
import { Card } from '@shared/ui/Card';

import { useArchiveHistoryMutation, useHistoryQuery, type HistoryFile } from './endpoints';

/**
 * Where the rest of a log is.
 *
 * The screen above shows a fortnight because a log that only grows cannot be
 * read by scrolling it. Everything older is filed on disk, one CSV per month,
 * and this is the card that says so, names the folder and hands over the
 * file — so "it is not in the screen" never means "it is gone".
 */
export function HistoryArchive({ source }: { source: string }) {
  const { t } = useTranslation('common');
  const { data, isLoading } = useHistoryQuery(source);
  const { download, isDownloading } = useDownload();
  const permissions = usePermissions();
  const [fileNow, filing] = useArchiveHistoryMutation();
  const archive = data?.sources.find((row) => row.code === source);

  if (isLoading || !archive) return null;
  return (
    <Card
      title={t('history.title')}
      description={t('history.hint', { days: data?.window_days ?? 14 })}
      actions={
        // Filing runs nightly; the button is for the day somebody wants the
        // fortnight to end right now.
        permissions.has('core.archive_history') ? (
          <Button disabled={filing.isLoading} onClick={() => void fileNow()}>
            {filing.isLoading ? t('history.archiving') : t('history.archiveNow')}
          </Button>
        ) : undefined
      }
      padded
    >
      <p className="mb-3 break-all font-mono text-xs text-slate-500">{archive.folder}</p>
      {archive.files.length === 0 ? (
        <p className="text-sm text-slate-500">{t('history.empty')}</p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {archive.files.map((file) => (
            <li key={file.period}>
              <Button
                disabled={isDownloading}
                onClick={() =>
                  void download(`history/${source}/${file.period}/`, `${source}-${file.period}.csv`)
                }
              >
                {monthLabel(file.period)}
                <span className="ml-2 tabular-nums text-xs text-slate-400">
                  {t('history.rows', { count: file.rows })} · {size(file)}
                </span>
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/** "2026-07" as the month a person says, in their own language. */
function monthLabel(period: string): string {
  const [year, month] = period.split('-').map(Number);
  return new Intl.DateTimeFormat(currentLocale(), { year: 'numeric', month: 'long' }).format(
    new Date(year!, month! - 1, 1),
  );
}

function size(file: HistoryFile): string {
  const kb = file.size / 1024;
  return kb < 1024 ? `${Math.max(Math.round(kb), 1)} KB` : `${(kb / 1024).toFixed(1)} MB`;
}
