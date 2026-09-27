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

/** What a module's section of a service visit's page receives. */
export interface VisitSectionProps {
  visitId: number;
  equipmentId: number;
  assetGroupId: number;
  techniqueCode: string;
  /** False when the visit is closed, not the user's, or locked by another module. */
  canEdit: boolean;
}

/**
 * A module's section of the visit page, for its own technique's visits:
 * alignment's SKF panel, topography's sheet, the thermogram upload. The page
 * never imports them, so uninstalling the module removes its section.
 */
export interface VisitSection {
  /** `readings` takes the place of the readings table; `top` goes above it. */
  slot: 'top' | 'readings';
  techniques: string[];
  component: LazyExoticComponent<ComponentType<VisitSectionProps>>;
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
  /** Mounted once inside the shell, on every screen, while the module is
   * installed — the activity log's click listener (Q20). Render nothing. */
  shell?: LazyExoticComponent<ComponentType>[];
  /** Sections this module adds to the visit page of its techniques. */
  visitSections?: VisitSection[];
}

/** A module's entry point is its default export. */
export type ModuleLoader = () => Promise<{ default: ModuleDefinition }>;
