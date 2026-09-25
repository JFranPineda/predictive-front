/**
 * Where "← Atrás" goes.
 *
 * Inside the app it is the previous screen, filters and all (they live in the
 * URL). Opened in a new tab there is no previous screen, so it climbs the path
 * to the nearest screen the menu knows: /services/visits/4328 → /services.
 */

/** A first-level screen of the menu has nowhere to go back to. */
export function isTopLevel(pathname: string, menuRoutes: string[]): boolean {
  return pathname === '/' || menuRoutes.includes(stripTrailingSlash(pathname));
}

export function parentRoute(pathname: string, menuRoutes: string[]): string {
  const segments = stripTrailingSlash(pathname).split('/').filter(Boolean);
  for (let length = segments.length - 1; length > 0; length -= 1) {
    const candidate = `/${segments.slice(0, length).join('/')}`;
    if (menuRoutes.includes(candidate)) return candidate;
  }
  return '/';
}

function stripTrailingSlash(pathname: string): string {
  return pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
}
