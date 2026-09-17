import { baseApi } from '@app/api/baseApi';

import type { CompanyUser } from '../domain/roles';

export const usersApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    companyUsers: build.query<CompanyUser[], void>({
      query: () => 'users/',
      providesTags: ['User'],
    }),
    updateUser: build.mutation<
      Partial<CompanyUser> & { id: number },
      { id: number; role?: string; is_active?: boolean }
    >({
      query: ({ id, ...body }) => ({ url: `users/${id}/`, method: 'PATCH', body }),
      // A role change rewrites what that person may do, so the shell they see
      // has to be rebuilt too.
      invalidatesTags: ['User', 'Bootstrap'],
    }),
  }),
});

export const { useCompanyUsersQuery, useUpdateUserMutation } = usersApi;
