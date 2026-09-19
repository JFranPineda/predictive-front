import { baseApi } from '@app/api/baseApi';

import type { EquipmentMediaPage, MediaAsset, MediaKind, MediaPage } from '../domain/types';

export const mediaApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    mediaFor: build.query<MediaAsset[], { owner_type: string; owner_id: number; kind?: MediaKind }>(
      {
        query: (params) => ({ url: 'media/', params }),
        // One visit holds a handful of images; the page is the whole answer.
        transformResponse: (response: MediaPage) => response.items,
        providesTags: ['Media'],
      },
    ),
    /**
     * A machine's whole history, one page at a time.
     *
     * Pages accumulate in the cache under a key that ignores the cursor, so
     * scrolling appends instead of refetching everything seen so far — the
     * difference between a gallery that stays usable at ten thousand images
     * and one that re-downloads them on every scroll.
     */
    equipmentMedia: build.query<
      EquipmentMediaPage,
      { equipmentId: number; kind?: MediaKind; visit?: number; cursor?: string }
    >({
      query: ({ equipmentId, ...params }) => ({
        url: `media/equipment/${equipmentId}/`,
        params,
      }),
      serializeQueryArgs: ({ queryArgs }) =>
        `${queryArgs.equipmentId}:${queryArgs.kind ?? 'all'}:${queryArgs.visit ?? 'all'}`,
      merge: (cache, incoming, { arg }) => {
        if (!arg.cursor) return incoming;
        cache.items.push(...incoming.items);
        cache.next_cursor = incoming.next_cursor;
      },
      forceRefetch: ({ currentArg, previousArg }) => currentArg?.cursor !== previousArg?.cursor,
      providesTags: ['Media'],
    }),
    uploadMedia: build.mutation<
      MediaAsset,
      { file: File; kind: MediaKind; owner_type: string; owner_id: number; caption?: string }
    >({
      query: ({ file, kind, owner_type, owner_id, caption }) => {
        const body = new FormData();
        body.append('file', file);
        body.append('kind', kind);
        body.append('owner_type', owner_type);
        body.append('owner_id', String(owner_id));
        if (caption) body.append('caption', caption);
        // No Content-Type header: the browser must set the multipart boundary.
        return { url: 'media/', method: 'POST', body };
      },
      invalidatesTags: ['Media'],
    }),
    captionMedia: build.mutation<MediaAsset, { id: number; caption: string }>({
      query: ({ id, caption }) => ({ url: `media/${id}/`, method: 'PATCH', body: { caption } }),
      invalidatesTags: ['Media'],
    }),
    deleteMedia: build.mutation<void, number>({
      query: (id) => ({ url: `media/${id}/`, method: 'DELETE' }),
      invalidatesTags: ['Media'],
    }),
  }),
});

export const {
  useMediaForQuery,
  useEquipmentMediaQuery,
  useUploadMediaMutation,
  useCaptionMediaMutation,
  useDeleteMediaMutation,
} = mediaApi;
