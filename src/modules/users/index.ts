import { lazy } from 'react';

import type { ModuleDefinition } from '@app/moduleDefinition';

import { usersApi } from './infrastructure/endpoints';
import en from './locales/en.json';
import es from './locales/es.json';

/** Registered under the backend's `security` code. */
const definition: ModuleDefinition = {
  code: 'security',
  routes: [
    {
      path: '/settings/users',
      component: lazy(() => import('./ui/UsersPage')),
      permission: 'security.view_user',
    },
  ],
  translations: { namespace: 'users', bundle: { es, en } },
  registerEndpoints: () => void usersApi,
};

export default definition;
