import { baseApi } from '@app/api/baseApi';

import type { AuditPage } from '../domain/audit';
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
        shift?: string;
      }
    >({
      query: (body) => ({ url: 'users/new/', method: 'POST', body }),
      invalidatesTags: ['User'],
    }),
    roles: build.query<RoleCatalogue, void>({
      query: () => 'roles/',
      providesTags: ['Role'],
    }),
    createRole: build.mutation<
      { id: number },
      { name: string; permissions: string[]; base_role?: string; description?: string }
    >({
      query: (body) => ({ url: 'roles/', method: 'POST', body }),
      invalidatesTags: ['Role'],
    }),
    updateRole: build.mutation<
      { id: number; permissions: string[] },
      {
        id: number;
        name?: string;
        permissions?: string[];
        base_role?: string;
        description?: string;
      }
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
        shift?: string;
      }
    >({
      query: ({ id, ...body }) => ({ url: `users/${id}/`, method: 'PATCH', body }),
      // A role change rewrites what that person may do, so the shell they see
      // has to be rebuilt too.
      invalidatesTags: ['User', 'Bootstrap'],
    }),
    /** The plaintext is in this response and nowhere else, ever. */
    issueAccessCode: build.mutation<{ code: string; issued_at: string }, number>({
      query: (id) => ({ url: `users/${id}/access-code/`, method: 'POST' }),
      invalidatesTags: ['User'],
    }),
    revokeAccessCode: build.mutation<void, number>({
      query: (id) => ({ url: `users/${id}/access-code/`, method: 'DELETE' }),
      invalidatesTags: ['User'],
    }),
    auditLog: build.query<
      AuditPage,
      { action?: string; user?: number; before?: number }
    >({
      query: (params) => ({ url: 'audit/', params }),
      // Older pages append under one key, so scrolling never refetches.
      serializeQueryArgs: ({ queryArgs }) => `${queryArgs.action ?? ''}:${queryArgs.user ?? ''}`,
      merge: (cache, incoming, { arg }) => {
        if (!arg.before) return incoming;
        cache.items.push(...incoming.items);
        cache.next_before = incoming.next_before;
      },
      forceRefetch: ({ currentArg, previousArg }) => currentArg?.before !== previousArg?.before,
      providesTags: ['User'],
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
  useIssueAccessCodeMutation,
  useRevokeAccessCodeMutation,
  useAuditLogQuery,
} = usersApi;
