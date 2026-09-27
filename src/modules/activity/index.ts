import { lazy } from 'react';

import type { ModuleDefinition } from '@app/moduleDefinition';

import { activityApi } from './infrastructure/endpoints';
import en from './locales/en.json';
import es from './locales/es.json';

const definition: ModuleDefinition = {
  code: 'activity',
  routes: [
    {
      path: '/settings/activity',
      component: lazy(() => import('./ui/ActivityPage')),
      permission: 'activity.view',
    },
  ],
  translations: { namespace: 'activity', bundle: { es, en } },
  registerEndpoints: () => void activityApi,
  // Listens to every screen while installed; uninstalling it stops the log.
  shell: [lazy(() => import('./ui/ActivityTracker'))],
};

export default definition;
