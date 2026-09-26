import { lazy } from 'react';

import type { ModuleDefinition } from '@app/moduleDefinition';

import { alignmentApi } from './infrastructure/endpoints';
import en from './locales/en.json';
import es from './locales/es.json';

export { AlignmentPanel } from './ui/AlignmentPanel';
export type { AlignmentRecord } from './domain/types';

const definition: ModuleDefinition = {
  code: 'alignment',
  routes: [
    {
      path: '/alignment',
      component: lazy(() => import('./ui/AlignmentListPage')),
      permission: 'alignment.view',
    },
  ],
  translations: { namespace: 'alignment', bundle: { es, en } },
  registerEndpoints: () => void alignmentApi,
  // The RPM tolerance table of an alignment norma, shown on Normas (Q10).
  scaleEditors: { alignment: lazy(() => import('./ui/AlignmentScaleEditor')) },
};

export default definition;
