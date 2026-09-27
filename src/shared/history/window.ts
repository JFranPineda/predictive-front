/**
 * The fortnight a log screen shows.
 *
 * The server cuts the range it serves; the picker cuts it too, so the dates
 * on screen are the dates that were read. Moving one end pulls the other
 * along instead of refusing the click.
 */

export const WINDOW_DAYS = 14;

export interface DateWindow {
  /** `YYYY-MM-DD`, both ends included. Empty means "the default window". */
  since: string;
  until: string;
}

/** Which end the reader moved: the other one follows it. */
export type WindowEdge = 'since' | 'until';

export function clampWindow(next: DateWindow, moved: WindowEdge, days = WINDOW_DAYS): DateWindow {
  const since = parse(next.since);
  const until = parse(next.until);
  // Picking only an end date means "the fortnight up to here": showing the
  // start it implies beats leaving the reader to work it out.
  if (!since && until) return { since: earliestStart(next.until, days), until: next.until };
  if (!since || !until) return next;

  const span = dayCount(since, until);
  if (span >= 1 && span <= days) return next;
  if (moved === 'until') return { since: iso(shift(until, -(days - 1))), until: next.until };
  return { since: next.since, until: iso(shift(since, days - 1)) };
}

/** The earliest start the picker offers for an end date. */
export function earliestStart(until: string, days = WINDOW_DAYS): string {
  const end = parse(until);
  return end ? iso(shift(end, -(days - 1))) : '';
}

function dayCount(since: Date, until: Date): number {
  return Math.round((until.getTime() - since.getTime()) / 86_400_000) + 1;
}

function parse(value: string): Date | null {
  return value ? new Date(`${value}T12:00:00`) : null;
}

function shift(day: Date, days: number): Date {
  const moved = new Date(day);
  moved.setDate(moved.getDate() + days);
  return moved;
}

function iso(day: Date): string {
  return `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
}
