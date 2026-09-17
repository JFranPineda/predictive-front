import { baseApi } from '@app/api/baseApi';

import type { MediaAsset, MediaKind } from '../domain/types';

export const mediaApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    mediaFor: build.query<MediaAsset[], { owner_type: string; owner_id: number; kind?: MediaKind }>(
      {
        query: (params) => ({ url: 'media/', params }),
        providesTags: ['Media'],
      },
    ),
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
  useUploadMediaMutation,
  useCaptionMediaMutation,
  useDeleteMediaMutation,
} = mediaApi;
