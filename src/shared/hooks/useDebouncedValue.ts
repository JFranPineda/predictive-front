import { useEffect, useState } from 'react';

/** The value, once it has stopped changing for `delay` ms: a search box must
 * not send a request per keystroke. */
export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setSettled(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);
  return settled;
}
