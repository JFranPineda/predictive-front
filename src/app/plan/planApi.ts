import { baseApi } from '@app/api/baseApi';

/** One resource of the plan: how much is used against the ceiling (V3-36). */
export interface PlanUsage {
  /** "equipment", "plants"… */
  resource: string;
  used: number;
  /** Null when the plan sets no ceiling. */
  allowed: number | null;
  near_limit: boolean;
}

/**
 * Plan usage lives in the app layer, not in the licensing module: the shell
 * warns the administrator on every screen, and the licence page draws the
 * bars — both from this one query.
 */
export const planApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    planUsage: build.query<{ resources: PlanUsage[] }, void>({
      query: () => 'license/usage/',
      providesTags: ['Equipment'],
    }),
  }),
});

export const { usePlanUsageQuery } = planApi;

export function usageRatio(row: PlanUsage): number {
  return row.allowed ? Math.min(row.used / row.allowed, 1) : 0;
}
