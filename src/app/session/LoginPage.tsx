import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { baseApi } from '@app/api/baseApi';
import { useAppDispatch } from '@app/hooks';
import { useLoginMutation } from '@app/session/sessionApi';
import { tokensReceived } from '@app/session/sessionSlice';

export function LoginPage() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const [login, { isLoading, error }] = useLoginMutation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const tokens = await login({ email, password }).unwrap().catch(() => null);
    if (!tokens) return;
    dispatch(tokensReceived(tokens));
    // Everything cached was fetched as somebody else (or as nobody). Dropping
    // it forces every subscribed query to refetch with the new token.
    dispatch(baseApi.util.resetApiState());
  }

  return (
    <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
      <form
        onSubmit={submit}
        className="w-80 space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
      >
        <h1 className="text-lg font-semibold">{t('app.name')}</h1>
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder={t('auth.email')}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
        />
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder={t('auth.password')}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
        />
        {error && <p className="text-sm text-red-600">{t('auth.failed')}</p>}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full rounded-md bg-slate-900 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900"
        >
          {t('auth.signIn')}
        </button>
      </form>
    </div>
  );
}
