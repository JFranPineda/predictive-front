import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';

import { useVisitQuery, type VisitPoint } from '@modules/services';
import { useMagnitudesQuery } from '@modules/thresholds';
import { Button } from '@shared/ui/Button';
import { Card } from '@shared/ui/Card';
import { EmptyState } from '@shared/ui/EmptyState';
import { Page } from '@shared/ui/Page';
import { PageHeader } from '@shared/ui/PageHeader';
import { Spinner } from '@shared/ui/Spinner';

import { useRecordReadingsMutation } from '../infrastructure/endpoints';

const NOT_MEASURED = ['equipment_off', 'no_access', 'stopped', 'retired'] as const;

/**
 * Capturing a round: every point of one machine, in one send.
 *
 * This is creation, not correction. The record of values edits readings that
 * already exist, which is no use to a crew whose round has not been entered
 * yet — and that gap is why the bulk endpoint had a use case, an idempotency
 * table and no way in.
 *
 * The key is generated once per screen. If the upload drops and the crew
 * presses again, the server returns the first answer instead of doubling the
 * round.
 */
export default function CapturePage() {
  const { visitId } = useParams();
  const id = Number(visitId);
  const { t } = useTranslation(['measurements', 'common']);
  const navigate = useNavigate();

  const visit = useVisitQuery(id);
  const magnitudes = useMagnitudesQuery();
  const [record, { isLoading }] = useRecordReadingsMutation();

  const [values, setValues] = useState<Record<string, string>>({});
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // One key per screen, not per press: that is what makes the retry safe.
  const idempotencyKey = useMemo(
    () => `visit-${id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    [id],
  );

  const technique = visit.data?.technique_code;
  const columns = useMemo(
    () => (magnitudes.data ?? []).filter((row) => row.technique_code === technique),
    [magnitudes.data, technique],
  );
  // The visit already carries the layout of the machine it is for.
  const rows: VisitPoint[] = useMemo(() => visit.data?.points ?? [], [visit.data]);

  if (visit.isLoading || magnitudes.isLoading) return <Spinner label={t('capture.loading')} />;
  if (!visit.data) return <EmptyState title={t('capture.noVisit')} />;

  async function submit() {
    setError(null);
    setResult(null);
    const readings = rows.flatMap((point) =>
      columns.map((magnitude) => {
        const key = `${point.point_id}:${magnitude.code}`;
        const raw = (values[key] ?? '').trim();
        // A blank is "not measured", which is a row the coverage KPI counts —
        // not an absent row.
        return {
          point_id: point.point_id,
          magnitude_code: magnitude.code,
          value: raw === '' ? null : raw,
          unit_code: magnitude.unit_code,
          aggregation: magnitude.aggregation,
          quality: raw === '' ? 'not_measured' : 'ok',
          not_measured_reason: raw === '' ? (reasons[String(point.point_id)] ?? 'no_access') : '',
        };
      }),
    );
    if (readings.length === 0) return;

    try {
      const answer = await record({ visit: id, idempotencyKey, readings }).unwrap();
      setResult(t('capture.recorded', { count: answer.recorded }));
    } catch (cause) {
      const body = (cause as { data?: unknown })?.data;
      setError(Array.isArray(body) ? String(body[0]) : t('capture.failed'));
    }
  }

  return (
    <Page>
      <PageHeader
        title={t('capture.title', { equipment: visit.data.equipment.name })}
        description={t('capture.subtitle', { order: visit.data.service_order.code })}
        actions={
          <Button onClick={() => void navigate(`/services/visits/${id}`)}>
            {t('capture.backToVisit')}
          </Button>
        }
      />

      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {result && (
        <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
          {result}
        </p>
      )}

      {rows.length === 0 || columns.length === 0 ? (
        <Card>
          <EmptyState title={t('capture.nothingToCapture')} body={t('capture.nothingHint')} />
        </Card>
      ) : (
        <Card title={t('capture.grid')} description={t('capture.gridHint')} padded={false}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 text-left dark:border-slate-800">
                <tr>
                  <th className="px-3 py-2">{t('capture.point')}</th>
                  {columns.map((magnitude) => (
                    <th key={magnitude.code} className="px-3 py-2">
                      {magnitude.name}
                      <span className="ml-1 font-normal text-slate-400">
                        {magnitude.unit_code}
                      </span>
                    </th>
                  ))}
                  <th className="px-3 py-2">{t('capture.reason')}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((point) => (
                  <tr key={point.point_id} className="border-b border-slate-100 dark:border-slate-800">
                    <td className="px-3 py-1.5">
                      <span className="font-mono">{point.label}</span>
                      <span className="ml-2 text-xs text-slate-400">
                        {t(`side.${point.side}`, { ns: 'assets', defaultValue: point.side })}
                      </span>
                    </td>
                    {columns.map((magnitude) => {
                      const key = `${point.point_id}:${magnitude.code}`;
                      return (
                        <td key={key} className="px-3 py-1.5">
                          <input
                            inputMode="decimal"
                            value={values[key] ?? ''}
                            onChange={(event) =>
                              setValues({ ...values, [key]: event.target.value })
                            }
                            className="w-24 rounded border border-slate-300 px-2 py-1 text-right tabular-nums dark:border-slate-700 dark:bg-slate-800"
                          />
                        </td>
                      );
                    })}
                    <td className="px-3 py-1.5">
                      <select
                        value={reasons[String(point.point_id)] ?? 'no_access'}
                        onChange={(event) =>
                          setReasons({ ...reasons, [String(point.point_id)]: event.target.value })
                        }
                        className="rounded border border-slate-300 px-1.5 py-1 text-xs dark:border-slate-700 dark:bg-slate-800"
                      >
                        {NOT_MEASURED.map((reason) => (
                          <option key={reason} value={reason}>
                            {t(`capture.reasonOption.${reason}`)}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Button variant="primary" disabled={isLoading || rows.length === 0} onClick={() => void submit()}>
        {t('capture.send')}
      </Button>
    </Page>
  );
}
