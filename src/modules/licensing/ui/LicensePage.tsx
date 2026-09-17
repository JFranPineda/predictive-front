import { useTranslation } from 'react-i18next';

import { Card, Field } from '@shared/ui/Card';
import { ErrorState } from '@shared/ui/ErrorState';
import { Metric, MetricRow } from '@shared/ui/Metric';
import { Page } from '@shared/ui/Page';
import { PageHeader } from '@shared/ui/PageHeader';
import { Spinner } from '@shared/ui/Spinner';

import { useLicenseStatusQuery } from '../infrastructure/endpoints';

const TONE: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
  grace: 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300',
  expired: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300',
  revoked: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300',
  suspended: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300',
  invalid: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300',
};

export default function LicensePage() {
  const { t } = useTranslation(['licensing', 'common']);
  const { data, isLoading, isError, refetch } = useLicenseStatusQuery();

  if (isLoading) return <Spinner label={t('loading')} />;

  // A failed query used to leave the spinner running forever, which looks
  // exactly like a hung server.
  if (isError || !data) {
    return (
      <Page>
        <PageHeader title={t('title')} description={t('subtitle')} />
        <ErrorState
          title={t('common:state.failed')}
          body={t('common:state.failedBody')}
          action={
            <button
              onClick={() => void refetch()}
              className="rounded-lg border border-red-300 px-3 py-1.5 text-sm font-medium text-red-800 dark:border-red-800 dark:text-red-300"
            >
              {t('common:state.retry')}
            </button>
          }
        />
      </Page>
    );
  }

  const expired = data.days_left < 0;

  return (
    <Page>
      <PageHeader title={t('title')} description={t('subtitle')} />

      <MetricRow>
        <Metric
          label={t('field.status')}
          value={
            <span className={`rounded px-2 py-0.5 text-base ${TONE[data.status] ?? ''}`}>
              {t(`status.${data.status}`)}
            </span>
          }
        />
        <Metric
          label={t('field.daysLeft')}
          value={Math.abs(data.days_left)}
          hint={expired ? t('daysHint.overdue') : t('daysHint.left')}
          tone={expired ? 'bad' : data.days_left < 30 ? 'warn' : 'good'}
        />
        <Metric label={t('field.mode')} value={t(data.read_only ? 'readOnly' : 'readWrite')} />
      </MetricRow>

      {data.should_warn && <ErrorState title={t('warning')} />}

      <Card title={t('card.title')}>
        <dl>
          <Field label={t('field.customer')}>{data.tenant_name}</Field>
          <Field label={t('field.code')}>
            <span className="font-mono text-xs">{data.tenant}</span>
          </Field>
          <Field label={t('field.deployment')}>{t(`deployment.${data.deployment}`)}</Field>
          {data.reason && <Field label={t('field.reason')}>{data.reason}</Field>}
        </dl>
      </Card>

      <p className="text-xs leading-relaxed text-slate-400">{t('note')}</p>
    </Page>
  );
}
