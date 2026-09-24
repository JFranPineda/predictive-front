import { baseApi } from '@app/api/baseApi';

import type { MenuEntry, ModuleSummary } from './sessionSlice';

export interface Bootstrap {
  user: { id: number; email: string; name: string; initials: string };
  company_id: number | null;
  companies: { id: number; name: string; role: string }[];
  permissions: string[];
  modules: ModuleSummary[];
  menu: MenuEntry[];
}

/**
 * One call builds the shell: identity, permissions, installed modules and the
 * menu they contribute. Installing a module invalidates this tag and the menu
 * rebuilds without a reload.
 */
export const sessionApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    bootstrap: build.query<Bootstrap, void>({
      query: () => 'session/bootstrap/',
      providesTags: ['Bootstrap'],
    }),
    login: build.mutation<{ access: string; refresh: string }, { email: string; password: string }>({
      query: (body) => ({ url: 'auth/login/', method: 'POST', body }),
    }),
    /** A field technician's personal code, instead of e-mail and password. */
    codeLogin: build.mutation<{ access: string; refresh: string }, { code: string }>({
      query: (body) => ({ url: 'auth/code-login/', method: 'POST', body }),
      invalidatesTags: ['Bootstrap'],
    }),
  }),
});

export const { useBootstrapQuery, useLoginMutation, useCodeLoginMutation } = sessionApi;
