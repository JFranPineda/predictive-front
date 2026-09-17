import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useTableFilter, type FilterSpec } from '@shared/hooks/useTableFilter';

interface Row {
  tag: string;
  area: string;
  status: string | null;
}

const ROWS: Row[] = [
  { tag: 'MB101001A', area: '101', status: 'alarm' },
  { tag: 'B101001A', area: '101', status: 'operational' },
  { tag: 'MC121001', area: '121', status: null },
];

const SPECS: FilterSpec<Row>[] = [
  { key: 'area', label: 'Área', valueOf: (row) => row.area },
  { key: 'status', label: 'Estado', valueOf: (row) => row.status },
];

function setup() {
  return renderHook(() => useTableFilter(ROWS, (row) => `${row.tag} ${row.area}`, SPECS));
}

describe('table search and filters', () => {
  it('starts showing everything', () => {
    const { result } = setup();
    expect(result.current.filtered).toHaveLength(3);
    expect(result.current.activeCount).toBe(0);
  });

  it('searches case-insensitively across the row', () => {
    const { result } = setup();
    act(() => result.current.setQuery('mb101'));
    expect(result.current.filtered.map((row) => row.tag)).toEqual(['MB101001A']);
    expect(result.current.activeCount).toBe(1);
  });

  it('combines search with a filter', () => {
    const { result } = setup();
    act(() => result.current.setQuery('101'));
    act(() => result.current.setFilter('area', '121'));
    expect(result.current.filtered).toHaveLength(0);
    expect(result.current.activeCount).toBe(2);
  });

  it('a row with no value for a filter is excluded when that filter is set', () => {
    // MC121001 has no status; filtering by status must not silently keep it.
    const { result } = setup();
    act(() => result.current.setFilter('status', 'alarm'));
    expect(result.current.filtered.map((row) => row.tag)).toEqual(['MB101001A']);
  });

  it('offers each filter its real values, with how many rows carry them', () => {
    const { result } = setup();
    expect(result.current.options.area).toEqual([
      { value: '101', label: '101', count: 2 },
      { value: '121', label: '121', count: 1 },
    ]);
  });

  it('never offers a value no row has', () => {
    const { result } = setup();
    // A filter listing options that match nothing is a filter that wastes a
    // click and makes the table look broken.
    expect(result.current.options.status?.map((option) => option.value)).toEqual([
      'alarm',
      'operational',
    ]);
  });

  it('clearing restores everything', () => {
    const { result } = setup();
    act(() => result.current.setQuery('mb'));
    act(() => result.current.setFilter('area', '101'));
    act(() => result.current.clear());
    expect(result.current.filtered).toHaveLength(3);
    expect(result.current.activeCount).toBe(0);
  });
});
