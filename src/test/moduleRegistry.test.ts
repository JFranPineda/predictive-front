import { describe, expect, it } from 'vitest';

import type { ModuleDefinition } from '@app/moduleDefinition';
import { knownModuleCodes, loadModules, renderableMenu, routesFor } from '@app/moduleRegistry';

const definition = (code: string, routes: ModuleDefinition['routes']): ModuleDefinition => ({
  code,
  routes,
});

describe('module registry', () => {
  it('ignores installed modules the build does not ship', async () => {
    // The backend installs `reports`; the frontend has no screens for it yet.
    // That is a normal state, not a boot failure.
    const loaded = await loadModules(['assets', 'reports']);
    expect(loaded.map((m) => m.code)).toEqual(['assets']);
  });

  it('loads every frontend module that backs one backend module', async () => {
    // `core` ships both the language page and the application manager.
    const loaded = await loadModules(['core']);
    const paths = loaded.flatMap((m) => m.routes.map((r) => r.path));
    expect(paths).toContain('/settings/language');
    expect(paths).toContain('/settings/modules');
  });

  it('never loads a module that is not installed', async () => {
    const loaded = await loadModules([]);
    expect(loaded).toEqual([]);
  });

  it('keys the registry by backend module code', () => {
    // Not by frontend folder name: there is no backend module called
    // `modules_admin`, which is exactly how its menu entry went missing.
    expect(knownModuleCodes()).toContain('core');
    expect(knownModuleCodes()).not.toContain('modules_admin');
  });
});

describe('route filtering', () => {
  const component = {} as ModuleDefinition['routes'][number]['component'];
  const modules = [
    definition('assets', [{ path: '/assets', component, permission: 'assets.view_equipment' }]),
    definition('thresholds', [
      { path: '/settings/thresholds', component, permission: 'thresholds.manage_set' },
    ]),
    definition('public', [{ path: '/about', component }]),
  ];

  it('hides routes the user has no permission for', () => {
    const routes = routesFor(modules, new Set(['assets.view_equipment']));
    expect(routes.map((r) => r.route.path)).toEqual(['/assets', '/about']);
  });

  it('keeps routes that declare no permission', () => {
    const routes = routesFor(modules, new Set());
    expect(routes.map((r) => r.route.path)).toEqual(['/about']);
  });
});

describe('menu honesty', () => {
  const component = {} as ModuleDefinition['routes'][number]['component'];
  const routes = [
    { code: 'assets', route: { path: '/assets', component } },
    { code: 'services', route: { path: '/services', component } },
  ];

  it('hides menu entries this build cannot render', () => {
    // The server lists every installed backend module. Offering an entry with
    // no screen and letting the catch-all bounce the user back looks exactly
    // like a broken router — which is what it was.
    const menu = [
      { label: 'Activos', route: '/assets' },
      { label: 'Planos', route: '/blueprints' },
      { label: 'Servicios', route: '/services' },
    ];
    expect(renderableMenu(menu, routes).map((m) => m.label)).toEqual(['Activos', 'Servicios']);
  });

  it('keeps everything when every route exists', () => {
    const menu = [{ label: 'Activos', route: '/assets' }];
    expect(renderableMenu(menu, routes)).toHaveLength(1);
  });

  it('does not match a parameterised route to a bare menu path', () => {
    const parameterised = [{ code: 'm', route: { path: '/measurements/:id', component } }];
    expect(renderableMenu([{ label: 'Mediciones', route: '/measurements' }], parameterised)).toEqual([]);
  });
});
