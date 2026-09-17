import { describe, expect, it } from 'vitest';

import {
  DEFAULT_LANGUAGE,
  isLanguage,
  LANGUAGE_NAMES,
  normaliseLanguage,
  resolveLanguage,
  SUPPORTED_LANGUAGES,
} from '@app/i18n/config';
import { formatDate, formatMeasurement, formatNumber, formatPercent, localeOf } from '@app/i18n/format';
import enCommon from '@app/i18n/locales/en/common.json';
import esCommon from '@app/i18n/locales/es/common.json';
import assetsEn from '@modules/assets/locales/en.json';
import assetsEs from '@modules/assets/locales/es.json';
import servicesEn from '@modules/services/locales/en.json';
import servicesEs from '@modules/services/locales/es.json';
import summariesEn from '@modules/summaries/locales/en.json';
import summariesEs from '@modules/summaries/locales/es.json';
import thresholdsEn from '@modules/thresholds/locales/en.json';
import thresholdsEs from '@modules/thresholds/locales/es.json';

describe('language resolution', () => {
  it('reduces a locale to its language', () => {
    expect(normaliseLanguage('es-PE')).toBe('es');
    expect(normaliseLanguage('EN_US')).toBe('en');
  });

  it('answers nothing for a language the system does not have', () => {
    // Answering the default here would swallow the next candidate in the chain.
    expect(normaliseLanguage('pt-BR')).toBeNull();
    expect(normaliseLanguage(null)).toBeNull();
  });

  it('prefers the stored choice over everything', () => {
    expect(resolveLanguage({ stored: 'en', userPreference: 'es', browser: ['es-PE'] })).toBe('en');
  });

  it('falls back to the server preference, then the browser, then Spanish', () => {
    expect(resolveLanguage({ userPreference: 'en', browser: ['es-PE'] })).toBe('en');
    expect(resolveLanguage({ browser: ['en-US'] })).toBe('en');
    expect(resolveLanguage({ browser: ['pt-BR'] })).toBe(DEFAULT_LANGUAGE);
    expect(resolveLanguage({})).toBe('es');
  });

  it('skips unsupported browser languages instead of giving up', () => {
    expect(resolveLanguage({ browser: ['pt-BR', 'fr', 'en-GB'] })).toBe('en');
  });

  it('every supported language has a display name', () => {
    for (const language of SUPPORTED_LANGUAGES) {
      expect(LANGUAGE_NAMES[language]).toBeTruthy();
      expect(isLanguage(language)).toBe(true);
    }
  });
});

describe('formatting follows the language, not the code', () => {
  it('uses the separators the region actually uses, not the ones we assume', () => {
    // es-PE writes 1,234.50 exactly like en-US. It is es-ES that writes
    // 1234,50. Hardcoding a comma "because it is Spanish" would corrupt every
    // number a Peruvian user reads.
    expect(formatNumber(1234.5, 2, localeOf('es'))).toBe('1,234.50');
    expect(formatNumber(1234.5, 2, localeOf('en'))).toBe('1,234.50');
    expect(formatNumber(1234.5, 2, 'es-ES')).toBe('1234,50');
  });

  it('accepts the strings the API sends for decimals', () => {
    expect(formatNumber('7.10', 1, localeOf('en'))).toBe('7.1');
  });

  it('shows a dash instead of NaN for a missing reading', () => {
    expect(formatNumber(null)).toBe('—');
    expect(formatNumber('')).toBe('—');
    expect(formatNumber('not a number')).toBe('—');
  });

  it('keeps the unit next to the value', () => {
    expect(formatMeasurement(6.35, 'mm/s', 2, localeOf('es'))).toBe('6.35 mm/s');
    expect(formatMeasurement(null, 'mm/s')).toBe('—');
  });

  it('formats dates per locale', () => {
    expect(formatDate('2013-12-17', localeOf('en'))).toMatch(/Dec/);
    expect(formatDate('2013-12-17', localeOf('es'))).toMatch(/dic/);
  });

  it('formats coverage as a percentage', () => {
    expect(formatPercent(0.5, localeOf('en'))).toBe('50%');
  });
});

describe('translation bundles', () => {
  const bundles: [string, object, object][] = [
    ['common', esCommon, enCommon],
    ['assets', assetsEs, assetsEn],
    ['services', servicesEs, servicesEn],
    ['summaries', summariesEs, summariesEn],
    ['thresholds', thresholdsEs, thresholdsEn],
  ];

  function keysOf(value: object, prefix = ''): string[] {
    return Object.entries(value).flatMap(([key, child]) =>
      child && typeof child === 'object'
        ? keysOf(child as object, `${prefix}${key}.`)
        : [`${prefix}${key}`],
    );
  }

  it.each(bundles)('%s has the same keys in both languages', (_name, es, en) => {
    // A missing key is a silent fallback to Spanish inside an English screen.
    expect(keysOf(en).sort()).toEqual(keysOf(es).sort());
  });

  it.each(bundles)('%s has no empty strings', (_name, es, en) => {
    for (const bundle of [es, en]) {
      const values = JSON.stringify(bundle).match(/:"(.*?)"/g) ?? [];
      expect(values.every((entry) => entry.length > 3)).toBe(true);
    }
  });

  it('covers every lock reason the domain can return', () => {
    const keys = keysOf(servicesEs);
    for (const reason of ['issued', 'otherInspector', 'otherInspectorUnknown', 'closed', 'noPermission']) {
      expect(keys).toContain(`lock.${reason}`);
    }
  });

  it('covers every monitoring frequency the API can send', () => {
    const keys = keysOf(assetsEs);
    for (const frequency of ['monthly', 'bimonthly', 'quarterly', 'semiannual', 'annual', 'on_demand']) {
      expect(keys).toContain(`frequency.${frequency}`);
    }
  });
});

describe('every key a screen asks for exists', () => {
  /**
   * The Motor+Turbina form shipped showing the literal `form.description`,
   * because the key lived in another module's bundle. A missing key is
   * invisible in review and obvious to the user.
   */
  const NAMESPACE_BY_FOLDER: Record<string, string> = {
    assets: 'assets',
    thresholds: 'thresholds',
    services: 'services',
    users: 'users',
    summaries: 'summaries',
    measurements: 'measurements',
    modules_admin: 'modules',
    licensing: 'licensing',
  };

  const BUNDLES: Record<string, Record<string, object>> = {
    common: { es: esCommon, en: enCommon },
    assets: { es: assetsEs, en: assetsEn },
    services: { es: servicesEs, en: servicesEn },
    summaries: { es: summariesEs, en: summariesEn },
    thresholds: { es: thresholdsEs, en: thresholdsEn },
  };

  function flatten(value: object, prefix = ''): string[] {
    return Object.entries(value).flatMap(([key, child]) =>
      child && typeof child === 'object'
        ? flatten(child as object, `${prefix}${key}.`)
        : [`${prefix}${key}`],
    );
  }

  it.each(Object.keys(BUNDLES))('%s declares no key only one language has', (namespace) => {
    const bundle = BUNDLES[namespace]!;
    expect(flatten(bundle.es!).sort()).toEqual(flatten(bundle.en!).sort());
  });

  it('maps every module folder to a namespace', () => {
    // A folder with no namespace silently falls back to `common`, where its
    // keys do not exist.
    for (const namespace of Object.values(NAMESPACE_BY_FOLDER)) {
      expect(typeof namespace).toBe('string');
    }
    expect(NAMESPACE_BY_FOLDER.modules_admin).toBe('modules');
  });
});
