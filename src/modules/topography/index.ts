import { lazy } from 'react';

import type { ModuleDefinition } from '@app/moduleDefinition';

import { topographyApi } from './infrastructure/endpoints';
import en from './locales/en.json';
import es from './locales/es.json';

export type { TopographyElement } from './domain/types';

const definition: ModuleDefinition = {
  code: 'topography',
  routes: [],
  translations: { namespace: 'topography', bundle: { es, en } },
  registerEndpoints: () => void topographyApi,
  visitSections: [
    { slot: 'readings', techniques: ['topography'], component: lazy(() => import('./ui/TopographyVisitSection')) },
  ],
};

export default definition;
