import { useTranslation } from 'react-i18next';

import type { MediaAsset } from '../domain/types';

/**
 * A tile in a visit's gallery: the thumbnail and its first line of caption.
 *
 * The delete control is always visible when the server allows it. It used to
 * appear only on hover, which on the tablets used in the plant means never.
 */
export function MediaThumbnail({
  asset,
  onOpen,
  onDelete,
}: {
  asset: MediaAsset;
  onOpen: () => void;
  onDelete: () => void;
}) {
  const { t } = useTranslation(['media', 'common']);
  return (
    <li className="relative">
      <button onClick={onOpen} className="w-full text-left" title={asset.caption}>
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
        <span className="mt-1 block truncate px-1 text-xs text-slate-500">
          {asset.caption || t('equipmentGallery.noCaption')}
        </span>
      </button>
      {asset.can_delete && (
        <button
          onClick={onDelete}
          aria-label={t('common:action.delete')}
          className="absolute right-1 top-1 rounded bg-white/90 px-1.5 text-xs text-red-600 shadow-sm dark:bg-slate-900/90"
        >
          ✕
        </button>
      )}
    </li>
  );
}
