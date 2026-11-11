/**
 * The last time the user did something, shared by every tab of the app.
 *
 * Kept in localStorage so a tab left open in the background does not end the
 * session of the tab the technician is typing in.
 */
const KEY = 'session.lastActivity';
// Moving the mouse over a chart and scrolling a long table count: someone
// reading the plant's trends for half an hour is working, and with only
// clicks and keys they were signed out while doing it.
const EVENTS = ['keydown', 'pointerdown', 'pointermove', 'mousemove', 'wheel', 'touchstart', 'scroll'] as const;
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
  // Capture, so a scroll inside a table (which does not bubble) is heard too.
  const options = { passive: true, capture: true };
  EVENTS.forEach((name) => window.addEventListener(name, onInput, options));
  return () => EVENTS.forEach((name) => window.removeEventListener(name, onInput, options));
}
