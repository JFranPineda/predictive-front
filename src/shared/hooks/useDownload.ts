import { useCallback, useState } from 'react';

import { useAppSelector } from '@app/hooks';
import { currentLanguage } from '@app/i18n';

/**
 * Downloads an authenticated file.
 *
 * RTK Query is built around JSON caches and a spreadsheet is neither JSON nor
 * worth caching, so this goes straight to `fetch`: same token, same tenant
 * headers, and the filename the server chose in `Content-Disposition`.
 */
export function useDownload(): {
  download: (path: string, fallbackName: string) => Promise<void>;
  isDownloading: boolean;
  error: string | null;
} {
  const token = useAppSelector((state) => state.session.accessToken);
  const companyId = useAppSelector((state) => state.session.companyId);
  const [isDownloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const download = useCallback(
    async (path: string, fallbackName: string) => {
      setDownloading(true);
      setError(null);
      try {
        const headers: Record<string, string> = { 'X-Language': currentLanguage() };
        if (token) headers.Authorization = `Bearer ${token}`;
        if (companyId !== null) headers['X-Company-Id'] = String(companyId);

        const response = await fetch(`/api/v1/${path}`, { headers });
        if (!response.ok) throw new Error(String(response.status));

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filenameFrom(response.headers.get('Content-Disposition')) ?? fallbackName;
        document.body.append(link);
        link.click();
        link.remove();
        // Revoking immediately cancels the download in some browsers.
        setTimeout(() => URL.revokeObjectURL(url), 10_000);
      } catch {
        setError('download_failed');
      } finally {
        setDownloading(false);
      }
    },
    [token, companyId],
  );

  return { download, isDownloading, error };
}

function filenameFrom(header: string | null): string | null {
  const match = header?.match(/filename="?([^"]+)"?/);
  return match?.[1] ?? null;
}
