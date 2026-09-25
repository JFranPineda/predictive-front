import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@shared/ui/Button';
import { Card } from '@shared/ui/Card';
import { EmptyState } from '@shared/ui/EmptyState';

import type { MediaAsset, MediaKind } from '../domain/types';
import { useMediaForQuery, useUploadMediaMutation } from '../infrastructure/endpoints';
import { MediaDetailModal } from './MediaDetailModal';
import { MediaThumbnail } from './MediaThumbnail';
import { readMediaError } from './readMediaError';

/**
 * Upload and review one kind of image for one owner.
 *
 * Several files at once, because a round produces a handful per equipment and
 * uploading them one by one is how a crew stops bothering. Each keeps a
 * caption: in the source reports the caption under a spectrum *is* the
 * diagnosis ("muestra desalineamiento y soltura mecánica"). The caption is
 * edited in the opened image, not in the grid.
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
  const input = useRef<HTMLInputElement>(null);
  const [opened, setOpened] = useState<{ asset: MediaAsset; deleting: boolean } | null>(null);
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
            <MediaThumbnail
              key={asset.id}
              asset={asset}
              onOpen={() => setOpened({ asset, deleting: false })}
              onDelete={() => setOpened({ asset, deleting: true })}
            />
          ))}
        </ul>
      )}

      {opened && (
        <MediaDetailModal
          asset={opened.asset}
          confirmingDelete={opened.deleting}
          onClose={() => setOpened(null)}
        />
      )}
    </Card>
  );
}
