import { useTranslation } from 'react-i18next';

import { THEMES, type Theme } from '@app/theme/theme';
import { useTheme } from '@app/theme/useTheme';

const ICON: Record<Theme, string> = { system: '🖥', light: '☀', dark: '☾' };

export function ThemeToggle() {
  const { t } = useTranslation();
  const { theme, setTheme } = useTheme();

  return (
    <div
      role="group"
      aria-label={t('theme.title')}
      className="flex rounded-lg border border-slate-200 p-0.5 dark:border-slate-700"
    >
      {THEMES.map((option) => (
        <button
          key={option}
          onClick={() => setTheme(option)}
          aria-pressed={theme === option}
          title={t(`theme.${option}`)}
          className={[
            'flex-1 rounded-md px-2 py-1 text-xs transition-colors',
            theme === option
              ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
              : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800',
          ].join(' ')}
        >
          <span aria-hidden>{ICON[option]}</span>
          <span className="sr-only">{t(`theme.${option}`)}</span>
        </button>
      ))}
    </div>
  );
}
