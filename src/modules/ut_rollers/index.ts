import { lazy } from 'react';

import type { ModuleDefinition } from '@app/moduleDefinition';

import { utRollersApi } from './infrastructure/endpoints';
import en from './locales/en.json';
import es from './locales/es.json';

const definition: ModuleDefinition = {
  code: 'ut_rollers',
  routes: [
    {
      path: '/ut-rollers',
      component: lazy(() => import('./ui/UtRollersPage')),
      permission: 'ut_rollers.view',
    },
  ],
  translations: { namespace: 'ut_rollers', bundle: { es, en } },
  registerEndpoints: () => void utRollersApi,
};

export default definition;
