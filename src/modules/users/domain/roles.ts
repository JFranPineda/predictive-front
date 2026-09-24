/**
 * Who may do what, in the terms of the plant's access matrix.
 *
 * A role has two halves. Its permissions say which screens and actions it can
 * reach; its base behaviour says how it stands towards field data — whether
 * it can write a visit at all, and whose. The matrix the customer drew (read
 * only / read + audit / read and write; corporate credential / personal code)
 * is a reading of that second half, so it is derived here rather than stored
 * twice and left to drift.
 */

/** The behaviours a role can be built on. Platform admin is not the
 *  customer's to hand out. */
export const BASE_ROLES = [
  'client_viewer',
  'planner',
  'technician',
  'external_inspector',
  'engineer',
  'company_admin',
] as const;

export type BaseRole = (typeof BASE_ROLES)[number];

export const SHIFTS = ['A', 'B', 'C'] as const;
export type Shift = (typeof SHIFTS)[number] | '';

export interface CompanyUser {
  id: number;
  email: string;
  full_name: string;
  initials: string;
  role: string;
  role_name: string;
  base_role: BaseRole;
  shift: Shift;
  has_access_code: boolean;
  access_code_set_at: string | null;
  is_external: boolean;
  is_active: boolean;
  language: string;
  /** Effective permission codes: what this person can actually do. */
  permissions: string[];
  area_restrictions: (string | number)[];
}

export interface RolePermissions {
  id: number;
  code: string;
  name: string;
  is_system: boolean;
  base_role: BaseRole;
  description: string;
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

export type AccessKind = 'read' | 'read_audit' | 'read_write' | 'admin';
export type Validation = 'corporate' | 'personal_code';

/** The behaviours that record field data sign in with a personal code. */
const FIELD: ReadonlySet<BaseRole> = new Set(['technician', 'external_inspector']);

export function isFieldRole(base: BaseRole): boolean {
  return FIELD.has(base);
}

/**
 * The "tipo de acceso" column of the matrix.
 *
 * Audit is a permission on top of a read-only behaviour, which is exactly what
 * the maintenance manager's row says: read only, plus audit.
 */
export function accessKindOf(base: BaseRole, permissions: string[]): AccessKind {
  if (base === 'company_admin' || base === 'engineer') return 'admin';
  if (FIELD.has(base)) return 'read_write';
  return permissions.includes('core.view_audit') ? 'read_audit' : 'read';
}

/** The "código / validación" column of the matrix. */
export function validationOf(base: BaseRole): Validation {
  return FIELD.has(base) ? 'personal_code' : 'corporate';
}

/**
 * The matrix reads top-down, from those who only watch to those who write:
 * Gerente, Subgerente, Jefe, Técnico. Sorting by name put the technician
 * between two managers.
 */
const BEHAVIOUR_RANK: Record<BaseRole, number> = {
  client_viewer: 0,
  planner: 1,
  technician: 2,
  external_inspector: 3,
  engineer: 4,
  company_admin: 5,
};

export function byMatrixOrder(a: RolePermissions, b: RolePermissions): number {
  // Hierarchy is not a permission count — the general manager holds fewer
  // than the deputy — so within a behaviour the name decides.
  return BEHAVIOUR_RANK[a.base_role] - BEHAVIOUR_RANK[b.base_role] || a.name.localeCompare(b.name);
}

/** Permission codes grouped by the module that declares them. */
export function groupByModule(
  codes: string[],
  catalogue: RoleCatalogue | undefined,
): { module: string; entries: PermissionEntry[] }[] {
  const owned = new Set(codes);
  return (catalogue?.modules ?? [])
    .map((module) => ({
      module: module.code,
      entries: module.permissions.filter((entry) => owned.has(entry.code)),
    }))
    .filter((group) => group.entries.length > 0);
}
