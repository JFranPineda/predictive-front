/**
 * The menu entry a page belongs to: the longest menu route that is the page's
 * path or a parent of it.
 *
 * Exact matching lit nothing on `/measurements/groups/122`, so the reader lost
 * where they were the moment they opened a trend. Plain prefix matching would
 * light both Activos and Estructura on `/assets/structure`; the longest prefix
 * is the one that means "this page lives here".
 */
export function activeMenuRoute(pathname: string, routes: string[]): string | null {
  let best: string | null = null;
  for (const route of routes) {
    const owns = pathname === route || pathname.startsWith(`${route}/`);
    if (owns && (best === null || route.length > best.length)) best = route;
  }
  return best;
}
