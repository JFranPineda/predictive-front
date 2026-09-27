import type { ClientEvent } from './types';

/** What counts as "a button": anything a person presses on purpose. */
const PRESSABLE =
  'button, a[href], [role="button"], [role="tab"], [role="menuitem"], summary, ' +
  'input[type="checkbox"], input[type="radio"], input[type="submit"], label[for]';

/** Never report what was typed: a click on a field says which field, not its value. */
export function clickEvent(target: EventTarget | null, path: string): ClientEvent | null {
  if (!(target instanceof Element)) return null;
  const element = target.closest(PRESSABLE);
  if (!element || element.closest('[data-activity-ignore]')) return null;
  const label = labelOf(element);
  if (!label) return null;
  return { kind: 'click', label, path };
}

export function labelOf(element: Element): string {
  const explicit =
    element.getAttribute('data-activity-label') ??
    element.getAttribute('aria-label') ??
    element.getAttribute('title');
  if (explicit) return tidy(explicit);
  if (element instanceof HTMLInputElement) {
    const name = element.labels?.[0]?.textContent ?? element.name;
    const state = element.type === 'checkbox' ? (element.checked ? ' ✓' : ' ✗') : '';
    return tidy(`${name ?? element.type}${state}`);
  }
  return tidy(element.textContent ?? '');
}

function tidy(text: string): string {
  const flat = text.replace(/\s+/g, ' ').trim();
  return flat.length > 120 ? `${flat.slice(0, 119)}…` : flat;
}

/**
 * Clicks wait a moment and travel together: one request per burst, not one
 * per click. `send` gets what was queued; a failed send drops it — the log
 * must never get in the way of the work it records.
 */
export class EventQueue {
  private events: ClientEvent[] = [];

  constructor(
    private readonly send: (events: ClientEvent[]) => Promise<unknown>,
    private readonly max = 25,
  ) {}

  push(event: ClientEvent): void {
    this.events.push(event);
    if (this.events.length >= this.max) void this.flush();
  }

  get size(): number {
    return this.events.length;
  }

  async flush(): Promise<void> {
    if (this.events.length === 0) return;
    const batch = this.events;
    this.events = [];
    try {
      await this.send(batch);
    } catch {
      // Dropped on purpose; see the class comment.
    }
  }
}
