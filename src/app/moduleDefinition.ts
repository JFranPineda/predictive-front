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

/** What a norma's scale editor receives (Configuración → Normas). */
export interface ScaleEditorProps {
  standardId: number;
  editable: boolean;
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
  /** The editor of a norma's scale, keyed by the technique the norma judges.
   * Alignment contributes its RPM table this way, so the Normas screen shows
   * it without the thresholds module ever importing alignment (Q10). */
  scaleEditors?: Record<string, LazyExoticComponent<ComponentType<ScaleEditorProps>>>;
}

/** A module's entry point is its default export. */
export type ModuleLoader = () => Promise<{ default: ModuleDefinition }>;
