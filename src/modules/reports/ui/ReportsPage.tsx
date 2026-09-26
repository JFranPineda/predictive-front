import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';

import { usePermissions } from '@app/hooks';
import { usePlantsQuery } from '@modules/assets';
import { useDownload } from '@shared/hooks/useDownload';
import { Button } from '@shared/ui/Button';
import { EmptyState } from '@shared/ui/EmptyState';
import { FormField, Select, TextInput } from '@shared/ui/Form';
import { Page } from '@shared/ui/Page';
import { PageHeader } from '@shared/ui/PageHeader';
import { Spinner } from '@shared/ui/Spinner';

import { useReportOrdersQuery } from '../infrastructure/endpoints';
import { useReportPreview } from './useReportPreview';

const TABS = ['mpd', 'end', 'monthly', 'corrective'] as const;
type Tab = (typeof TABS)[number];

/**
 * Informes MPd y END (V3-23): pick what the report is about, see it exactly
 * as it will print, and download it as PDF or Excel. The choice lives in the
 * URL, so a report can be sent as a link.
 */
export default function ReportsPage() {
  const { t } = useTranslation(['reports', 'common']);
  const permissions = usePermissions();
  const [params, setParams] = useSearchParams();
  const tabs = TABS.filter((tab) => tab !== 'corrective' || permissions.has('maintenance.view'));
  const tab = (tabs as readonly string[]).includes(params.get('tab') ?? '') ? (params.get('tab') as Tab) : 'mpd';

  function set(values: Record<string, string>) {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(values)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    setParams(next, { replace: true });
  }

  return (
    <Page>
      <PageHeader title={t('page.title')} description={t('page.hint')} />
      <nav className="flex flex-wrap gap-2" role="tablist">
        {tabs.map((name) => (
          <button
            key={name}
            role="tab"
            aria-selected={tab === name}
            onClick={() => setParams(new URLSearchParams({ tab: name }), { replace: true })}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              tab === name
                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                : 'border border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
            }`}
          >
            {t(`tab.${name}`)}
          </button>
        ))}
      </nav>
      {tab === 'mpd' && <OrderReport family="mpd" params={params} set={set} />}
      {tab === 'end' && <OrderReport family="ndt" params={params} set={set} />}
      {tab === 'monthly' && <MonthlyReport params={params} set={set} />}
      {tab === 'corrective' && <CorrectiveReport params={params} set={set} />}
    </Page>
  );
}

interface TabProps {
  params: URLSearchParams;
  set: (values: Record<string, string>) => void;
}

function OrderReport({ family, params, set }: TabProps & { family: 'mpd' | 'ndt' }) {
  const { t } = useTranslation('reports');
  const orders = useReportOrdersQuery(family);
  const orderId = Number(params.get('order')) || 0;
  const order = orders.data?.find((row) => row.id === orderId);
  const groupId = Number(params.get('group')) || 0;
  const path =
    family === 'mpd'
      ? order && groupId && order.trains.some((train) => train.id === groupId)
        ? `reports/mpd/?order=${orderId}&group=${groupId}`
        : null
      : order
        ? `reports/end/?order=${orderId}`
        : null;

  if (orders.isLoading) return <Spinner label={t('page.loading')} />;
  if (!orders.data?.length) return <EmptyState title={t(`empty.${family}`)} />;

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label={t('field.order')}>
          <Select value={orderId || ''} onChange={(event) => set({ order: event.target.value, group: '' })}>
            <option value="">—</option>
            {orders.data.map((row) => (
              <option key={row.id} value={row.id}>
                {row.code} · {row.technique} · {row.date}
              </option>
            ))}
          </Select>
        </FormField>
        {family === 'mpd' && (
          <FormField label={t('field.train')}>
            <Select value={groupId || ''} disabled={!order} onChange={(event) => set({ group: event.target.value })}>
              <option value="">—</option>
              {order?.trains.map((train) => (
                <option key={train.id} value={train.id}>
                  {train.name}
                </option>
              ))}
            </Select>
          </FormField>
        )}
      </div>
      <Preview path={path} name={family === 'mpd' ? 'informe-mpd' : 'informe-end'} />
    </>
  );
}

function MonthlyReport({ params, set }: TabProps) {
  const { t } = useTranslation('reports');
  const plants = usePlantsQuery();
  const plant = Number(params.get('plant')) || plants.data?.[0]?.id || 0;
  const month = params.get('month') ?? new Date().toISOString().slice(0, 7);
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label={t('field.plant')}>
          <Select value={plant || ''} onChange={(event) => set({ plant: event.target.value })}>
            {plants.data?.map((row) => (
              <option key={row.id} value={row.id}>
                {row.name}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label={t('field.month')}>
          <TextInput type="month" value={month} onChange={(event) => set({ month: event.target.value })} />
        </FormField>
      </div>
      <Preview path={plant ? `reports/monthly/?plant=${plant}&month=${month}` : null} name={`resumen-${month}`} />
    </>
  );
}

function CorrectiveReport({ params, set }: TabProps) {
  const { t } = useTranslation('reports');
  const today = new Date();
  const first = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
  const from = params.get('from') ?? first;
  const to = params.get('to') ?? today.toISOString().slice(0, 10);
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label={t('field.from')}>
          <TextInput type="date" value={from} onChange={(event) => set({ from: event.target.value })} />
        </FormField>
        <FormField label={t('field.to')}>
          <TextInput type="date" value={to} onChange={(event) => set({ to: event.target.value })} />
        </FormField>
      </div>
      <Preview path={`reports/corrective/?from=${from}&to=${to}`} name={`correctivos-${from}`} />
    </>
  );
}

function Preview({ path, name }: { path: string | null; name: string }) {
  const { t } = useTranslation('reports');
  const { html, isLoading, error } = useReportPreview(path ? `${path}&output=html` : null);
  const { download, isDownloading, error: downloadError } = useDownload();
  const failure = useMemo(() => (error && error !== 'failed' ? error : error ? t('preview.failed') : null), [error, t]);

  if (!path) return <EmptyState title={t('preview.pick')} />;
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button variant="primary" disabled={!html || isDownloading} onClick={() => void download(`${path}&output=pdf`, `${name}.pdf`)}>
          {t('download.pdf')}
        </Button>
        <Button disabled={!html || isDownloading} onClick={() => void download(`${path}&output=xlsx`, `${name}.xlsx`)}>
          {t('download.xlsx')}
        </Button>
      </div>
      {downloadError && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{t('download.failed')}</p>}
      {failure && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{failure}</p>}
      {isLoading && <Spinner label={t('preview.loading')} />}
      {html && (
        <iframe
          title={t('preview.title')}
          srcDoc={html}
          sandbox=""
          className="h-[75vh] w-full rounded-xl border border-slate-200 bg-white dark:border-slate-800"
        />
      )}
    </section>
  );
}
