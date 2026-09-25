import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useAppSelector } from '@app/hooks';
import { Button } from '@shared/ui/Button';
import { Card } from '@shared/ui/Card';

import type { MediaAsset, MediaKind } from '../domain/types';
import { useMediaForQuery, useUploadMediaMutation } from '../infrastructure/endpoints';
import { MediaDetailModal } from './MediaDetailModal';
import { readMediaError } from './readMediaError';

/**
 * One image that stands for its owner — a train's schematic, its photo —
 * shown at reading size (V3-14).
 *
 * The newest upload is the one shown; the previous ones are kept, one click
 * away, because a schematic that was redrawn is still the one an old report
 * was read against.
 */
export function LatestImagePanel({
  ownerType,
  ownerId,
  kind,
  title,
  emptyHint,
}: {
  ownerType: string;
  ownerId: number;
  kind: MediaKind;
  title: string;
  emptyHint: string;
}) {
  const { t } = useTranslation(['media', 'common']);
  const canUpload = useAppSelector((state) => state.session.permissions.includes('media.upload'));
  const { data } = useMediaForQuery({ owner_type: ownerType, owner_id: ownerId, kind });
  const [upload, { isLoading }] = useUploadMediaMutation();
  const input = useRef<HTMLInputElement>(null);
  const [opened, setOpened] = useState<MediaAsset | null>(null);
  const [showOlder, setShowOlder] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [latest, ...older] = data ?? [];

  async function onFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    try {
      await upload({ file, kind, owner_type: ownerType, owner_id: ownerId }).unwrap();
    } catch (cause) {
      setError(readMediaError(cause) ?? t('uploadFailed', { name: file.name }));
    }
    if (input.current) input.current.value = '';
  }

  return (
    <Card
      title={title}
      actions={
        canUpload && (
          <>
            <input
              ref={input}
              type="file"
              accept="image/*"
              onChange={(event) => void onFile(event.target.files?.[0])}
              className="hidden"
            />
            <Button disabled={isLoading} onClick={() => input.current?.click()}>
              {latest ? t('latest.replace') : t('latest.upload')}
            </Button>
          </>
        )
      }
    >
      {error && <p className="mb-2 rounded-lg bg-red-50 p-2 text-xs text-red-700">{error}</p>}
      {latest ? (
        <button onClick={() => setOpened(latest)} className="block w-full" title={t('latest.enlarge')}>
          <img
            src={latest.url}
            alt={latest.caption || title}
            className="max-h-80 w-full rounded-lg bg-white object-contain"
          />
        </button>
      ) : (
        <p className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-400 dark:border-slate-700">
          {emptyHint}
        </p>
      )}

      {older.length > 0 && (
        <div className="mt-2">
          <button onClick={() => setShowOlder(!showOlder)} className="text-xs font-medium text-sky-600">
            {t('latest.older', { count: older.length })}
          </button>
          {showOlder && (
            <ul className="mt-2 flex flex-wrap gap-2">
              {older.map((asset) => (
                <li key={asset.id}>
                  <button onClick={() => setOpened(asset)}>
                    <img
                      src={asset.thumb_url ?? asset.url}
                      alt={asset.caption || title}
                      className="h-16 w-24 rounded border border-slate-200 object-cover dark:border-slate-700"
                    />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {opened && <MediaDetailModal asset={opened} onClose={() => setOpened(null)} />}
    </Card>
  );
}
