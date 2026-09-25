/**
 * The last time the user did something, shared by every tab of the app.
 *
 * Kept in localStorage so a tab left open in the background does not end the
 * session of the tab the technician is typing in.
 */
const KEY = 'session.lastActivity';
const EVENTS = ['keydown', 'pointerdown', 'wheel', 'touchstart'] as const;
const THROTTLE_MS = 5_000;

export function lastActivity(): number {
  return Number(localStorage.getItem(KEY)) || Date.now();
}

export function markActivity(now = Date.now()): void {
  localStorage.setItem(KEY, String(now));
}

/** Listens for real input; returns the cleanup. */
export function trackActivity(): () => void {
  let last = 0;
  const onInput = () => {
    const now = Date.now();
    if (now - last < THROTTLE_MS) return;
    last = now;
    markActivity(now);
  };
  EVENTS.forEach((name) => window.addEventListener(name, onInput, { passive: true }));
  return () => EVENTS.forEach((name) => window.removeEventListener(name, onInput));
}
