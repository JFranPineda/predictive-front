/**
 * Appearance: light, dark, or whatever the operating system says.
 *
 * Tailwind's default dark variant follows `prefers-color-scheme` only, which a
 * user preference cannot override. The stylesheet therefore binds `dark` to
 * `[data-theme="dark"]`, and this module is the only writer of that attribute.
 */
export const THEMES = ['system', 'light', 'dark'] as const;
export type Theme = (typeof THEMES)[number];
export type ResolvedTheme = 'light' | 'dark';

const STORAGE_KEY = 'theme';

export function isTheme(value: unknown): value is Theme {
  return typeof value === 'string' && (THEMES as readonly string[]).includes(value);
}

export function readStoredTheme(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return isTheme(stored) ? stored : 'system';
  } catch {
    return 'system';
  }
}

export function storeTheme(theme: Theme): void {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Private windows: the choice lasts for the session and nothing breaks.
  }
}

export function systemTheme(): ResolvedTheme {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function resolveTheme(theme: Theme): ResolvedTheme {
  return theme === 'system' ? systemTheme() : theme;
}

/** Applied before React renders, so the first paint is already correct. */
export function applyTheme(theme: Theme): ResolvedTheme {
  const resolved = resolveTheme(theme);
  document.documentElement.dataset.theme = resolved;
  document.documentElement.style.colorScheme = resolved;
  return resolved;
}
