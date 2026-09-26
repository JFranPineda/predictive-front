import { createContext, useContext, useMemo } from 'react';
import type { ReactNode } from 'react';

import type { ModuleDefinition } from './moduleDefinition';

type ScaleEditors = NonNullable<ModuleDefinition['scaleEditors']>;

const ScaleEditorsContext = createContext<ScaleEditors>({});

/**
 * What installed modules contribute to other modules' screens. Only loaded
 * definitions take part, so an uninstalled module's editor never appears.
 */
export function ContributionsProvider({
  definitions,
  children,
}: {
  definitions: ModuleDefinition[];
  children: ReactNode;
}) {
  const editors = useMemo(
    () => Object.assign({}, ...definitions.map((definition) => definition.scaleEditors ?? {})) as ScaleEditors,
    [definitions],
  );
  return <ScaleEditorsContext.Provider value={editors}>{children}</ScaleEditorsContext.Provider>;
}

export function useScaleEditors(): ScaleEditors {
  return useContext(ScaleEditorsContext);
}
