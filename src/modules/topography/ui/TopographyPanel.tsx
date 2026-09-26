import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@shared/ui/Button';
import { Card } from '@shared/ui/Card';
import { TextArea, TextInput } from '@shared/ui/Form';

import {
  useCreateTopographyElementMutation,
  useDeleteTopographyElementMutation,
  useTopographyElementsQuery,
  useTopographyHistoryQuery,
  useUpdateTopographyElementMutation,
} from '../infrastructure/endpoints';
import type { TopographyElement } from '../domain/types';

const FIELDS = ['level_h', 'level_v', 'parallel_h', 'parallel_v'] as const;

/** The plan lives in the visit's own captures gallery (kind=topography_plan,
 * V3-18); this panel is only the element table below it. */
export function TopographyPanel({ visitId, assetGroupId, canEdit }: {
  visitId: number;
  assetGroupId: number;
  canEdit: boolean;
}) {
  const { t } = useTranslation(['topography', 'common']);
  const { data } = useTopographyElementsQuery(visitId);
  const [create, { isLoading }] = useCreateTopographyElementMutation();
  const [label, setLabel] = useState('');
  const [openHistory, setOpenHistory] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function addRow() {
    setError(null);
    if (!label.trim()) return;
    try {
      await create({ service_visit: visitId, element_label: label.trim() }).unwrap();
      setLabel('');
    } catch {
      setError(t('form.genericError'));
    }
  }

  return (
    <Card title={t('panel.title')} description={t('panel.hint')}>
      {error && <p className="mb-3 rounded-lg bg-red-50 p-2 text-sm text-red-700">{error}</p>}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800">
              <th className="px-2 py-2 text-left">{t('column.element')}</th>
              {FIELDS.map((field) => (
                <th key={field} className="px-2 py-2 text-right">{t(`column.${field}`)}</th>
              ))}
              <th className="px-2 py-2 text-left">{t('column.observation')}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {(data ?? []).map((row) => (
              <ElementRow
                key={row.id}
                row={row}
                visitId={visitId}
                canEdit={canEdit}
                historyOpen={openHistory === row.element_label}
                onToggleHistory={() =>
                  setOpenHistory(openHistory === row.element_label ? null : row.element_label)
                }
                assetGroupId={assetGroupId}
              />
            ))}
          </tbody>
        </table>
      </div>

      {canEdit && (
        <div className="mt-3 flex gap-2">
          <TextInput
            value={label}
            placeholder={t('form.newElement')}
            onChange={(event) => setLabel(event.target.value)}
            className="w-40"
          />
          <Button variant="secondary" disabled={isLoading || !label.trim()} onClick={() => void addRow()}>
            {t('form.addElement')}
          </Button>
        </div>
      )}
    </Card>
  );
}

function ElementRow({
  row,
  visitId,
  canEdit,
  historyOpen,
  onToggleHistory,
  assetGroupId,
}: {
  row: TopographyElement;
  visitId: number;
  canEdit: boolean;
  historyOpen: boolean;
  onToggleHistory: () => void;
  assetGroupId: number;
}) {
  const { t } = useTranslation(['topography', 'common']);
  const [update] = useUpdateTopographyElementMutation();
  const [remove] = useDeleteTopographyElementMutation();
  const history = useTopographyHistoryQuery(
    { group: assetGroupId, element: row.element_label },
    { skip: !historyOpen },
  );

  return (
    <>
      <tr className="border-b border-slate-100 dark:border-slate-800/60">
        <td className="px-2 py-2 font-mono text-xs font-medium">{row.element_label}</td>
        {FIELDS.map((field) => (
          <td key={field} className="px-2 py-2">
            {canEdit ? (
              <input
                inputMode="decimal"
                defaultValue={row[field] ?? ''}
                onBlur={(event) => void update({ id: row.id, visitId, [field]: event.target.value })}
                className="w-20 rounded-md border border-slate-300 px-2 py-1 text-right text-sm tabular-nums dark:border-slate-700 dark:bg-slate-800"
              />
            ) : (
              <span className="block text-right tabular-nums">{row[field] ?? '—'}</span>
            )}
          </td>
        ))}
        <td className="px-2 py-2">
          {canEdit ? (
            <TextArea
              rows={1}
              defaultValue={row.observation}
              onBlur={(event) => void update({ id: row.id, visitId, observation: event.target.value })}
              className="w-40"
            />
          ) : (
            row.observation || '—'
          )}
        </td>
        <td className="px-2 py-2 text-right">
          <button onClick={onToggleHistory} className="text-xs text-sky-600">
            {t('column.history')}
          </button>
          {canEdit && (
            <button
              onClick={() => void remove({ id: row.id, visitId })}
              className="ml-2 text-xs text-red-600"
            >
              {t('common:action.delete')}
            </button>
          )}
        </td>
      </tr>
      {historyOpen && (
        <tr>
          <td colSpan={FIELDS.length + 3} className="bg-slate-50 px-4 py-3 dark:bg-slate-900/40">
            {!history.data || history.data.length === 0 ? (
              <p className="text-xs text-slate-500">{t('history.empty')}</p>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-slate-500">
                    <th className="text-left">{t('column.date')}</th>
                    {FIELDS.map((field) => (
                      <th key={field} className="text-right">{t(`column.${field}`)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {history.data.map((entry) => (
                    <tr key={entry.id}>
                      <td>{entry.visited_at.slice(0, 10)}</td>
                      {FIELDS.map((field) => (
                        <td key={field} className="text-right tabular-nums">{entry[field] ?? '—'}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </td>
        </tr>
      )}
    </>
  );
}
