import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { baseApi } from '@app/api/baseApi';
import { useAppDispatch } from '@app/hooks';
import { useCodeLoginMutation, useLoginMutation } from '@app/session/sessionApi';
import { tokensReceived } from '@app/session/sessionSlice';

type Mode = 'corporate' | 'code';

const INPUT =
  'w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800';

/**
 * Two doors, as the access matrix asks: management with its corporate
 * credential, field staff with a personal code.
 *
 * The code door exists because three shifts share one tablet in the plant.
 * Typing an e-mail and a long password with gloves on is how a crew ends up
 * sharing a login — and then nobody knows who recorded what.
 */
export function LoginPage() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const [login, corporate] = useLoginMutation();
  const [codeLogin, byCode] = useCodeLoginMutation();
  const [mode, setMode] = useState<Mode>('corporate');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');

  const busy = corporate.isLoading || byCode.isLoading;
  const failed = mode === 'corporate' ? corporate.error : byCode.error;
  // 429 is the throttle, not a wrong code: saying "wrong code" there would
  // send the technician to retype a code that was right.
  const throttled = (byCode.error as { status?: number } | undefined)?.status === 429;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const tokens = await (
      mode === 'corporate'
        ? login({ email, password }).unwrap()
        : codeLogin({ code: code.trim().toUpperCase() }).unwrap()
    ).catch(() => null);
    if (!tokens) return;
    dispatch(tokensReceived(tokens));
    // Everything cached was fetched as somebody else (or as nobody). Dropping
    // it forces every subscribed query to refetch with the new token.
    dispatch(baseApi.util.resetApiState());
  }

  return (
    <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
      <form
        onSubmit={(event) => void submit(event)}
        className="w-88 space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
      >
        <h1 className="text-lg font-semibold">{t('app.name')}</h1>

        <div role="tablist" className="grid grid-cols-2 rounded-lg bg-slate-100 p-1 text-sm dark:bg-slate-800">
          {(['corporate', 'code'] as const).map((option) => (
            <button
              key={option}
              type="button"
              role="tab"
              aria-selected={mode === option}
              onClick={() => setMode(option)}
              className={`rounded-md px-2 py-1.5 font-medium ${
                mode === option
                  ? 'bg-white shadow-sm dark:bg-slate-900'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              {t(`auth.mode.${option}`)}
            </button>
          ))}
        </div>

        {mode === 'corporate' ? (
          <>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder={t('auth.email')}
              autoComplete="username"
              className={INPUT}
            />
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder={t('auth.password')}
              autoComplete="current-password"
              className={INPUT}
            />
          </>
        ) : (
          <>
            <input
              value={code}
              onChange={(event) => setCode(event.target.value.toUpperCase())}
              placeholder="XXXXXXXX"
              maxLength={8}
              autoComplete="one-time-code"
              autoCapitalize="characters"
              spellCheck={false}
              className={`${INPUT} text-center font-mono text-xl tracking-[0.35em]`}
            />
            <p className="text-xs text-slate-500">{t('auth.codeHint')}</p>
          </>
        )}

        {failed && (
          <p className="text-sm text-red-600">
            {throttled ? t('auth.throttled') : t(mode === 'code' ? 'auth.codeFailed' : 'auth.failed')}
          </p>
        )}
        <button
          type="submit"
          disabled={busy || (mode === 'code' && code.trim().length !== 8)}
          className="w-full rounded-md bg-slate-900 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900"
        >
          {t('auth.signIn')}
        </button>
      </form>
    </div>
  );
}
