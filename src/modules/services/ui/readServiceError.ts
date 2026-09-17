/** DRF sends either a list of messages or an object keyed by field. */
export function readServiceError(cause: unknown): string | null {
  const data = (cause as { data?: unknown })?.data;
  if (typeof data === 'string') return data;
  if (Array.isArray(data)) return String(data[0]);
  if (data && typeof data === 'object') {
    const payload = data as Record<string, unknown>;
    if (typeof payload.title === 'string') return payload.title;
    if (typeof payload.detail === 'string') return payload.detail;
    const first = Object.values(payload)[0];
    if (Array.isArray(first)) return String(first[0]);
    if (typeof first === 'string') return first;
  }
  return null;
}
