/** Every status `GET license/status/` can answer (backend `LicenseStatus`). */
export const LICENSE_STATUSES = [
  'active',
  'grace',
  'expired',
  'revoked',
  'suspended',
  'invalid',
  // v4 Phase 2: both read-only, never blocked.
  'other_installation',
  'clock_behind',
] as const;

export type LicenseStatusCode = (typeof LICENSE_STATUSES)[number];
