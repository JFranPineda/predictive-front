import { lazy } from 'react';

import type { ModuleDefinition } from '@app/moduleDefinition';

import en from './locales/en.json';
import es from './locales/es.json';

import { assetsApi } from './infrastructure/endpoints';

export {
  useAreasQuery,
  useAssetGroupsQuery,
  useEquipmentQuery,
  useEquipmentsQuery,
  useGroupKindsQuery,
  usePlantsQuery,
} from './infrastructure/endpoints';
export type { Area, AssetGroup, AssetGroupKind, Equipment, MeasurementPoint, Plant } from './domain/types';

const definition: ModuleDefinition = {
  code: 'assets',
  routes: [
    {
      path: '/settings/group-kinds',
      component: lazy(() => import('./ui/GroupKindsPage')),
      permission: 'assets.view_equipment',
    },
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
