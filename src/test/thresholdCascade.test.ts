import { describe, expect, it } from 'vitest';

import { effectiveSet, overrideSummary, sortByPrecedence } from '@modules/thresholds/domain/cascade';
import type { ThresholdSet } from '@modules/thresholds/domain/types';

const status = (code: string, color: string) => ({
  id: 1, code, name: code, kind: 'condition' as const, severity: 10, color,
  measurable: true, requires_action: false, is_terminal: false,
});

const set = (id: number, scope: ThresholdSet['scope'], low: string, high: string, extra = {}): ThresholdSet => ({
  id,
  scope,
  scope_ref_id: null,
  scope_label: scope,
  magnitude_code: 'vel_rms',
  unit_code: 'mm/s',
  aggregation: 'rms',
  machine_class: '',
  standard: scope === 'equipment_type' ? { code: 'iso_10816_3', name: 'ISO 10816-3' } : null,
  bands: [
    { status: status('normal', '#16a34a'), min_value: null, max_value: low },
    { status: status('alarm', '#f59e0b'), min_value: low, max_value: high },
    { status: status('shutdown', '#dc2626'), min_value: high, max_value: null },
  ],
  valid_from: '2024-01-01',
  valid_to: null,
  version: 1,
  rationale: '',
  author_name: null,
  ...extra,
});

const iso = set(1, 'equipment_type', '4.5', '7.1');
const eb228 = set(2, 'equipment', '4.5', '6.5', { rationale: 'historial del equipo' });

describe('cascade, mirrored from the backend resolver', () => {
  it('puts the most specific scope first', () => {
    expect(sortByPrecedence([iso, eb228])[0]!.id).toBe(eb228.id);
  });

  it('picks the equipment override over the standard', () => {
    expect(effectiveSet([iso, eb228])!.id).toBe(eb228.id);
  });

  it('falls back to the standard once the override expires', () => {
    const expired = { ...eb228, valid_to: '2025-12-31' };
    expect(effectiveSet([iso, expired], new Date('2026-06-01'))!.id).toBe(iso.id);
  });
});

describe('override explanation', () => {
  it('reports a stricter equipment limit as a key, not a sentence', () => {
    expect(overrideSummary(eb228, iso)).toEqual({
      key: 'override.stricter',
      values: { a: 6.5, b: 7.1, unit: 'mm/s', standard: 'ISO 10816-3' },
    });
  });

  it('reports a looser one the other way round', () => {
    expect(overrideSummary(iso, eb228)?.key).toBe('override.looser');
  });

  it('says nothing when the limits match', () => {
    expect(overrideSummary(iso, iso)).toBeNull();
  });
});
