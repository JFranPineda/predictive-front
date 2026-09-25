import { useCallback, useEffect, useState } from 'react';

/** Every draft key starts with this, so a sign-out can wipe them all. */
export const DRAFT_PREFIX = 'draft:';

/**
 * State that survives a reload and an idle logout.
 *
 * A technician who types thirty values and gets signed out for inactivity
 * must find them again when they sign back in; the draft is dropped once the
 * work is sent, or when the user signs out on purpose.
 */
export function useDraft<T>(key: string, initial: T): [T, (value: T) => void, () => void] {
  const storageKey = `${DRAFT_PREFIX}${key}`;
  const [value, setValue] = useState<T>(() => read(storageKey) ?? initial);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(value));
    } catch {
      // A full or blocked storage loses the draft, never the typing itself.
    }
  }, [storageKey, value]);

  const discard = useCallback(() => {
    localStorage.removeItem(storageKey);
    setValue(initial);
  }, [storageKey, initial]);

  return [value, setValue, discard];
}

function read<T>(storageKey: string): T | null {
  try {
    const raw = localStorage.getItem(storageKey);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}
