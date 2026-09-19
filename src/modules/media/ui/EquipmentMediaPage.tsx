import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';

import { Button } from '@shared/ui/Button';
import { EmptyState } from '@shared/ui/EmptyState';
import { Page } from '@shared/ui/Page';
import { PageHeader } from '@shared/ui/PageHeader';
import { Spinner } from '@shared/ui/Spinner';

import type { MediaAsset, MediaKind, MediaVisitRef } from '../domain/types';
import { useEquipmentMediaQuery } from '../infrastructure/endpoints';

const KINDS: MediaKind[] = [
  'photo',
  'spectrum_image',
  'thermogram',
  'ultrasound_capture',
  'document',
];

/**
 * Everything one machine has ever produced, newest first.
 *
 * Three things keep this fast when a gearbox has ten thousand images, and all
 * three matter: the server pages by cursor so page ninety costs what page one
 * costs, the browser only decodes a tile once it is near the viewport, and
 * every tile reserves its height up front so appending a page never reflows
 * what is already on screen.
 */
export default function EquipmentMediaPage() {
  const { equipmentId } = useParams();
  const id = Number(equipmentId);
  const { t, i18n } = useTranslation(['media', 'common']);
  const [kind, setKind] = useState<MediaKind | undefined>();
  const [cursor, setCursor] = useState<string | undefined>();
  const [opened, setOpened] = useState<MediaAsset | null>(null);

  const { data, isFetching } = useEquipmentMediaQuery({ equipmentId: id, kind, cursor });
  const sentinel = useRef<HTMLDivElement>(null);

  // A new filter is a new list; keeping the old cursor would page into it.
  const pick = useCallback((next?: MediaKind) => {
    setKind(next);
    setCursor(undefined);
  }, []);

  const next = data?.next_cursor ?? null;
  useEffect(() => {
    const node = sentinel.current;
    if (!node || !next || isFetching) return undefined;
    const observer = new IntersectionObserver(
      (entries) => entries[0]?.isIntersecting && setCursor(next),
      { rootMargin: '600px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [next, isFetching]);

  const formatter = useMemo(
    () => new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium' }),
    [i18n.language],
  );

  const counts = data?.counts ?? {};
  const total = Object.values(counts).reduce((sum, value) => sum + (value ?? 0), 0);

  return (
    <Page>
      <PageHeader title={t('equipmentGallery.title')} description={t('equipmentGallery.hint')} />

      <div className="flex flex-wrap gap-2">
        <Chip active={!kind} label={t('equipmentGallery.all')} count={total} onClick={() => pick()} />
        {KINDS.filter((row) => counts[row]).map((row) => (
          <Chip
            key={row}
            active={kind === row}
            label={t(`kind.${row}`, { defaultValue: row })}
            count={counts[row] ?? 0}
            onClick={() => pick(row)}
          />
        ))}
      </div>

      {data && data.items.length === 0 && !isFetching ? (
        <EmptyState title={t('equipmentGallery.empty')} body={t('equipmentGallery.emptyHint')} />
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
          {(data?.items ?? []).map((asset) => (
            <Tile
              key={asset.id}
              asset={asset}
              visit={asset.visit}
              formatter={formatter}
              onOpen={() => setOpened(asset)}
            />
          ))}
        </ul>
      )}

      <div ref={sentinel} className="h-8" />
      {isFetching && <Spinner label={t('equipmentGallery.loading')} />}
      {!isFetching && next && (
        <Button onClick={() => setCursor(next)}>{t('equipmentGallery.more')}</Button>
      )}

      {opened && <Lightbox asset={opened} onClose={() => setOpened(null)} />}
    </Page>
  );
}

function Chip({
  active,
  label,
  count,
  onClick,
}: {
  active: boolean;
  label: string;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-xs ${
        active
          ? 'border-cyan-500 bg-cyan-50 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-200'
          : 'border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300'
      }`}
    >
      {label} <span className="text-slate-400">{count}</span>
    </button>
  );
}

function Tile({
  asset,
  visit,
  formatter,
  onOpen,
}: {
  asset: MediaAsset;
  visit?: MediaVisitRef;
  formatter: Intl.DateTimeFormat;
  onOpen: () => void;
}) {
  return (
    <li
      // Off-screen tiles are not laid out or painted, and the reserved height
      // stops the grid jumping as pages append.
      className="[content-visibility:auto] [contain-intrinsic-size:220px]"
    >
      <button onClick={onOpen} className="w-full text-left">
        {asset.thumb_url ? (
          <img
            src={asset.thumb_url}
            alt={asset.caption || asset.kind}
            loading="lazy"
            decoding="async"
            width={asset.width ?? undefined}
            height={asset.height ?? undefined}
            className="aspect-4/3 w-full rounded-lg border border-slate-200 object-cover dark:border-slate-700"
          />
        ) : (
          <span className="flex aspect-4/3 w-full items-center justify-center rounded-lg border border-dashed border-slate-300 text-xs uppercase text-slate-400 dark:border-slate-700">
            {asset.format}
          </span>
        )}
        <span className="mt-1 block truncate text-xs text-slate-500">
          {visit ? formatter.format(new Date(visit.visited_at)) : ''}
          {visit?.order_code ? ` · ${visit.order_code}` : ''}
        </span>
        {asset.caption && (
          <span className="block truncate text-xs text-slate-400">{asset.caption}</span>
        )}
      </button>
    </li>
  );
}

/** The original is only ever downloaded here, never in the grid. */
function Lightbox({ asset, onClose }: { asset: MediaAsset; onClose: () => void }) {
  const { t } = useTranslation(['media', 'common']);
  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6"
    >
      <figure className="max-h-full max-w-4xl overflow-auto" onClick={(e) => e.stopPropagation()}>
        <img src={asset.url} alt={asset.caption} className="max-h-[80vh] w-auto rounded-lg" />
        <figcaption className="mt-2 text-sm text-slate-200">
          {asset.caption || t('equipmentGallery.noCaption')}
        </figcaption>
        <Button onClick={onClose}>{t('common:action.close')}</Button>
      </figure>
    </div>
  );
}
