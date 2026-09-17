import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@shared/ui/Button';
import { Card } from '@shared/ui/Card';
import { EmptyState } from '@shared/ui/EmptyState';

import { useFaultModesQuery, useSetVisitFaultsMutation } from '../infrastructure/endpoints';

/**
 * What this service found, from the vocabulary of its own technique.
 *
 * Optional and multiple: a train can be misaligned *and* have a worn bearing.
 * Kept as a closed list rather than prose so "how many misalignments this
 * quarter" is a query, and each entry carries the standard that defines the
 * term — which is what makes it mean the same thing to the customer.
 */
export function FaultPicker({
  visitId,
  technique,
  selected,
  canEdit,
}: {
  visitId: number;
  technique: string;
  selected: { code: string }[];
  canEdit: boolean;
}) {
  const { t } = useTranslation(['diagnostics', 'common']);
  const { data } = useFaultModesQuery({ technique });
  const [save, { isLoading }] = useSetVisitFaultsMutation();
  const [codes, setCodes] = useState<Set<string>>(new Set());

  useEffect(() => {
    setCodes(new Set(selected.map((fault) => fault.code)));
  }, [selected]);

  const faults = data ?? [];
  const dirty =
    codes.size !== selected.length || selected.some((fault) => !codes.has(fault.code));

  if (!canEdit && selected.length === 0) {
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
            disabled={!dirty || isLoading}
            onClick={() => void save({ visitId, codes: [...codes] })}
          >
            {dirty ? t('save') : t('saved')}
          </Button>
        )
      }
    >
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
    </Card>
  );
}
