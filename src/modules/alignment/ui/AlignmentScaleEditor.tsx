import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { ScaleEditorProps } from '@app/moduleDefinition';
import { Button } from '@shared/ui/Button';
import { TextInput } from '@shared/ui/Form';

import { tierProblem, tierRange } from '../domain/scale';
import type { RpmTier } from '../domain/types';
import { useAlignmentScaleQuery, useSaveAlignmentScaleMutation } from '../infrastructure/endpoints';

/**
 * An alignment norma's scale on the Normas screen (Q10): the tolerance for
 * each RPM tier. Contributed by this module, so it only appears where
 * alignment is installed. Records already emitted keep their tolerance.
 */
export default function AlignmentScaleEditor({ standardId, editable }: ScaleEditorProps) {
  const { t } = useTranslation('alignment');
  const scale = useAlignmentScaleQuery(standardId);
  const [save, { isLoading }] = useSaveAlignmentScaleMutation();
  const [tiers, setTiers] = useState<RpmTier[]>([]);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (scale.data) setTiers(scale.data);
  }, [scale.data]);

  async function submit() {
    const problem = tierProblem(tiers);
    if (problem) {
      setError(t(problem));
      return;
    }
    setError(null);
    try {
      await save({ standardId, tiers }).unwrap();
      setEditing(false);
    } catch (cause) {
      const data = (cause as { data?: unknown })?.data;
      setError(Array.isArray(data) ? String(data[0]) : t('form.genericError'));
    }
  }

  function patch(index: number, change: Partial<RpmTier>) {
    setTiers(tiers.map((tier, position) => (position === index ? { ...tier, ...change } : tier)));
  }

  return (
    <div className="text-sm">
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium">{t('scale.title')}</span>
        {editable && !editing && (
          <Button variant="ghost" onClick={() => setEditing(true)}>
            {t('scale.edit')}
          </Button>
        )}
      </div>
      {error && <p className="mt-1 rounded-lg bg-red-50 p-2 text-xs text-red-700">{error}</p>}
      <table className="mt-1 w-full text-xs">
        <thead className="text-left text-slate-500">
          <tr>
            <th className="py-1">{t('scale.rpm')}</th>
            <th className="py-1">{t('scale.parallel')}</th>
            <th className="py-1">{t('scale.angular')}</th>
            {editing && <th />}
          </tr>
        </thead>
        <tbody>
          {tiers.map((tier, index) => (
            <tr key={index} className="border-t border-slate-100 dark:border-slate-800">
              <td className="py-1 pr-2">
                {editing ? (
                  <TextInput
                    aria-label={t('scale.ceiling')}
                    type="number"
                    placeholder={t('scale.noCeiling')}
                    value={tier.rpm_ceiling ?? ''}
                    onChange={(event) =>
                      patch(index, { rpm_ceiling: event.target.value === '' ? null : Number(event.target.value) })
                    }
                  />
                ) : (
                  tierRange(index === 0 ? null : (tiers[index - 1]?.rpm_ceiling ?? null), tier.rpm_ceiling)
                )}
              </td>
              <td className="py-1 pr-2">
                {editing ? (
                  <TextInput
                    aria-label={t('scale.parallel')}
                    inputMode="decimal"
                    value={tier.parallel_mm}
                    onChange={(event) => patch(index, { parallel_mm: event.target.value })}
                  />
                ) : (
                  `${tier.parallel_mm} mm`
                )}
              </td>
              <td className="py-1 pr-2">
                {editing ? (
                  <TextInput
                    aria-label={t('scale.angular')}
                    inputMode="decimal"
                    value={tier.angular_mm_per_100mm}
                    onChange={(event) => patch(index, { angular_mm_per_100mm: event.target.value })}
                  />
                ) : (
                  `${tier.angular_mm_per_100mm} mm/100mm`
                )}
              </td>
              {editing && (
                <td>
                  <Button variant="ghost" onClick={() => setTiers(tiers.filter((_, position) => position !== index))}>
                    ✕
                  </Button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      {editing && (
        <div className="mt-2 flex flex-wrap gap-2">
          <Button
            onClick={() =>
              setTiers([...tiers, { rpm_ceiling: null, parallel_mm: '', angular_mm_per_100mm: '' }])
            }
          >
            + {t('scale.addTier')}
          </Button>
          <Button variant="primary" disabled={isLoading} onClick={() => void submit()}>
            {t('scale.save')}
          </Button>
          <Button
            onClick={() => {
              setTiers(scale.data ?? []);
              setEditing(false);
              setError(null);
            }}
          >
            {t('scale.cancel')}
          </Button>
        </div>
      )}
      <p className="mt-1 text-xs text-slate-400">{t('scale.hint')}</p>
    </div>
  );
}
