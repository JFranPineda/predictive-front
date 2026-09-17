import { lazy } from 'react';

import type { ModuleDefinition } from '@app/moduleDefinition';

import { preferencesApi } from './infrastructure/endpoints';

/** Registered under the backend's `core` code: language is infrastructure, not
 * an optional feature, so it is always present. */
const definition: ModuleDefinition = {
  code: 'core',
  routes: [{ path: '/settings/language', component: lazy(() => import('./ui/LanguagePage')) }],
  registerEndpoints: () => void preferencesApi,
};

export default definition;
