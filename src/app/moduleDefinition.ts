import type { Reducer } from '@reduxjs/toolkit';
import type { ComponentType, LazyExoticComponent } from 'react';

import type { TranslationBundle } from '@app/i18n';

/**
 * The frontend half of the module contract (T2).
 *
 * The backend manifest and this definition describe the same module from two
 * sides: the backend says which modules are installed and what the user may do,
 * this says what to mount for them. Nothing is hardcoded in the shell.
 */
export interface ModuleRoute {
  path: string;
  component: LazyExoticComponent<ComponentType>;
  permission?: string;
  index?: boolean;
}

export interface ModuleDefinition {
  code: string;
  routes: ModuleRoute[];
  /** Injected into the store only when the module is installed. */
  reducer?: { name: string; reducer: Reducer };
  /** Called once on mount, to inject RTK Query endpoints. */
  registerEndpoints?: () => void;
  /** The module's own strings, shipped in its chunk and registered under its
   * own namespace so two modules can both have a "title" key. */
  translations?: { namespace: string; bundle: TranslationBundle };
}

/** A module's entry point is its default export. */
export type ModuleLoader = () => Promise<{ default: ModuleDefinition }>;
