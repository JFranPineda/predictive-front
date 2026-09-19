import { lazy } from 'react';

import type { ModuleDefinition } from '@app/moduleDefinition';

import en from './locales/en.json';
import es from './locales/es.json';

import { servicesApi } from './infrastructure/endpoints';

const definition: ModuleDefinition = {
  code: 'services',
  routes: [
    {
      path: '/services',
      component: lazy(() => import('./ui/ServiceOrdersPage')),
      permission: 'services.view',
    },
    {
      path: '/services/visits/:visitId',
      component: lazy(() => import('./ui/VisitDetailPage')),
      permission: 'services.view',
    },
    {
      path: '/services/authorship',
      component: lazy(() => import('./ui/AuthorshipPage')),
      permission: 'services.view_authorship',
    },
  ],
  translations: { namespace: 'services', bundle: { es, en } },
  registerEndpoints: () => void servicesApi,
};

/** A module speaks to another through its index, never its internals. */
export { useVisitQuery } from './infrastructure/endpoints';
export type { VisitDetail, VisitPoint } from './domain/types';

export default definition;
