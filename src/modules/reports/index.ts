import { lazy } from 'react';

import type { ModuleDefinition } from '@app/moduleDefinition';

import { reportsApi } from './infrastructure/endpoints';
import en from './locales/en.json';
import es from './locales/es.json';

const definition: ModuleDefinition = {
  code: 'reports',
  routes: [
    {
      path: '/reports/mpd',
      component: lazy(() => import('./ui/MpdReportsPage')),
      permission: 'reports.view',
    },
    {
      path: '/reports/end',
      component: lazy(() => import('./ui/EndReportsPage')),
      permission: 'reports.view',
    },
    {
      path: '/reports',
      component: lazy(() => import('./ui/LegacyReportsRedirect')),
      permission: 'reports.view',
    },
  ],
  translations: { namespace: 'reports', bundle: { es, en } },
  registerEndpoints: () => void reportsApi,
};

export default definition;
