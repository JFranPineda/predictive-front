import { useTranslation } from 'react-i18next';

import type { FilterOption } from '@shared/hooks/useTableFilter';

import { Button } from './Button';

/** The search box and the filters, identical on every table in the product. */
export function TableToolbar({
  query,
  onQuery,
  placeholder,
  filters,
  active,
  onFilter,
  onClear,
  activeCount,
  total,
  shown,
}: {
  query: string;
  onQuery: (value: string) => void;
  placeholder: string;
  filters?: { key: string; label: string; options: FilterOption[] }[];
  active?: Record<string, string>;
  onFilter?: (key: string, value: string) => void;
  onClear?: () => void;
  activeCount?: number;
  total: number;
  shown: number;
}) {
  const { t } = useTranslation('common');

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        value={query}
        onChange={(event) => onQuery(event.target.value)}
        placeholder={placeholder}
        className="w-56 rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800"
      />

      {filters?.map((filter) => (
        <select
          key={filter.key}
          value={active?.[filter.key] ?? ''}
          onChange={(event) => onFilter?.(filter.key, event.target.value)}
          className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800"
        >
          <option value="">{filter.label}</option>
          {filter.options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
              {option.count !== undefined ? ` (${option.count})` : ''}
            </option>
          ))}
        </select>
      ))}

      {/* The count is the feedback that a filter did something; without it a
          narrowed table looks like a table that lost rows. */}
      <span className="text-xs text-slate-500">
        {shown === total ? t('table.all', { count: total }) : t('table.shown', { shown, total })}
      </span>

      {(activeCount ?? 0) > 0 && onClear && (
        <Button variant="ghost" onClick={onClear}>
          {t('table.clear')}
        </Button>
      )}
    </div>
  );
}
