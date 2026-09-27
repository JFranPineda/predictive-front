import { createContext, Suspense, useContext, useMemo } from 'react';
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
  const shell = useMemo(() => definitions.flatMap((definition) => definition.shell ?? []), [definitions]);
  return (
    <ScaleEditorsContext.Provider value={editors}>
      {shell.map((Component, index) => (
        <Suspense key={index} fallback={null}>
          <Component />
        </Suspense>
      ))}
      {children}
    </ScaleEditorsContext.Provider>
  );
}

export function useScaleEditors(): ScaleEditors {
  return useContext(ScaleEditorsContext);
}
