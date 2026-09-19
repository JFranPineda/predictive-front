import { lazy } from 'react';

import type { ModuleDefinition } from '@app/moduleDefinition';

import { operatingDataApi } from './infrastructure/endpoints';
import en from './locales/en.json';
import es from './locales/es.json';

/** The values themselves are captured inside the visit; what a plant records
 *  is configuration, and it needed a screen of its own. */
const definition: ModuleDefinition = {
  code: 'operating_data',
  routes: [
    {
      path: '/settings/operating-parameters',
      component: lazy(() => import('./ui/OperatingParametersPage')),
      permission: 'operating_data.view',
    },
  ],
  translations: { namespace: 'operating_data', bundle: { es, en } },
  registerEndpoints: () => void operatingDataApi,
};

export default definition;
