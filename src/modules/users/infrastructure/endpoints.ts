import { baseApi } from '@app/api/baseApi';

import type { CompanyUser, RoleCatalogue } from '../domain/roles';

export const usersApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    companyUsers: build.query<CompanyUser[], void>({
      query: () => 'users/',
      providesTags: ['User'],
    }),
    createUser: build.mutation<
      CompanyUser,
      {
        email: string;
        first_name?: string;
        last_name?: string;
        initials?: string;
        role: string;
        password: string;
      }
    >({
      query: (body) => ({ url: 'users/new/', method: 'POST', body }),
      invalidatesTags: ['User'],
    }),
    roles: build.query<RoleCatalogue, void>({
      query: () => 'roles/',
      providesTags: ['Role'],
    }),
    createRole: build.mutation<{ id: number }, { name: string; permissions: string[] }>({
      query: (body) => ({ url: 'roles/', method: 'POST', body }),
      invalidatesTags: ['Role'],
    }),
    updateRole: build.mutation<
      { id: number; permissions: string[] },
      { id: number; name?: string; permissions?: string[] }
    >({
      query: ({ id, ...body }) => ({ url: `roles/${id}/`, method: 'PATCH', body }),
      // A permission change rewrites what those users may do, so their shell
      // has to be rebuilt.
      invalidatesTags: ['Role', 'Bootstrap', 'User'],
    }),
    deleteRole: build.mutation<void, number>({
      query: (id) => ({ url: `roles/${id}/`, method: 'DELETE' }),
      invalidatesTags: ['Role'],
    }),
    removeUser: build.mutation<void, number>({
      query: (id) => ({ url: `users/${id}/`, method: 'DELETE' }),
      invalidatesTags: ['User'],
    }),
    updateUser: build.mutation<
      Partial<CompanyUser> & { id: number },
      {
        id: number;
        role?: string;
        is_active?: boolean;
        first_name?: string;
        last_name?: string;
        initials?: string;
        password?: string;
        area_restrictions?: number[];
      }
    >({
      query: ({ id, ...body }) => ({ url: `users/${id}/`, method: 'PATCH', body }),
      // A role change rewrites what that person may do, so the shell they see
      // has to be rebuilt too.
      invalidatesTags: ['User', 'Bootstrap'],
    }),
  }),
});

export const {
  useCompanyUsersQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useRemoveUserMutation,
  useRolesQuery,
  useCreateRoleMutation,
  useUpdateRoleMutation,
  useDeleteRoleMutation,
} = usersApi;
