import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@shared/ui/Button';
import { Card } from '@shared/ui/Card';
import { EmptyState } from '@shared/ui/EmptyState';
import { TextArea } from '@shared/ui/Form';

import { useFaultModesQuery, useSetVisitFaultsMutation } from '../infrastructure/endpoints';

/**
 * What this service found, from the vocabulary of its own technique.
 *
 * Optional and multiple: a train can be misaligned *and* have a worn bearing.
 * Kept as a closed list rather than prose so "how many misalignments this
 * quarter" is a query, and each entry carries the standard that defines the
 * term — which is what makes it mean the same thing to the customer.
 * "Otros" closes the list for what it does not name yet, and must say what.
 */
export function FaultPicker({
  visitId,
  technique,
  selected,
  other,
  canEdit,
}: {
  visitId: number;
  technique: string;
  selected: { code: string }[];
  /** What was written under "Otros"; null when it is not marked. */
  other: string | null;
  canEdit: boolean;
}) {
  const { t } = useTranslation(['diagnostics', 'common']);
  const { data } = useFaultModesQuery({ technique });
  const [save, { isLoading }] = useSetVisitFaultsMutation();
  const [codes, setCodes] = useState<Set<string>>(new Set());
  const [otherMarked, setOtherMarked] = useState(false);
  const [otherText, setOtherText] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setCodes(new Set(selected.map((fault) => fault.code)));
  }, [selected]);
  useEffect(() => {
    setOtherMarked(other !== null);
    setOtherText(other ?? '');
  }, [other]);

  const faults = data ?? [];
  const otherValue = otherMarked ? otherText.trim() : null;
  const dirty =
    codes.size !== selected.length ||
    selected.some((fault) => !codes.has(fault.code)) ||
    otherValue !== other;
  const missingOther = otherMarked && !otherText.trim();

  async function submit() {
    setError(null);
    try {
      await save({ visitId, codes: [...codes], other: otherValue }).unwrap();
    } catch (cause) {
      const data = (cause as { data?: unknown })?.data;
      setError(Array.isArray(data) ? String(data[0]) : t('otherRequired'));
    }
  }

  if (!canEdit && selected.length === 0 && other === null) {
    return (
      <Card title={t('title')} description={t('hint')}>
        <EmptyState title={t('none')} />
      </Card>
    );
  }

  return (
    <Card
      title={t('title')}
      description={t('hint')}
      actions={
        canEdit && (
          <Button
            variant="primary"
            disabled={!dirty || isLoading || missingOther}
            onClick={() => void submit()}
          >
            {dirty ? t('save') : t('saved')}
          </Button>
        )
      }
    >
      {error && <p className="mb-2 rounded-lg bg-red-50 p-2 text-xs text-red-700">{error}</p>}
      {faults.length === 0 ? (
        <EmptyState title={t('noCatalogue')} body={t('noCatalogueHint')} />
      ) : (
        <ul className="grid gap-1.5 sm:grid-cols-2">
          {faults.map((fault) => (
            <li key={fault.code}>
              <label
                className={[
                  'flex cursor-pointer items-start gap-2 rounded-lg border p-2 text-sm transition-colors',
                  codes.has(fault.code)
                    ? 'border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30'
                    : 'border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50',
                ].join(' ')}
              >
                <input
                  type="checkbox"
                  disabled={!canEdit}
                  checked={codes.has(fault.code)}
                  onChange={(event) => {
                    const next = new Set(codes);
                    if (event.target.checked) next.add(fault.code);
                    else next.delete(fault.code);
                    setCodes(next);
                  }}
                  className="mt-0.5"
                />
                <span className="min-w-0">
                  <span className="block font-medium leading-tight">{fault.name}</span>
                  {fault.signature && (
                    <span className="block text-xs text-slate-500">{fault.signature}</span>
                  )}
                  {fault.reference && (
                    <span className="block text-[11px] text-slate-400">{fault.reference}</span>
                  )}
                </span>
              </label>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-2 space-y-2 rounded-lg border border-slate-200 p-2 dark:border-slate-800">
        <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            disabled={!canEdit}
            checked={otherMarked}
            onChange={(event) => setOtherMarked(event.target.checked)}
          />
          {t('other')}
        </label>
        {otherMarked &&
          (canEdit ? (
            <TextArea
              rows={2}
              maxLength={300}
              value={otherText}
              placeholder={t('otherPlaceholder')}
              aria-label={t('other')}
              onChange={(event) => setOtherText(event.target.value)}
            />
          ) : (
            <p className="text-sm text-slate-600 dark:text-slate-300">{other}</p>
          ))}
        {missingOther && <p className="text-xs text-red-600">{t('otherRequired')}</p>}
      </div>
    </Card>
  );
}
