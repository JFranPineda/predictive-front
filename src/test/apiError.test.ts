import { describe, expect, it } from 'vitest';

import { readError } from '@shared/lib/apiError';

describe('readError', () => {
  it('reads the detail the API sends', () => {
    expect(readError({ data: { detail: 'La jornada está cerrada' } })).toBe('La jornada está cerrada');
  });

  it('never shows a server debug page as a message', () => {
    const page = `OperationalError at /api/v1/workdays/1/jobs/ database is locked ${'Traceback '.repeat(80)}`;
    expect(readError({ data: page })).toBeNull();
    expect(readError({ data: '<!doctype html><html>…</html>' })).toBeNull();
  });
});
