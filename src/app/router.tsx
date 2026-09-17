import { Suspense, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, Navigate, Route, Routes } from 'react-router-dom';

import { AppShell } from '@app/layout/AppShell';
import type { ModuleDefinition } from '@app/moduleDefinition';
import { loadModules, renderableMenu, routesFor } from '@app/moduleRegistry';
import { useBootstrapQuery } from '@app/session/sessionApi';
import { identityLoaded } from '@app/session/sessionSlice';
import { useAppDispatch, useAppSelector } from '@app/hooks';
import { registerTranslations } from '@app/i18n';
import { injectModuleReducer } from '@app/store';
import { LoginPage } from '@app/session/LoginPage';
import { Spinner } from '@shared/ui/Spinner';

export function AppRoutes() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  // Gate on the token, not on the query's error state. RTK Query only
  // registers `providesTags` for *successful* results, so a bootstrap that
  // failed with 401 provides no tags — and the login mutation invalidating
  // 'Bootstrap' therefore never refetched it. The app stayed on the login
  // screen with a perfectly valid token in the store.
  const accessToken = useAppSelector((state) => state.session.accessToken);
  const { data, isLoading, isError } = useBootstrapQuery(undefined, { skip: !accessToken });
  const [definitions, setDefinitions] = useState<ModuleDefinition[] | null>(null);

  useEffect(() => {
    if (!data) return;
    dispatch(identityLoaded({ userId: data.user.id, permissions: data.permissions }));
    let cancelled = false;
    void loadModules(data.modules.map((module) => module.code)).then((loaded) => {
      if (cancelled) return;
      loaded.forEach((definition) => {
        definition.registerEndpoints?.();
        if (definition.translations) {
          registerTranslations(definition.translations.namespace, definition.translations.bundle);
        }
        if (definition.reducer) {
          injectModuleReducer(definition.reducer.name, definition.reducer.reducer);
        }
      });
      setDefinitions(loaded);
    });
    return () => {
      cancelled = true;
    };
  }, [data, dispatch]);

  if (!accessToken || isError) return <LoginPage />;
  if (isLoading || !data || !definitions) return <Spinner label={t('state.loadingModules')} />;

  const permissions = new Set(data.permissions);
  const moduleRoutes = routesFor(definitions, permissions);
  const menu = renderableMenu(data.menu, moduleRoutes);
  const first = moduleRoutes[0];

  return (
    <Routes>
      <Route element={<AppShell menu={menu} user={data.user} companies={data.companies} />}>
        {moduleRoutes.map(({ code, route }) => (
          <Route
            key={`${code}:${route.path}`}
            path={route.path}
            element={
              <Suspense fallback={<Spinner label="" />}>
                <route.component />
              </Suspense>
            }
          />
        ))}
        {/* A typed-in URL for a module this build does not ship says so,
            instead of silently bouncing to another screen. */}
        <Route path="*" element={<NotFound fallback={first?.route.path} />} />
      </Route>
    </Routes>
  );
}

function NotFound({ fallback }: { fallback?: string }) {
  const { t } = useTranslation();
  if (!fallback) return <Navigate to="/" replace />;
  return (
    <div className="p-10">
      <h1 className="mb-2 text-xl font-semibold">{t('notFound.title')}</h1>
      <p className="mb-4 text-sm text-slate-500">{t('notFound.body')}</p>
      <Link to={fallback} className="text-sm font-medium text-sky-600">
        {t('notFound.back')}
      </Link>
    </div>
  );
}
