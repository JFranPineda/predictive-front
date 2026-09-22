import { describe, expect, it } from 'vitest';

import { barSegments, coverageTone, flatten, readableOn } from '@modules/summaries/domain/palette';
import type { Status, SummaryNode } from '@modules/summaries/domain/types';

const status = (code: string, color: string, severity: number, kind: Status['kind'] = 'condition'): Status => ({
  code, name: code, kind, severity, color, measurable: kind === 'condition', requires_action: false,
});

const OPERATIONAL = status('operational', '#16a34a', 10);
const ALARM = status('alarm', '#f59e0b', 20);
const OFF = status('off', '#94a3b8', 0, 'availability');

const node = (over: Partial<SummaryNode> = {}): SummaryNode => ({
  key: 'area:101',
  label: '101 - ETA',
  level: 'area',
  total: 10,
  evaluated: 10,
  coverage: 1,
  worst: OPERATIONAL,
  counts: [],
  children: [],
  driver: null,
  ...over,
});

describe('status bar', () => {
  it('turns counts into proportional segments', () => {
    const segments = barSegments(
      [{ status: ALARM, count: 2 }, { status: OPERATIONAL, count: 6 }, { status: OFF, count: 2 }],
      10,
    );
    expect(segments.map((s) => s.percent)).toEqual([20, 60, 20]);
    expect(segments[0]!.color).toBe('#f59e0b');
  });

  it('renders nothing for an empty area instead of dividing by zero', () => {
    expect(barSegments([{ status: OFF, count: 0 }], 0)).toEqual([]);
  });

  it('labels each segment with its count', () => {
    const [segment] = barSegments([{ status: ALARM, count: 3 }], 3);
    expect(segment!.label).toBe('alarm: 3');
  });
});

describe('legibility of the traffic light chip', () => {
  it('puts dark ink on amber, where white text would fail contrast', () => {
    expect(readableOn('#f59e0b')).toBe('#0f172a');
  });

  it('puts white ink on the shutdown red', () => {
    expect(readableOn('#dc2626')).toBe('#ffffff');
  });

  it('accepts three-digit hex, which is what people type', () => {
    expect(readableOn('#fff')).toBe('#0f172a');
  });

  it('handles a colour a company invents for its own status', () => {
    expect(readableOn('#000000')).toBe('#ffffff');
  });
});

describe('coverage warns about areas nobody measured', () => {
  it('flags a green area that was half measured', () => {
    // The exact trap of the source RGP: healthy colour, missing rounds.
    expect(coverageTone(node({ coverage: 0.5 }))).toBe('bad');
    expect(coverageTone(node({ coverage: 0.75 }))).toBe('warn');
    expect(coverageTone(node({ coverage: 0.95 }))).toBe('ok');
  });
});

describe('tree flattening', () => {
  it('keeps the depth of every level for indentation', () => {
    const tree = [
      node({
        key: 'area:101',
        children: [node({ key: 'sector:1', level: 'sector', children: [node({ key: 'group:1', level: 'asset_group' })] })],
      }),
    ];
    expect(flatten(tree).map((entry) => [entry.node.level, entry.depth])).toEqual([
      ['area', 0],
      ['sector', 1],
      ['asset_group', 2],
    ]);
  });
});
