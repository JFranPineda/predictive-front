import { describe, expect, it } from 'vitest';

import en from '@modules/licensing/locales/en.json';
import es from '@modules/licensing/locales/es.json';

function keys(value: unknown, prefix = ''): string[] {
  if (!value || typeof value !== 'object') return [prefix];
  return Object.entries(value).flatMap(([key, inner]) => keys(inner, prefix ? `${prefix}.${key}` : key));
}

describe('licence renewal texts', () => {
  it('has the renewal block in both languages', () => {
    for (const key of ['title', 'validUntil', 'request', 'copy', 'upload', 'renewed', 'already']) {
      expect(keys(es), `es: renewal.${key}`).toContain(`renewal.${key}`);
    }
  });

  it('says the same things in Spanish and English', () => {
    // A key in only one language falls back to its raw name on the screen.
    expect(keys(en).sort()).toEqual(keys(es).sort());
  });
});
