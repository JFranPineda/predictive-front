/**
 * Two languages, one resolution chain, and no silent English leaking into a
 * Spanish screen.
 *
 * The UI chrome is translated from JSON files shipped per module; catalogue
 * text (status names, techniques, standards) is translated server-side and
 * arrives already resolved, because a company adds its own from the UI and no
 * JSON file can know about it.
 */
export const SUPPORTED_LANGUAGES = ['es', 'en'] as const;
export type Language = (typeof SUPPORTED_LANGUAGES)[number];

export const DEFAULT_LANGUAGE: Language = 'es';

export const LANGUAGE_NAMES: Record<Language, string> = {
  es: 'Español',
  en: 'English',
};

/**
 * What `Intl` is asked for. The region matters for dates and for thousands
 * separators; note that `es-PE` uses dot decimals, unlike `es-ES`.
 */
export const LOCALES: Record<Language, string> = {
  es: 'es-PE',
  en: 'en-US',
};

const STORAGE_KEY = 'language';

export function isLanguage(value: unknown): value is Language {
  return typeof value === 'string' && (SUPPORTED_LANGUAGES as readonly string[]).includes(value);
}

/** `es-PE` → `es`; anything unsupported → null, never the default, so the
 * caller's own fallback chain still runs. */
export function normaliseLanguage(tag: string | null | undefined): Language | null {
  if (!tag) return null;
  const base = tag.trim().toLowerCase().replace('_', '-').split('-')[0];
  return isLanguage(base) ? base : null;
}

/** Stored choice → user preference from the server → browser → Spanish. */
export function resolveLanguage(options: {
  stored?: string | null;
  userPreference?: string | null;
  browser?: readonly string[];
}): Language {
  const candidates = [
    options.stored,
    options.userPreference,
    ...(options.browser ?? []),
  ];
  for (const candidate of candidates) {
    const resolved = normaliseLanguage(candidate);
    if (resolved) return resolved;
  }
  return DEFAULT_LANGUAGE;
}

export function readStoredLanguage(): Language | null {
  try {
    return normaliseLanguage(localStorage.getItem(STORAGE_KEY));
  } catch {
    return null;
  }
}

export function storeLanguage(language: Language): void {
  try {
    localStorage.setItem(STORAGE_KEY, language);
  } catch {
    // Private windows and locked-down browsers: the choice lives for the
    // session and the server preference still applies on the next login.
  }
}
