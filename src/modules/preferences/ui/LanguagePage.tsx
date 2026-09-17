import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { changeLanguage, currentLanguage } from '@app/i18n';
import { LANGUAGE_NAMES, type Language, SUPPORTED_LANGUAGES } from '@app/i18n/config';
import { THEMES, type Theme } from '@app/theme/theme';
import { useTheme } from '@app/theme/useTheme';
import { Card } from '@shared/ui/Card';
import { Page } from '@shared/ui/Page';
import { PageHeader } from '@shared/ui/PageHeader';

import { useUpdateLanguageMutation } from '../infrastructure/endpoints';

const THEME_ICON: Record<Theme, string> = { system: '🖥', light: '☀', dark: '☾' };

export default function LanguagePage() {
  const { t } = useTranslation();
  const [updateLanguage, { isLoading }] = useUpdateLanguageMutation();
  const [selected, setSelected] = useState<Language>(currentLanguage());
  const [saved, setSaved] = useState(false);
  const { theme, setTheme } = useTheme();

  async function pick(language: Language) {
    setSelected(language);
    // Switch the UI first: the user sees the change immediately, and the
    // server preference is what makes it survive the next login.
    await changeLanguage(language);
    await updateLanguage(language).unwrap().catch(() => undefined);
    setSaved(true);
  }

  return (
    <Page>
      <PageHeader title={t('preferences.title')} description={t('preferences.description')} />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title={t('language.title')} description={t('language.description')}>
          <div className="space-y-2">
            {SUPPORTED_LANGUAGES.map((language) => (
              <Option
                key={language}
                active={selected === language}
                disabled={isLoading}
                onClick={() => void pick(language)}
                label={LANGUAGE_NAMES[language]}
                badge={language}
              />
            ))}
          </div>
          {saved && <p className="mt-3 text-sm text-emerald-600">{t('language.saved')}</p>}
        </Card>

        <Card title={t('theme.title')} description={t('theme.description')}>
          <div className="space-y-2">
            {THEMES.map((option) => (
              <Option
                key={option}
                active={theme === option}
                onClick={() => setTheme(option)}
                label={`${THEME_ICON[option]}  ${t(`theme.${option}`)}`}
              />
            ))}
          </div>
        </Card>
      </div>
    </Page>
  );
}

function Option({
  active,
  disabled,
  onClick,
  label,
  badge,
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  label: string;
  badge?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={[
        'flex w-full items-center justify-between rounded-lg border px-4 py-3 text-left text-sm transition-colors',
        active
          ? 'border-slate-900 bg-slate-50 font-medium dark:border-slate-100 dark:bg-slate-800'
          : 'border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50',
      ].join(' ')}
    >
      <span>{label}</span>
      {badge && <span className="font-mono text-xs uppercase text-slate-400">{badge}</span>}
    </button>
  );
}
