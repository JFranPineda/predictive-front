import type { ModuleDefinition } from '@app/moduleDefinition';

import { mediaApi } from './infrastructure/endpoints';
import en from './locales/en.json';
import es from './locales/es.json';

export { MediaGallery } from './ui/MediaGallery';
export { captureKindFor } from './domain/types';
export type { MediaAsset, MediaKind } from './domain/types';

/** No routes of its own: the gallery is embedded where the images belong. */
const definition: ModuleDefinition = {
  code: 'media',
  routes: [],
  translations: { namespace: 'media', bundle: { es, en } },
  registerEndpoints: () => void mediaApi,
};

export default definition;
