/** The minimum a catalogue entry needs to be described to a person. */
export interface MagnitudeName {
  code: string;
  name: string;
  technique_code: string;
  technique_name: string;
}

/** Magnitude codes grouped by the service they belong to, in catalogue order. */
export function groupByService<T extends MagnitudeName>(magnitudes: T[]): [string, T[]][] {
  const groups = new Map<string, T[]>();
  for (const magnitude of magnitudes) {
    const service = magnitude.technique_name || magnitude.technique_code;
    groups.set(service, [...(groups.get(service) ?? []), magnitude]);
  }
  return [...groups.entries()];
}

/**
 * "Vibraciones: Velocidad, Envolvente · Termografía: Temperatura".
 *
 * The internal code (`vel_rms`) means nothing to the person configuring a
 * kind; an unknown code is still shown rather than silently dropped.
 */
export function describeMagnitudes(codes: string[], catalogue: MagnitudeName[]): string {
  const known = catalogue.filter((magnitude) => codes.includes(magnitude.code));
  const unknown = codes.filter((code) => !catalogue.some((magnitude) => magnitude.code === code));
  const parts = groupByService(known).map(
    ([service, rows]) => `${service}: ${rows.map((row) => row.name).join(', ')}`,
  );
  return [...parts, ...unknown].join(' · ');
}
