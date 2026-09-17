import { lazy } from 'react';

import type { ModuleDefinition } from '@app/moduleDefinition';

import en from './locales/en.json';
import es from './locales/es.json';

import { thresholdsApi } from './infrastructure/endpoints';

const definition: ModuleDefinition = {
  code: 'thresholds',
  routes: [
    {
      path: '/settings/standards',
      component: lazy(() => import('./ui/StandardsPage')),
      permission: 'thresholds.manage_standard',
    },
    {
      path: '/settings/statuses',
      component: lazy(() => import('./ui/StatusesPage')),
      permission: 'thresholds.manage_status',
    },
    {
      path: '/settings/thresholds',
      component: lazy(() => import('./ui/ThresholdsPage')),
      permission: 'thresholds.view_set',
    },
  ],
  translations: { namespace: 'thresholds', bundle: { es, en } },
  registerEndpoints: () => void thresholdsApi,
};

export default definition;
