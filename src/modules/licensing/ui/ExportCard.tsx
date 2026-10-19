import { useTranslation } from 'react-i18next';

import { Button } from '@shared/ui/Button';
import { Card } from '@shared/ui/Card';
import { useDownload } from '@shared/hooks/useDownload';

import { useExportStatusQuery, useStartExportMutation } from '../infrastructure/endpoints';

/**
 * The exit guarantee from the screen (v4 Phase 4): everything this customer
 * owns, prepared on the server in the background and downloaded as one ZIP.
 * It works whatever the state of the licence, so its buttons never go dark.
 */
export function ExportCard() {
  const { t, i18n } = useTranslation('licensing');
  const [start, { isLoading: starting }] = useStartExportMutation();
  const status = useExportStatusQuery();
  const preparing = status.data?.status === 'pending' || status.data?.status === 'running';
  // Ask again every few seconds while the server is still preparing it.
  useExportStatusQuery(undefined, { pollingInterval: preparing ? 3000 : 0, skip: !preparing });
  const { download, isDownloading, error } = useDownload();
  const current = status.data;

  async function prepare() {
    await start().unwrap();
    void status.refetch();
  }

  return (
    <section id="export">
      <Card title={t('export.title')} description={t('export.hint')}>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="primary" gate="none" onClick={() => void prepare()} disabled={starting || preparing}>
            {t('export.start')}
          </Button>
          {current?.status === 'done' && current.downloadable && (
            <Button
              gate="none"
              disabled={isDownloading}
              onClick={() => void download(`license/export/${current.id}/download/`, 'predictive-export.zip')}
            >
              {t('export.download')}
            </Button>
          )}
        </div>
        {preparing && <p className="mt-3 text-sm text-slate-500">{t('export.preparing')}</p>}
        {current?.status === 'done' && (
          <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
            {t('export.ready', {
              date: new Date(current.finished_at ?? current.created_at ?? '').toLocaleString(i18n.language),
              rows: (current.rows ?? 0).toLocaleString(i18n.language),
              files: current.files ?? 0,
              size: ((current.size ?? 0) / 1_048_576).toFixed(1),
            })}
          </p>
        )}
        {current?.status === 'failed' && (
          <p className="mt-3 rounded-lg bg-red-50 p-2 text-sm text-red-700">{t('export.failed', { error: current.error })}</p>
        )}
        {error && <p className="mt-3 rounded-lg bg-red-50 p-2 text-sm text-red-700">{t('export.downloadFailed')}</p>}
      </Card>
    </section>
  );
}
