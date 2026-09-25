import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { formatDate } from '@app/i18n/format';
import { Button } from '@shared/ui/Button';
import { FormField, TextArea } from '@shared/ui/Form';
import { Modal } from '@shared/ui/Modal';

import type { MediaAsset } from '../domain/types';
import { useCaptionMediaMutation, useDeleteMediaMutation } from '../infrastructure/endpoints';
import { readMediaError } from './readMediaError';

/**
 * One image, opened: the only place its fields are edited.
 *
 * The grid shows thumbnails and nothing else, so a technician scanning forty
 * photos is not wading through forty text boxes. What may be changed — the
 * caption, or removing the file — is what the server said this user may do.
 */
export function MediaDetailModal({
  asset,
  confirmingDelete = false,
  onClose,
}: {
  asset: MediaAsset;
  confirmingDelete?: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation(['media', 'common']);
  const [caption, setCaption] = useState(asset.caption);
  const [confirming, setConfirming] = useState(confirmingDelete);
  const [error, setError] = useState<string | null>(null);
  const [saveCaption, saving] = useCaptionMediaMutation();
  const [remove, removing] = useDeleteMediaMutation();

  async function run(action: () => Promise<unknown>, onDone: () => void) {
    setError(null);
    try {
      await action();
      onDone();
    } catch (cause) {
      setError(readMediaError(cause) ?? t('detail.failed'));
    }
  }

  const isImage = asset.format !== 'document';
  const captionChanged = caption.trim() !== asset.caption;

  return (
    <Modal
      title={asset.caption || t(`kind.${asset.kind}`, { defaultValue: asset.kind })}
      description={t('detail.uploaded', { who: asset.uploaded_by || '—', when: formatDate(asset.created_at) })}
      onClose={onClose}
      footer={
        confirming ? (
          <>
            <span className="mr-auto self-center text-sm text-red-700">{t('detail.confirmDelete')}</span>
            <Button onClick={() => setConfirming(false)}>{t('common:action.cancel')}</Button>
            <Button
              variant="danger"
              disabled={removing.isLoading}
              onClick={() => void run(() => remove(asset.id).unwrap(), onClose)}
            >
              {t('common:action.delete')}
            </Button>
          </>
        ) : (
          <>
            {asset.can_delete && (
              <Button variant="danger" className="mr-auto" onClick={() => setConfirming(true)}>
                {t('common:action.delete')}
              </Button>
            )}
            <a
              href={asset.url}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-sky-700 hover:bg-slate-100 dark:text-sky-300 dark:hover:bg-slate-800"
            >
              {t('detail.openOriginal')}
            </a>
            {asset.can_edit && (
              <Button
                variant="primary"
                disabled={!captionChanged || saving.isLoading}
                onClick={() =>
                  void run(() => saveCaption({ id: asset.id, caption: caption.trim() }).unwrap(), onClose)
                }
              >
                {t('common:action.save')}
              </Button>
            )}
            <Button onClick={onClose}>{t('common:action.close')}</Button>
          </>
        )
      }
    >
      {error && <p className="rounded-lg bg-red-50 p-2 text-xs text-red-700">{error}</p>}

      {isImage ? (
        <img
          src={asset.url}
          alt={asset.caption || asset.kind}
          className="max-h-[50vh] w-full rounded-lg object-contain"
        />
      ) : (
        <p className="text-sm text-slate-500">{t('detail.document')}</p>
      )}

      {asset.can_edit ? (
        <FormField label={t('detail.caption')} hint={t('detail.captionHint')}>
          <TextArea
            rows={4}
            value={caption}
            maxLength={300}
            placeholder={t('captionPlaceholder')}
            onChange={(event) => setCaption(event.target.value)}
          />
        </FormField>
      ) : (
        <p className="whitespace-pre-line text-sm">{asset.caption || t('equipmentGallery.noCaption')}</p>
      )}
    </Modal>
  );
}
