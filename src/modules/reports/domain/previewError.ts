import { readError } from '@shared/lib/apiError';

/** The server's own sentence, `detail` or `title` (a lapsed licence answers
 * problem+json); anything else is a plain failure. */
export function previewError(body: string): string {
  try {
    return readError({ data: JSON.parse(body) as unknown }) ?? 'failed';
  } catch {
    return 'failed';
  }
}
