import { useTranslation } from 'react-i18next';

import { useConditionStatusesQuery } from '@modules/thresholds';
import { Button } from '@shared/ui/Button';

import { EQUIPMENT_TYPES } from '../domain/types';
import { useAreasQuery, useGroupKindsQuery } from '../infrastructure/endpoints';

const CONTROL =
  'rounded-lg border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800';

/** Search by train or TAG, and narrow by area, kind, machine type and status. */
export function TrainFilters({
  text,
  onText,
  params,
  onParam,
  onClear,
}: {
  text: string;
  onText: (value: string) => void;
  params: URLSearchParams;
  onParam: (key: string, value: string) => void;
  onClear: () => void;
}) {
  const { t } = useTranslation(['assets', 'common']);
  const areas = useAreasQuery();
  const kinds = useGroupKindsQuery();
  const statuses = useConditionStatusesQuery();

  const select = (key: string, label: string, options: { value: string; label: string }[]) => (
    <select
      value={params.get(key) ?? ''}
      aria-label={label}
      onChange={(event) => onParam(key, event.target.value)}
      className={CONTROL}
    >
      <option value="">{label}</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        type="search"
        value={text}
        placeholder={t('trains.search')}
        aria-label={t('trains.search')}
        onChange={(event) => onText(event.target.value)}
        className={`w-64 ${CONTROL}`}
      />
      {select(
        'area',
        t('filter.allAreas'),
        (areas.data?.results ?? []).map((area) => ({ value: String(area.id), label: `${area.code} - ${area.name}` })),
      )}
      {select(
        'kind',
        t('trains.allKinds'),
        (kinds.data ?? []).map((kind) => ({ value: kind.code, label: kind.name })),
      )}
      {select(
        'type',
        t('filter.allTypes'),
        EQUIPMENT_TYPES.map((type) => ({ value: type, label: t(`type.${type}`) })),
      )}
      {select(
        'status',
        t('filter.allStatuses'),
        (statuses.data ?? []).map((status) => ({ value: status.code, label: status.name })),
      )}
      {[...params.keys()].length > 0 && (
        <Button variant="ghost" onClick={onClear}>
          {t('trains.clear')}
        </Button>
      )}
    </div>
  );
}
