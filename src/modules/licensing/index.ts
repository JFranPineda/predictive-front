import { lazy } from 'react';

import type { ModuleDefinition } from '@app/moduleDefinition';

import { licensingApi } from './infrastructure/endpoints';
import en from './locales/en.json';
import es from './locales/es.json';

const definition: ModuleDefinition = {
  code: 'licensing',
  routes: [
    {
      path: '/settings/license',
      component: lazy(() => import('./ui/LicensePage')),
      permission: 'licensing.view_status',
    },
  ],
  translations: { namespace: 'licensing', bundle: { es, en } },
  registerEndpoints: () => void licensingApi,
};

export default definition;
