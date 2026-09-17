import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@shared/ui/Button';
import { Card } from '@shared/ui/Card';
import { EmptyState } from '@shared/ui/EmptyState';

import type { MediaKind } from '../domain/types';
import {
  useCaptionMediaMutation,
  useDeleteMediaMutation,
  useMediaForQuery,
  useUploadMediaMutation,
} from '../infrastructure/endpoints';

/**
 * Upload and review one kind of image for one owner.
 *
 * Several files at once, because a round produces a handful per equipment and
 * uploading them one by one is how a crew stops bothering. Each keeps a
 * caption: in the source reports the caption under a spectrum *is* the
 * diagnosis ("muestra desalineamiento y soltura mecánica").
 */
export function MediaGallery({
  ownerType,
  ownerId,
  kind,
  title,
  description,
  canEdit,
}: {
  ownerType: string;
  ownerId: number;
  kind: MediaKind;
  title: string;
  description?: string;
  canEdit: boolean;
}) {
  const { t } = useTranslation(['media', 'common']);
  const { data } = useMediaForQuery({ owner_type: ownerType, owner_id: ownerId, kind });
  const [upload, { isLoading }] = useUploadMediaMutation();
  const [caption] = useCaptionMediaMutation();
  const [remove] = useDeleteMediaMutation();
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(0);

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    setError(null);
    setPending(files.length);
    for (const file of Array.from(files)) {
      try {
        await upload({ file, kind, owner_type: ownerType, owner_id: ownerId }).unwrap();
      } catch (cause) {
        setError(readMediaError(cause) ?? t('uploadFailed', { name: file.name }));
      } finally {
        setPending((count) => count - 1);
      }
    }
    if (input.current) input.current.value = '';
  }

  const assets = data ?? [];

  return (
    <Card
      title={title}
      description={description}
      actions={
        canEdit && (
          <>
            <input
              ref={input}
              type="file"
              multiple
              accept="image/*,.pdf"
              onChange={(event) => void onFiles(event.target.files)}
              className="hidden"
            />
            <Button
              variant="primary"
              disabled={isLoading || pending > 0}
              onClick={() => input.current?.click()}
            >
              {pending > 0 ? t('uploading', { count: pending }) : `+ ${t('add')}`}
            </Button>
          </>
        )
      }
    >
      {error && <p className="mb-3 rounded-lg bg-red-50 p-2 text-xs text-red-700">{error}</p>}

      {assets.length === 0 ? (
        <EmptyState title={t('empty')} body={canEdit ? t('emptyHint') : undefined} />
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {assets.map((asset) => (
            <li key={asset.id} className="group relative">
              <a href={asset.url} target="_blank" rel="noreferrer" title={asset.caption}>
                {asset.thumb_url ? (
                  <img
                    src={asset.thumb_url}
                    alt={asset.caption || asset.format}
                    loading="lazy"
                    className="aspect-4/3 w-full rounded-lg border border-slate-200 object-cover dark:border-slate-700"
                  />
                ) : (
                  <span className="flex aspect-4/3 w-full items-center justify-center rounded-lg border border-dashed border-slate-300 text-xs uppercase text-slate-400 dark:border-slate-700">
                    {asset.format}
                  </span>
                )}
              </a>
              {canEdit ? (
                <input
                  defaultValue={asset.caption}
                  placeholder={t('captionPlaceholder')}
                  onBlur={(event) => {
                    if (event.target.value !== asset.caption) {
                      void caption({ id: asset.id, caption: event.target.value });
                    }
                  }}
                  className="mt-1 w-full rounded border border-transparent bg-transparent px-1 py-0.5 text-xs hover:border-slate-200 focus:border-slate-300 dark:hover:border-slate-700"
                />
              ) : (
                asset.caption && <p className="mt-1 px-1 text-xs text-slate-500">{asset.caption}</p>
              )}
              {canEdit && (
                <button
                  onClick={() => void remove(asset.id)}
                  aria-label={t('common:action.delete')}
                  className="absolute right-1 top-1 hidden rounded bg-white/90 px-1.5 text-xs text-red-600 group-hover:block dark:bg-slate-900/90"
                >
                  ✕
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export function readMediaError(cause: unknown): string | null {
  const data = (cause as { data?: unknown })?.data;
  if (typeof data === 'string') return data;
  if (Array.isArray(data)) return String(data[0]);
  if (data && typeof data === 'object') {
    const first = Object.values(data as Record<string, unknown>)[0];
    if (Array.isArray(first)) return String(first[0]);
    if (typeof first === 'string') return first;
  }
  return null;
}
