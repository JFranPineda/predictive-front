import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@shared/ui/Button';
import { FormField, Select, TextInput } from '@shared/ui/Form';
import { Modal } from '@shared/ui/Modal';
import { Spinner } from '@shared/ui/Spinner';

import { POINT_AXES, POINT_SIDES } from '../domain/types';
import {
  useApplyPointTemplateMutation,
  useCreatePointMutation,
  useDeletePointMutation,
  useGroupPointsQuery,
} from '../infrastructure/endpoints';
import { readKindError } from './GroupKindsPage';

/**
 * The measuring layout of one train, as it actually exists.
 *
 * "Apply the kind's template" fills in whatever is missing without touching
 * what is already there, so running it twice is safe and a train that was set
 * up by hand does not lose its numbering.
 */
export function GroupPointsModal({
  groupId,
  groupName,
  onClose,
}: {
  groupId: number;
  groupName: string;
  onClose: () => void;
}) {
  const { t } = useTranslation(['assets', 'common']);
  const { data, isLoading } = useGroupPointsQuery(groupId);
  const [applyTemplate, applying] = useApplyPointTemplateMutation();
  const [createPoint, creatingPoint] = useCreatePointMutation();
  const [deletePoint] = useDeletePointMutation();
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState({ equipment: 0, number: 1, axis: 'H', side: 'custom' });

  async function run(action: () => Promise<unknown>) {
    setError(null);
    try {
      await action();
    } catch (cause) {
      setError(readKindError(cause) ?? t('form.genericError'));
    }
  }

  return (
    <Modal
      title={t('points.title', { group: groupName })}
      description={t('points.hint')}
      onClose={onClose}
      footer={<Button onClick={onClose}>{t('common:action.cancel')}</Button>}
    >
      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {isLoading || !data ? (
        <Spinner label={t('points.loading')} />
      ) : (
        <>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-500">
              {t('points.kind', { kind: data.group.kind ?? '—' })}
            </span>
            <Button
              variant="primary"
              disabled={applying.isLoading || !data.group.kind}
              onClick={() => void run(() => applyTemplate(groupId).unwrap())}
            >
              {t('points.applyTemplate')}
            </Button>
          </div>

          {data.equipments.map((equipment) => {
            const points = data.points.filter((point) => point.equipment_id === equipment.id);
            return (
              <section key={equipment.id}>
                <h3 className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">
                  {equipment.name} · {equipment.tag}
                </h3>
                {points.length === 0 ? (
                  <p className="text-sm text-slate-400">{t('points.none')}</p>
                ) : (
                  <ul className="flex flex-wrap gap-2">
                    {points.map((point) => (
                      <li
                        key={point.id}
                        className="flex items-center gap-2 rounded-lg border border-slate-200 px-2 py-1 text-xs dark:border-slate-700"
                      >
                        <span className="font-mono font-medium">{point.label}</span>
                        <span className="text-slate-400">
                          {t(`side.${point.side}`, { defaultValue: point.side })}
                        </span>
                        {point.reading_count > 0 && (
                          <span className="text-slate-400" title={t('points.hasReadings')}>
                            · {point.reading_count}
                          </span>
                        )}
                        <button
                          onClick={() => void run(() => deletePoint(point.id).unwrap())}
                          className="text-slate-400 hover:text-red-600"
                          aria-label={t('common:action.delete')}
                        >
                          ✕
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            );
          })}

          <div className="grid grid-cols-[1.6fr_4rem_4rem_1fr_auto] gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
            <FormField label={t('points.equipment')}>
              <Select
                value={draft.equipment || ''}
                onChange={(event) =>
                  setDraft({ ...draft, equipment: Number(event.target.value) })
                }
              >
                <option value="">—</option>
                {data.equipments.map((equipment) => (
                  <option key={equipment.id} value={equipment.id}>
                    {equipment.name}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label={t('points.number')}>
              <TextInput
                type="number"
                min={1}
                value={draft.number}
                onChange={(event) => setDraft({ ...draft, number: Number(event.target.value) })}
              />
            </FormField>
            <FormField label={t('points.axis')}>
              <Select
                value={draft.axis}
                onChange={(event) => setDraft({ ...draft, axis: event.target.value })}
              >
                {POINT_AXES.map((axis) => (
                  <option key={axis} value={axis}>
                    {axis}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label={t('points.side')}>
              <Select
                value={draft.side}
                onChange={(event) => setDraft({ ...draft, side: event.target.value })}
              >
                {POINT_SIDES.map((side) => (
                  <option key={side} value={side}>
                    {t(`side.${side}`, { defaultValue: side })}
                  </option>
                ))}
              </Select>
            </FormField>
            <div className="flex items-end">
              <Button
                variant="primary"
                disabled={creatingPoint.isLoading || !draft.equipment}
                onClick={() => void run(() => createPoint(draft).unwrap())}
              >
                +
              </Button>
            </div>
          </div>
        </>
      )}
    </Modal>
  );
}
