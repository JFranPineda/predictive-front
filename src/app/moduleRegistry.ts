import type { ModuleDefinition, ModuleLoader } from './moduleDefinition';

/**
 * Every module the build knows about, keyed by the *backend* module code.
 *
 * A backend module can be backed by more than one frontend module — `core`
 * ships both the language preferences and the application manager — so the
 * value is a list. Keying them separately silently dropped
 * `/settings/modules`, because no backend module is called `modules_admin`.
 *
 * Presence here is not activation: the server decides what is installed, and
 * only those loaders are ever called, so an uninstalled module never
 * downloads its chunk.
 */
const LOADERS: Record<string, ModuleLoader[]> = {
  core: [() => import('@modules/preferences'), () => import('@modules/modules_admin')],
  assets: [() => import('@modules/assets')],
  thresholds: [() => import('@modules/thresholds')],
  measurements: [() => import('@modules/measurements')],
  services: [() => import('@modules/services')],
  summaries: [() => import('@modules/summaries')],
  security: [() => import('@modules/users')],
  licensing: [() => import('@modules/licensing')],
};

export function knownModuleCodes(): string[] {
  return Object.keys(LOADERS);
}

/**
 * Loads the definitions for the installed modules, skipping any the build does
 * not ship. A backend module without a frontend counterpart is normal — it
 * contributes API and permissions but no screens — and must not break boot.
 */
export async function loadModules(installedCodes: string[]): Promise<ModuleDefinition[]> {
  const loaders = installedCodes.flatMap((code) => LOADERS[code] ?? []);
  const definitions = await Promise.all(loaders.map((load) => load()));
  return definitions.map((entry) => entry.default);
}

export function routesFor(
  definitions: ModuleDefinition[],
  permissions: ReadonlySet<string>,
): { code: string; route: ModuleDefinition['routes'][number] }[] {
  return definitions.flatMap((definition) =>
    definition.routes
      .filter((route) => !route.permission || permissions.has(route.permission))
      .map((route) => ({ code: definition.code, route })),
  );
}

/**
 * The menu comes from the server, which lists every installed backend module.
 * Some of them have no screen in this build yet. Showing those entries and
 * letting the catch-all bounce the user back to the first page looks exactly
 * like a broken router — so an entry the client cannot render is not offered.
 */
export function renderableMenu<T extends { route: string }>(
  menu: T[],
  routes: { route: { path: string } }[],
): T[] {
  const paths = new Set(routes.map((entry) => entry.route.path));
  return menu.filter((item) => paths.has(item.route));
}
