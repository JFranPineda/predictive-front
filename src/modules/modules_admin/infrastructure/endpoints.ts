import { baseApi } from '@app/api/baseApi';

import type { ModuleSummary } from '@app/session/sessionSlice';

export const modulesApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    modules: build.query<ModuleSummary[], void>({
      query: () => 'modules/',
      providesTags: ['Module'],
    }),
    installModule: build.mutation<{ installed: string[] }, string>({
      query: (code) => ({ url: `modules/${code}/install/`, method: 'POST' }),
      // Installing changes the menu, so the shell must rebuild.
      invalidatesTags: ['Module', 'Bootstrap'],
    }),
    uninstallModule: build.mutation<{ uninstalled: string }, string>({
      query: (code) => ({ url: `modules/${code}/uninstall/`, method: 'POST' }),
      invalidatesTags: ['Module', 'Bootstrap'],
    }),
    upgradeModule: build.mutation<{ upgraded: string }, string>({
      query: (code) => ({ url: `modules/${code}/upgrade/`, method: 'POST' }),
      invalidatesTags: ['Module', 'Bootstrap'],
    }),
  }),
});

export const {
  useModulesQuery,
  useInstallModuleMutation,
  useUninstallModuleMutation,
  useUpgradeModuleMutation,
} = modulesApi;
