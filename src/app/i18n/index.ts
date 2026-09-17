import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';

import {
  DEFAULT_LANGUAGE,
  type Language,
  LOCALES,
  readStoredLanguage,
  resolveLanguage,
  storeLanguage,
  SUPPORTED_LANGUAGES,
} from './config';
import enCommon from './locales/en/common.json';
import esCommon from './locales/es/common.json';

export type TranslationBundle = Record<Language, Record<string, unknown>>;

export const i18n = i18next.createInstance();

void i18n.use(initReactI18next).init({
  lng: resolveLanguage({ stored: readStoredLanguage(), browser: navigator.languages }),
  fallbackLng: DEFAULT_LANGUAGE,
  supportedLngs: [...SUPPORTED_LANGUAGES],
  defaultNS: 'common',
  ns: ['common'],
  resources: {
    es: { common: esCommon },
    en: { common: enCommon },
  },
  interpolation: { escapeValue: false },
  returnNull: false,
});

/**
 * A module ships its own strings and they arrive with its chunk — an
 * uninstalled module never downloads translations nobody will read.
 */
export function registerTranslations(namespace: string, bundle: TranslationBundle): void {
  for (const language of SUPPORTED_LANGUAGES) {
    i18n.addResourceBundle(language, namespace, bundle[language], true, false);
  }
}

export async function changeLanguage(language: Language): Promise<void> {
  await i18n.changeLanguage(language);
  storeLanguage(language);
  document.documentElement.lang = language;
}

export function currentLanguage(): Language {
  return (i18n.resolvedLanguage as Language | undefined) ?? DEFAULT_LANGUAGE;
}

export function currentLocale(): string {
  return LOCALES[currentLanguage()];
}
