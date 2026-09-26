import { describe, expect, it } from 'vitest';

import { tierProblem, tierRange } from '@modules/alignment/domain/scale';
import { bandRange, magnitudesForNorma } from '@modules/thresholds/domain/scale';

describe("a norma's scale (Q9)", () => {
  it('reads each band as the cascade applies it', () => {
    expect(bandRange(null, '82', '°C')).toBe('< 82 °C');
    expect(bandRange('121', '148', '°C')).toBe('121 – 148 °C');
    expect(bandRange('148', null, '°C')).toBe('≥ 148 °C');
  });

  it('offers only the magnitudes of the services the norma judges', () => {
    const magnitudes = [
      { code: 'ir_tmax', technique_code: 'thermography' },
      { code: 'vel_rms', technique_code: 'vibration' },
    ];
    expect(magnitudesForNorma(magnitudes, [{ code: 'thermography' }]).map((m) => m.code)).toEqual(['ir_tmax']);
    // A norma naming no service is a company's own criterion: any magnitude.
    expect(magnitudesForNorma(magnitudes, [])).toHaveLength(2);
  });
});

describe("alignment's RPM scale (Q10)", () => {
  const tier = (ceiling: number | null, parallel = '0.05', angular = '0.05') => ({
    rpm_ceiling: ceiling,
    parallel_mm: parallel,
    angular_mm_per_100mm: angular,
  });

  it('reads each tier from the one above it', () => {
    expect(tierRange(null, 1000)).toBe('< 1000 rpm');
    expect(tierRange(1000, 2000)).toBe('1000 – 2000 rpm');
    expect(tierRange(4000, null)).toBe('≥ 4000 rpm');
  });

  it('refuses a scale the server would refuse, before sending it', () => {
    expect(tierProblem([])).toBe('scale.needsTier');
    expect(tierProblem([tier(null), tier(1000)])).toBe('scale.onlyLastOpen');
    expect(tierProblem([tier(2000), tier(1000)])).toBe('scale.climbing');
    expect(tierProblem([tier(1000, '0')])).toBe('scale.positive');
    expect(tierProblem([tier(1000, '0.10'), tier(2000, '0.07'), tier(null, '0.03')])).toBeNull();
  });
});
