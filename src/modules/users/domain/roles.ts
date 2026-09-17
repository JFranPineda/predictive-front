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
