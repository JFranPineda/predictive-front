import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { ScaleEditorProps } from '@app/moduleDefinition';
import { Button } from '@shared/ui/Button';
import { Select, TextInput } from '@shared/ui/Form';

import { tierProblem, tierRange, toInput } from '../domain/scale';
import type { RpmTier, ScaleBand, StatusOption } from '../domain/types';
import { useAlignmentScaleQuery, useSaveAlignmentScaleMutation } from '../infrastructure/endpoints';

/**
 * An alignment norma's scale on the Normas screen (Q10): for each RPM tier,
 * the limit values and the equipment state each one means — "up to 0.05 mm
 * Aceptable, up to 0.10 mm Alarma, above that Parada". Contributed by this
 * module, so it only appears where alignment is installed. Records already
 * emitted keep the scale they were judged with.
 */
export default function AlignmentScaleEditor({ standardId, editable }: ScaleEditorProps) {
  const { t } = useTranslation('alignment');
  const scale = useAlignmentScaleQuery(standardId);
  const [save, { isLoading }] = useSaveAlignmentScaleMutation();
  const [tiers, setTiers] = useState<RpmTier[]>([]);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const options = scale.data?.status_options ?? [];

  useEffect(() => {
    if (scale.data) setTiers(scale.data.tiers);
  }, [scale.data]);

  async function submit() {
    const problem = tierProblem(tiers);
    if (problem) {
      setError(t(problem));
      return;
    }
    setError(null);
    try {
      await save({ standardId, tiers: toInput(tiers) }).unwrap();
      setEditing(false);
    } catch (cause) {
      const data = (cause as { data?: unknown })?.data;
      setError(Array.isArray(data) ? String(data[0]) : t('form.genericError'));
    }
  }

  function patchTier(index: number, change: Partial<RpmTier>) {
    setTiers(tiers.map((tier, position) => (position === index ? { ...tier, ...change } : tier)));
  }

  function patchBand(tierIndex: number, bandIndex: number, change: Partial<ScaleBand>) {
    const tier = tiers[tierIndex]!;
    patchTier(tierIndex, {
      bands: tier.bands.map((band, position) => (position === bandIndex ? { ...band, ...change } : band)),
    });
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

      <div className="mt-2 space-y-2">
        {tiers.map((tier, index) => (
          <div key={index} className="rounded-lg border border-slate-200 p-2 dark:border-slate-700">
            <div className="flex flex-wrap items-center gap-2">
              {editing ? (
                <label className="flex items-center gap-2 text-xs text-slate-500">
                  {t('scale.ceiling')}
                  <TextInput
                    aria-label={t('scale.ceiling')}
                    type="number"
                    className="w-28"
                    placeholder={t('scale.noCeiling')}
                    value={tier.rpm_ceiling ?? ''}
                    onChange={(event) =>
                      patchTier(index, {
                        rpm_ceiling: event.target.value === '' ? null : Number(event.target.value),
                      })
                    }
                  />
                </label>
              ) : (
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                  {tierRange(index === 0 ? null : (tiers[index - 1]?.rpm_ceiling ?? null), tier.rpm_ceiling)}
                </span>
              )}
              {!editing && (
                <div className="flex flex-wrap gap-1.5">
                  {tier.bands.map((band, position) => (
                    <StateChip
                      key={position}
                      name={band.status_name || t('scale.withinTolerance')}
                      color={band.color}
                      text={t('scale.upTo', { parallel: band.parallel_mm, angular: band.angular_mm_per_100mm })}
                    />
                  ))}
                  {tier.beyond && (
                    <StateChip name={tier.beyond.status_name ?? ''} color={tier.beyond.color} text={t('scale.above')} />
                  )}
                </div>
              )}
              {editing && (
                <Button variant="ghost" onClick={() => setTiers(tiers.filter((_, position) => position !== index))}>
                  {t('scale.removeTier')}
                </Button>
              )}
            </div>

            {editing && (
              <div className="mt-2 space-y-1.5">
                <div className="grid grid-cols-[1fr_6rem_6rem_2rem] gap-2 text-[11px] uppercase text-slate-400">
                  <span>{t('scale.state')}</span>
                  <span>{t('scale.parallelUpTo')}</span>
                  <span>{t('scale.angularUpTo')}</span>
                  <span />
                </div>
                {tier.bands.map((band, position) => (
                  <div key={position} className="grid grid-cols-[1fr_6rem_6rem_2rem] gap-2">
                    <StateSelect
                      options={options}
                      value={band.status_code}
                      empty={t('scale.withinTolerance')}
                      onChange={(code) => patchBand(index, position, { status_code: code })}
                    />
                    <TextInput
                      aria-label={t('scale.parallelUpTo')}
                      inputMode="decimal"
                      value={band.parallel_mm}
                      onChange={(event) => patchBand(index, position, { parallel_mm: event.target.value })}
                    />
                    <TextInput
                      aria-label={t('scale.angularUpTo')}
                      inputMode="decimal"
                      value={band.angular_mm_per_100mm}
                      onChange={(event) => patchBand(index, position, { angular_mm_per_100mm: event.target.value })}
                    />
                    <Button
                      variant="ghost"
                      onClick={() => patchTier(index, { bands: tier.bands.filter((_, i) => i !== position) })}
                    >
                      ✕
                    </Button>
                  </div>
                ))}
                <div className="grid grid-cols-[1fr_12.5rem_2rem] items-center gap-2">
                  <StateSelect
                    options={options}
                    value={tier.beyond?.status_code ?? null}
                    empty={t('scale.noStateAbove')}
                    onChange={(code) => patchTier(index, { beyond: code ? { status_code: code } : null })}
                  />
                  <span className="text-xs text-slate-500">{t('scale.aboveAll')}</span>
                </div>
                <Button
                  variant="ghost"
                  onClick={() =>
                    patchTier(index, {
                      bands: [...tier.bands, { status_code: null, parallel_mm: '', angular_mm_per_100mm: '' }],
                    })
                  }
                >
                  + {t('scale.addBand')}
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>

      {editing && (
        <div className="mt-2 flex flex-wrap gap-2">
          <Button
            onClick={() =>
              setTiers([
                ...tiers,
                {
                  rpm_ceiling: null,
                  bands: [{ status_code: options[0]?.code ?? null, parallel_mm: '', angular_mm_per_100mm: '' }],
                  beyond: null,
                },
              ])
            }
          >
            + {t('scale.addTier')}
          </Button>
          <Button variant="primary" disabled={isLoading} onClick={() => void submit()}>
            {t('scale.save')}
          </Button>
          <Button
            onClick={() => {
              setTiers(scale.data?.tiers ?? []);
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

function StateChip({ name, color, text }: { name: string; color?: string; text: string }) {
  return (
    <span
      className="rounded-full px-2 py-0.5 text-[11px] font-medium text-white"
      style={{ backgroundColor: color || '#64748b' }}
    >
      {name} · {text}
    </span>
  );
}

function StateSelect({
  options,
  value,
  empty,
  onChange,
}: {
  options: StatusOption[];
  value: string | null;
  empty: string;
  onChange: (code: string | null) => void;
}) {
  return (
    <Select value={value ?? ''} onChange={(event) => onChange(event.target.value || null)}>
      <option value="">{empty}</option>
      {options.map((option) => (
        <option key={option.code} value={option.code}>
          {option.name}
        </option>
      ))}
    </Select>
  );
}
