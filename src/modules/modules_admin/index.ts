import { lazy } from 'react';

import type { ModuleDefinition } from '@app/moduleDefinition';

import en from './locales/en.json';
import es from './locales/es.json';

import { modulesApi } from './infrastructure/endpoints';

const definition: ModuleDefinition = {
  code: 'modules_admin',
  routes: [
    {
      path: '/settings/modules',
      component: lazy(() => import('./ui/ModulesPage')),
      permission: 'core.manage_modules',
    },
  ],
  translations: { namespace: 'modules', bundle: { es, en } },
  registerEndpoints: () => void modulesApi,
};

export default definition;
