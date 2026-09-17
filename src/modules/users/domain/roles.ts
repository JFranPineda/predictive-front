/** The roles the backend accepts. Kept here so the picker cannot offer one
 * that the API will reject. */
export const ROLES = [
  'company_admin',
  'engineer',
  'planner',
  'technician',
  'external_inspector',
  'client_viewer',
] as const;

export type RoleCode = (typeof ROLES)[number];

export interface CompanyUser {
  id: number;
  email: string;
  full_name: string;
  initials: string;
  role: string;
  role_name: string;
  is_external: boolean;
  is_active: boolean;
  language: string;
  area_restrictions: (string | number)[];
}

export interface RolePermissions {
  id: number;
  code: string;
  name: string;
  is_system: boolean;
  member_count: number;
  permissions: string[];
}

export interface PermissionEntry {
  code: string;
  description: string;
  /** view / add / change / delete, or `other` for things like import. */
  action: string;
}

export interface RoleCatalogue {
  roles: RolePermissions[];
  modules: { code: string; permissions: PermissionEntry[] }[];
}

export const ACTION_ORDER = ['view', 'add', 'change', 'delete', 'other'] as const;
