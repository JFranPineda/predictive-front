import { createContext, Suspense, useContext, useMemo } from 'react';
import type { ReactNode } from 'react';

import type { ModuleDefinition, VisitSection } from './moduleDefinition';

type ScaleEditors = NonNullable<ModuleDefinition['scaleEditors']>;

interface Contributions {
  scaleEditors: ScaleEditors;
  visitSections: VisitSection[];
}

const ContributionsContext = createContext<Contributions>({ scaleEditors: {}, visitSections: [] });

/**
 * What installed modules contribute to other modules' screens. Only loaded
 * definitions take part, so an uninstalled module's pieces never appear.
 */
export function ContributionsProvider({
  definitions,
  children,
}: {
  definitions: ModuleDefinition[];
  children: ReactNode;
}) {
  const value = useMemo<Contributions>(
    () => ({
      scaleEditors: Object.assign({}, ...definitions.map((definition) => definition.scaleEditors ?? {})) as ScaleEditors,
      visitSections: definitions.flatMap((definition) => definition.visitSections ?? []),
    }),
    [definitions],
  );
  const shell = useMemo(() => definitions.flatMap((definition) => definition.shell ?? []), [definitions]);
  return (
    <ContributionsContext.Provider value={value}>
      {shell.map((Component, index) => (
        <Suspense key={index} fallback={null}>
          <Component />
        </Suspense>
      ))}
      {children}
    </ContributionsContext.Provider>
  );
}

export function useScaleEditors(): ScaleEditors {
  return useContext(ContributionsContext).scaleEditors;
}

/** The sections installed modules add to this slot of a visit of this technique. */
export function useVisitSections(slot: VisitSection['slot'], technique: string): VisitSection[] {
  const { visitSections } = useContext(ContributionsContext);
  return visitSections.filter((section) => section.slot === slot && section.techniques.includes(technique));
}
