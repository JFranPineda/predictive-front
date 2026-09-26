import { lazy } from 'react';

import type { ModuleDefinition } from '@app/moduleDefinition';

import { maintenanceApi } from './infrastructure/endpoints';
import en from './locales/en.json';
import es from './locales/es.json';

export { useWorkRecordMarkersQuery } from './infrastructure/endpoints';
export type { WorkRecordMarker } from './domain/types';

const definition: ModuleDefinition = {
  code: 'maintenance',
  routes: [
    {
      path: '/maintenance',
      component: lazy(() => import('./ui/WorkRecordListPage')),
      permission: 'maintenance.view',
    },
  ],
  translations: { namespace: 'maintenance', bundle: { es, en } },
  registerEndpoints: () => void maintenanceApi,
};

export default definition;
