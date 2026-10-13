/**
 * What a failed request says, in words a user can read.
 *
 * DRF answers with a string, a list of messages, `{detail: …}` or an object
 * keyed by field. Every screen needs the same first sentence out of it, so it
 * is read here rather than in each module — and no module has to import
 * another module's form to get it.
 */
export function readError(cause: unknown): string | null {
  const data = (cause as { data?: unknown })?.data;
  // A server crash answers with a whole HTML debug page; printing it buried
  // the screen under a traceback. Only a short sentence is a message.
  if (typeof data === 'string') return data.length <= 300 && !data.trimStart().startsWith('<') ? data : null;
  if (Array.isArray(data)) return String(data[0]);
  if (data && typeof data === 'object') {
    const record = data as Record<string, unknown>;
    // DRF says `detail`; the problem+json answers (modules, users) say `title`.
    const first = record.detail ?? record.title ?? Object.values(record)[0];
    if (Array.isArray(first)) return String(first[0]);
    if (typeof first === 'string') return first;
  }
  return null;
}
