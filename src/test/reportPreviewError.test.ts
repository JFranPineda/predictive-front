import { describe, expect, it } from 'vitest';

import { previewError } from '@modules/reports/domain/previewError';

describe('why a report preview failed', () => {
  it('says the licence reason when the subscription lapsed (402, problem+json)', () => {
    const body = JSON.stringify({ type: 'license_report_blocked', title: 'La licencia fue revocada: …', status: 402 });
    expect(previewError(body)).toBe('La licencia fue revocada: …');
  });

  it('still reads a DRF detail', () => {
    expect(previewError(JSON.stringify({ detail: 'Falta el parámetro' }))).toBe('Falta el parámetro');
  });

  it('a body that is not JSON is a plain failure', () => {
    expect(previewError('<html>500</html>')).toBe('failed');
  });
});
