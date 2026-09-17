import { lazy } from 'react';

import type { ModuleDefinition } from '@app/moduleDefinition';

import en from './locales/en.json';
import es from './locales/es.json';

import { assetsApi } from './infrastructure/endpoints';

export { useAreasQuery, useEquipmentQuery, useEquipmentsQuery } from './infrastructure/endpoints';
export type { Area, Equipment, MeasurementPoint } from './domain/types';

const definition: ModuleDefinition = {
  code: 'assets',
  routes: [
    {
      path: '/assets/structure',
      component: lazy(() => import('./ui/PlantStructurePage')),
      permission: 'assets.view_equipment',
    },
    {
      path: '/assets',
      component: lazy(() => import('./ui/EquipmentListPage')),
      permission: 'assets.view_equipment',
    },
  ],
  translations: { namespace: 'assets', bundle: { es, en } },
  registerEndpoints: () => void assetsApi,
};

export default definition;
