import { lazy } from 'react';

import type { ModuleDefinition } from '@app/moduleDefinition';

import { mediaApi } from './infrastructure/endpoints';
import en from './locales/en.json';
import es from './locales/es.json';

export { MediaGallery } from './ui/MediaGallery';
export { captureKindFor } from './domain/types';
export type { MediaAsset, MediaKind } from './domain/types';

/** The per-visit gallery is embedded where the images belong; the per-equipment
 *  one is a page, because a year of a machine's history is not a side panel. */
const definition: ModuleDefinition = {
  code: 'media',
  routes: [
    {
      path: '/assets/:equipmentId/media',
      component: lazy(() => import('./ui/EquipmentMediaPage')),
      permission: 'media.view',
    },
  ],
  translations: { namespace: 'media', bundle: { es, en } },
  registerEndpoints: () => void mediaApi,
};

export default definition;
