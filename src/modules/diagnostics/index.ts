import type { ModuleDefinition } from '@app/moduleDefinition';

import { diagnosticsApi } from './infrastructure/endpoints';
import en from './locales/en.json';
import es from './locales/es.json';

export { FaultPicker } from './ui/FaultPicker';
export type { FaultMode } from './infrastructure/endpoints';

/** No routes of its own: the picker belongs inside the service form. */
const definition: ModuleDefinition = {
  code: 'diagnostics',
  routes: [],
  translations: { namespace: 'diagnostics', bundle: { es, en } },
  registerEndpoints: () => void diagnosticsApi,
};

export default definition;
