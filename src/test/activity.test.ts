import { describe, expect, it, vi } from 'vitest';

import { KIND_ORDER, queryString, relativeTime } from '@modules/activity/domain/presentation';
import { clickEvent, EventQueue } from '@modules/activity/domain/tracking';

describe('activity log (Q20)', () => {
  it('names a click by what the button says, flattened', () => {
    document.body.innerHTML = '<button><span>Guardar</span>\n   cambios</button>';
    const inner = document.querySelector('span')!;
    expect(clickEvent(inner, '/alignment')).toEqual({ kind: 'click', label: 'Guardar cambios', path: '/alignment' });
  });

  it('prefers the aria-label, and ignores clicks on plain text', () => {
    document.body.innerHTML = '<button aria-label="Cerrar">✕</button><p>texto</p>';
    expect(clickEvent(document.querySelector('button'), '/')?.label).toBe('Cerrar');
    expect(clickEvent(document.querySelector('p'), '/')).toBeNull();
  });

  it('never reports what was typed, only which checkbox changed', () => {
    document.body.innerHTML = '<label for="c">Visible</label><input id="c" type="checkbox" checked />';
    expect(clickEvent(document.querySelector('input'), '/')?.label).toBe('Visible ✓');
    document.body.innerHTML = '<input type="text" value="secreto" />';
    expect(clickEvent(document.querySelector('input'), '/')).toBeNull();
  });

  it('sends clicks in batches and forgets a failed batch', async () => {
    const send = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue(undefined);
    const queue = new EventQueue(send, 2);
    queue.push({ kind: 'click', label: 'A', path: '/' });
    expect(send).not.toHaveBeenCalled();
    queue.push({ kind: 'click', label: 'B', path: '/' });
    await Promise.resolve();
    expect(send).toHaveBeenCalledTimes(1);
    expect(queue.size).toBe(0);
    await queue.flush();
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('keeps the filters in the export link', () => {
    expect(queryString({ user: 3, kind: 'create,delete', q: '' })).toBe('?user=3&kind=create%2Cdelete');
    expect(queryString({})).toBe('');
  });

  it('reads times as how long ago', () => {
    const now = Date.parse('2026-09-26T12:00:00Z');
    expect(relativeTime('2026-09-26T11:57:00Z', now, 'es-PE')).toBe('hace 3 minutos');
    expect(KIND_ORDER).toContain('upload');
  });
});
