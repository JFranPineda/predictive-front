import { lazy } from 'react';

import type { ModuleDefinition } from '@app/moduleDefinition';

import { workdayApi } from './infrastructure/endpoints';
import en from './locales/en.json';
import es from './locales/es.json';

const definition: ModuleDefinition = {
  code: 'workday',
  routes: [
    {
      path: '/workday',
      component: lazy(() => import('./ui/WorkdayPage')),
      permission: 'workday.view',
    },
    {
      path: '/workday/jobs/:jobId',
      component: lazy(() => import('./ui/JobPage')),
      permission: 'workday.view',
    },
  ],
  translations: { namespace: 'workday', bundle: { es, en } },
  registerEndpoints: () => void workdayApi,
};

export default definition;
