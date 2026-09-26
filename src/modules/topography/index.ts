import type { ModuleDefinition } from '@app/moduleDefinition';

import { topographyApi } from './infrastructure/endpoints';
import en from './locales/en.json';
import es from './locales/es.json';

export { TopographyPanel } from './ui/TopographyPanel';
export type { TopographyElement } from './domain/types';

const definition: ModuleDefinition = {
  code: 'topography',
  routes: [],
  translations: { namespace: 'topography', bundle: { es, en } },
  registerEndpoints: () => void topographyApi,
};

export default definition;
