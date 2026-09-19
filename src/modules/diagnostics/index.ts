import { lazy } from 'react';

import type { ModuleDefinition } from '@app/moduleDefinition';

import { diagnosticsApi } from './infrastructure/endpoints';
import en from './locales/en.json';
import es from './locales/es.json';

export { FaultPicker } from './ui/FaultPicker';
export type { FaultMode } from './infrastructure/endpoints';

/** The picker belongs inside the service form; the catalogue behind it is a
 *  screen of its own, because it is the customer's vocabulary. */
const definition: ModuleDefinition = {
  code: 'diagnostics',
  routes: [
    {
      path: '/settings/fault-modes',
      component: lazy(() => import('./ui/FaultModesPage')),
      permission: 'diagnostics.view',
    },
  ],
  translations: { namespace: 'diagnostics', bundle: { es, en } },
  registerEndpoints: () => void diagnosticsApi,
};

export default definition;
