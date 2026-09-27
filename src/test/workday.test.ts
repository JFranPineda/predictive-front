import { describe, expect, it } from 'vitest';

import { apiError, blankStep, itemNumbers, minutesBetween, todayIso } from '@modules/workday/domain/types';

describe('workday', () => {
  it('writes today as the API does, in the local calendar', () => {
    expect(todayIso(new Date(2026, 8, 6, 23, 50))).toBe('2026-09-06');
  });

  it('measures a work in whole minutes, and nothing without an end', () => {
    expect(minutesBetween('2026-09-26T13:15:00Z', '2026-09-26T16:40:00Z')).toBe(205);
    expect(minutesBetween('2026-09-26T13:15:00Z', null)).toBeNull();
  });

  it("reads the day guard's refusal, not its type", () => {
    // 423 and 428 come as {detail, type, status}: the first value is the
    // message only by luck, so `detail` is read by name.
    const locked = { data: { type: 'workday_closed', detail: 'La jornada del 26/09/2026 está cerrada' } };
    expect(apiError(locked)).toBe('La jornada del 26/09/2026 está cerrada');
    expect(apiError({ data: ['Sube el ATS firmado'] })).toBe('Sube el ATS firmado');
    expect(apiError({ data: { number: ['Obligatorio'] } })).toBe('Obligatorio');
    expect(apiError({})).toBeNull();
  });

  it('numbers an ATS step once, however many hazards it lists (Q17)', () => {
    const rows = ['Verificar', 'Mover tubería', ' mover tubería', 'Empalme'].map((text) => blankStep(text));
    expect(itemNumbers(rows)).toEqual([1, 2, 2, 3]);
    expect(blankStep('Paso').step).toBe('Paso');
  });
});
