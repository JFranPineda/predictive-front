import { useEffect, useState } from 'react';

import { useAppSelector } from '@app/hooks';
import { currentLanguage } from '@app/i18n';

/**
 * The report's own HTML, for the preview frame.
 *
 * The PDF is rendered on the server from this same HTML, so the preview is
 * exactly what the customer receives — there is no second layout in React to
 * drift from it. Fetched with the session's token like any download.
 */
export function useReportPreview(path: string | null): {
  html: string | null;
  isLoading: boolean;
  error: string | null;
} {
  const token = useAppSelector((state) => state.session.accessToken);
  const companyId = useAppSelector((state) => state.session.companyId);
  const [html, setHtml] = useState<string | null>(null);
  const [isLoading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!path) {
      setHtml(null);
      return undefined;
    }
    const controller = new AbortController();
    const headers: Record<string, string> = { 'X-Language': currentLanguage() };
    if (token) headers.Authorization = `Bearer ${token}`;
    if (companyId !== null) headers['X-Company-Id'] = String(companyId);
    setLoading(true);
    setError(null);
    fetch(`/api/v1/${path}`, { headers, signal: controller.signal })
      .then(async (response) => {
        const body = await response.text();
        if (!response.ok) {
          setHtml(null);
          setError(readError(body));
          return;
        }
        setHtml(body);
      })
      .catch((cause: unknown) => {
        if ((cause as { name?: string }).name !== 'AbortError') setError('failed');
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [path, token, companyId]);

  return { html, isLoading, error };
}

function readError(body: string): string {
  try {
    const data = JSON.parse(body) as unknown;
    if (Array.isArray(data)) return String(data[0]);
    if (data && typeof data === 'object' && 'detail' in data) return String(data.detail);
  } catch {
    // Not JSON: fall through to the generic message.
  }
  return 'failed';
}
