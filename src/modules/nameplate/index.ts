import type { ModuleDefinition } from '@app/moduleDefinition';

import { nameplateApi } from './infrastructure/endpoints';
import en from './locales/en.json';
import es from './locales/es.json';

export { NameplateModal } from './ui/NameplateModal';
export type { Nameplate } from './infrastructure/endpoints';

/** No routes: the plate is edited from the equipment it belongs to. */
const definition: ModuleDefinition = {
  code: 'nameplate',
  routes: [],
  translations: { namespace: 'nameplate', bundle: { es, en } },
  registerEndpoints: () => void nameplateApi,
};

export default definition;
