/** The server's sentence, whatever shape DRF wrapped it in. */
export function readSpectrumError(cause: unknown): string | null {
  const data = (cause as { data?: unknown })?.data;
  if (Array.isArray(data)) return String(data[0]);
  if (data && typeof data === 'object') {
    const first = Object.values(data as Record<string, unknown>)[0];
    if (Array.isArray(first)) return String(first[0]);
    if (typeof first === 'string') return first;
  }
  return null;
}
