import type { LicenseStatusCode } from './status';

const RED = 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300';
const AMBER = 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300';

// Amber reads but does not write; red does not let the customer work at all.
export const STATUS_TONE: Record<LicenseStatusCode, string> = {
  active: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
  grace: AMBER,
  other_installation: AMBER,
  clock_behind: AMBER,
  expired: RED,
  revoked: RED,
  suspended: RED,
  invalid: RED,
};
