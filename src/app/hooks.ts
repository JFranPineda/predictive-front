import { useDispatch, useSelector } from 'react-redux';

import type { AppDispatch, RootState } from './store';

export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();

export function usePermissions(): ReadonlySet<string> {
  return new Set(useAppSelector((state) => state.session.permissions));
}

/**
 * Whether the tenant has a module installed. A screen that borrows a piece of
 * another module — a gallery, a norma picker, a fault list — hides that piece
 * instead of calling an endpoint that answers 404 once the module is gone.
 */
export function useInstalled(code: string): boolean {
  return useAppSelector((state) => state.session.installed.includes(code));
}
