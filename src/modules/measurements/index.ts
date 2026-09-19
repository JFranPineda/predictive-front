import { lazy } from 'react';

import type { ModuleDefinition } from '@app/moduleDefinition';

import en from './locales/en.json';
import es from './locales/es.json';

import { measurementsApi } from './infrastructure/endpoints';

const definition: ModuleDefinition = {
  code: 'measurements',
  routes: [
    {
      path: '/measurements',
      component: lazy(() => import('./ui/MeasurementsIndexPage')),
      permission: 'measurements.view_reading',
    },
    {
      path: '/measurements/:equipmentId',
      component: lazy(() => import('./ui/RecordOfValuesPage')),
      permission: 'measurements.view_reading',
    },
    {
      path: '/settings/instruments',
      component: lazy(() => import('./ui/InstrumentsPage')),
      permission: 'measurements.view_reading',
    },
    {
      path: '/services/visits/:visitId/capture',
      component: lazy(() => import('./ui/CapturePage')),
      permission: 'measurements.add_reading',
    },
    {
      path: '/measurements/:equipmentId/spectra',
      component: lazy(() => import('./ui/SpectraPage')),
      permission: 'measurements.view_reading',
    },
    {
      path: '/measurements/:equipmentId/trend',
      component: lazy(() => import('./ui/TrendMatrixPage')),
      permission: 'measurements.view_reading',
    },
  ],
  translations: { namespace: 'measurements', bundle: { es, en } },
  registerEndpoints: () => void measurementsApi,
};

export default definition;
