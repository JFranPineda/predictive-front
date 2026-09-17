import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';

import { formatDate, formatNumber } from '@app/i18n/format';
import { useEquipmentQuery } from '@modules/assets';
import { Card } from '@shared/ui/Card';
import { EmptyState } from '@shared/ui/EmptyState';
import { ErrorState } from '@shared/ui/ErrorState';
import { Page } from '@shared/ui/Page';
import { PageHeader } from '@shared/ui/PageHeader';
import { Spinner } from '@shared/ui/Spinner';

import { deltaPercent, toMatrix } from '../domain/trend';
import { useTrendQuery } from '../infrastructure/endpoints';

/** Cell background follows the status the reading got, so a row of numbers
 * reads as a trend at a glance instead of as a spreadsheet. */
const CELL_TONE: Record<string, string> = {
  operational: 'text-emerald-700 dark:text-emerald-400',
  alarm: 'bg-amber-50 font-medium text-amber-800 dark:bg-amber-950/40 dark:text-amber-300',
  shutdown: 'bg-red-50 font-semibold text-red-800 dark:bg-red-950/40 dark:text-red-300',
};

export default function TrendMatrixPage() {
  const { t } = useTranslation('measurements');
  const { equipmentId } = useParams();
  const id = Number(equipmentId);
  const equipment = useEquipmentQuery(id);
  const { data, isLoading, isError } = useTrendQuery({ equipment: id });

  if (isLoading) return <Spinner label={t('loading')} />;

  const { dates, rows } = toMatrix(data ?? []);

  return (
    <Page>
      <PageHeader
        title={
          equipment.data
            ? `${equipment.data.client_tag || equipment.data.asset_code} · ${equipment.data.name}`
            : t('title')
        }
        description={t('trend.subtitle')}
        actions={
          <Link
            to={`/measurements/${id}`}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm dark:border-slate-700"
          >
            {t('trend.back')}
          </Link>
        }
      />

      {isError ? (
        <ErrorState title={t('common:state.failed')} body={t('common:state.failedBody')} />
      ) : rows.length === 0 ? (
        <EmptyState title={t('trend.empty')} body={t('trend.emptyBody')} />
      ) : (
        <Card title={t('title')} description={t('trend.hint')} padded={false}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800">
                  <th className="sticky left-0 bg-white px-4 py-2 text-left dark:bg-slate-900">
                    {t('column.point')}
                  </th>
                  <th className="px-3 py-2 text-left">{t('column.unit')}</th>
                  {dates.map((date) => (
                    <th key={date} className="px-3 py-2 text-right font-medium tabular-nums">
                      {formatDate(date)}
                    </th>
                  ))}
                  <th className="px-3 py-2 text-right">{t('column.delta')}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const delta = deltaPercent(
                    row.cells.filter((cell): cell is NonNullable<typeof cell> => cell !== null),
                  );
                  return (
                    <tr key={row.label} className="border-b border-slate-100 dark:border-slate-800/60">
                      <td className="sticky left-0 bg-white px-4 py-2 font-mono text-xs font-medium dark:bg-slate-900">
                        {row.label}
                      </td>
                      <td className="px-3 py-2 text-xs text-slate-400">{row.unit}</td>
                      {row.cells.map((cell, index) => (
                        <td
                          key={dates[index]}
                          title={cell?.not_measured_reason ?? undefined}
                          className={`px-3 py-2 text-right tabular-nums ${
                            cell?.status_code ? (CELL_TONE[cell.status_code] ?? '') : ''
                          }`}
                        >
                          {cell === null ? (
                            <span className="text-slate-200 dark:text-slate-700">·</span>
                          ) : cell.value === null ? (
                            <span className="text-slate-400" title={t('notMeasured')}>
                              —
                            </span>
                          ) : (
                            formatNumber(cell.value, 2)
                          )}
                        </td>
                      ))}
                      <td className="px-3 py-2 text-right tabular-nums">
                        {delta === null ? (
                          <span className="text-slate-300">—</span>
                        ) : (
                          <span
                            className={delta > 25 ? 'text-amber-600' : 'text-slate-500'}
                            title={t('column.deltaHint')}
                          >
                            {delta > 0 ? '+' : ''}
                            {formatNumber(delta, 0)}%
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </Page>
  );
}
