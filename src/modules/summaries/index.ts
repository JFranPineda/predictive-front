import { lazy } from 'react';

import type { ModuleDefinition } from '@app/moduleDefinition';

import en from './locales/en.json';
import es from './locales/es.json';

import { summariesApi } from './infrastructure/endpoints';

const definition: ModuleDefinition = {
  code: 'summaries',
  routes: [
    {
      path: '/summaries',
      component: lazy(() => import('./ui/PlantSummaryPage')),
      permission: 'summaries.view',
    },
  ],
  translations: { namespace: 'summaries', bundle: { es, en } },
  registerEndpoints: () => void summariesApi,
};

export default definition;
