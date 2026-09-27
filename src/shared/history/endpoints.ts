import { baseApi } from '@app/api/baseApi';

/** One archived month of a log, as it sits on disk. */
export interface HistoryFile {
  period: string;
  path: string;
  rows: number;
  size: number;
  last_at: string | null;
}

export interface HistorySource {
  code: string;
  label: string;
  /** The folder on the server, shown so anyone can find it without the app. */
  folder: string;
  files: HistoryFile[];
}

export interface HistoryListing {
  window_days: number;
  sources: HistorySource[];
}

// Core is always installed, so this endpoint is always there — which is why
// it lives beside the two screens that read it instead of inside a module.
export const historyApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    history: build.query<HistoryListing, string | void>({
      query: (source) => ({ url: 'history/', params: source ? { source } : undefined }),
      providesTags: ['History'],
    }),
    archiveHistory: build.mutation<unknown, void>({
      query: () => ({ url: 'history/', method: 'POST' }),
      invalidatesTags: ['History', 'Activity', 'User'],
    }),
  }),
});

export const { useHistoryQuery, useArchiveHistoryMutation } = historyApi;
