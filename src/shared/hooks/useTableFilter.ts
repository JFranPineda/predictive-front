import { useMemo, useState } from 'react';

export interface FilterOption {
  value: string;
  label: string;
  count?: number;
}

export interface FilterSpec<T> {
  key: string;
  label: string;
  /** The value this row has for this filter; null means "not applicable". */
  valueOf: (row: T) => string | null;
  /** How to label a value. Defaults to the value itself. */
  labelOf?: (value: string) => string;
}

/**
 * Search and filters over a table the client already has.
 *
 * Filtering in the browser is the right call while a page holds a hundred
 * rows: it answers instantly and costs the server nothing. The moment a table
 * pages through thousands, the same `query` and `active` state moves into the
 * request — the component contract does not change.
 */
export function useTableFilter<T>(
  rows: T[],
  searchable: (row: T) => string,
  specs: FilterSpec<T>[] = [],
) {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState<Record<string, string>>({});

  const options = useMemo(() => {
    const result: Record<string, FilterOption[]> = {};
    for (const spec of specs) {
      const counts = new Map<string, number>();
      for (const row of rows) {
        const value = spec.valueOf(row);
        if (value === null || value === '') continue;
        counts.set(value, (counts.get(value) ?? 0) + 1);
      }
      result[spec.key] = [...counts.entries()]
        .map(([value, count]) => ({
          value,
          label: spec.labelOf?.(value) ?? value,
          count,
        }))
        .sort((a, b) => a.label.localeCompare(b.label));
    }
    return result;
  }, [rows, specs]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (needle && !searchable(row).toLowerCase().includes(needle)) return false;
      return specs.every((spec) => {
        const wanted = active[spec.key];
        return !wanted || spec.valueOf(row) === wanted;
      });
    });
  }, [rows, query, active, specs, searchable]);

  const activeCount = Object.values(active).filter(Boolean).length + (query.trim() ? 1 : 0);

  return {
    query,
    setQuery,
    active,
    setFilter: (key: string, value: string) => setActive({ ...active, [key]: value }),
    clear: () => {
      setQuery('');
      setActive({});
    },
    options,
    filtered,
    activeCount,
  };
}
