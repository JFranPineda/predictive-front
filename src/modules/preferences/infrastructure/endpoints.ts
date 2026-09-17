import { baseApi } from '@app/api/baseApi';
import type { Language } from '@app/i18n/config';

export const preferencesApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    updateLanguage: build.mutation<{ language: Language }, Language>({
      query: (language) => ({ url: 'users/me/language/', method: 'PUT', body: { language } }),
      // Catalogue text arrives translated from the server, so everything
      // cached in the previous language is stale.
      invalidatesTags: ['Bootstrap', 'ConditionStatus', 'ThresholdSet', 'Summary', 'Equipment'],
    }),
  }),
});

export const { useUpdateLanguageMutation } = preferencesApi;
