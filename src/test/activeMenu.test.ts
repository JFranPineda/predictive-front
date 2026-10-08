import { describe, expect, it } from 'vitest';

import { activeMenuRoute } from '@app/layout/activeMenu';

const ROUTES = ['/assets', '/assets/structure', '/measurements', '/services', '/services/authorship', '/reports/mpd'];

describe('the menu entry a page belongs to', () => {
  it('stays lit inside the pages of an entry', () => {
    expect(activeMenuRoute('/measurements/groups/122', ROUTES)).toBe('/measurements');
    expect(activeMenuRoute('/services/visits/12/capture', ROUTES)).toBe('/services');
  });

  it('prefers the longest route that owns the page', () => {
    expect(activeMenuRoute('/assets/structure', ROUTES)).toBe('/assets/structure');
    expect(activeMenuRoute('/assets/226/media', ROUTES)).toBe('/assets');
    expect(activeMenuRoute('/services/authorship', ROUTES)).toBe('/services/authorship');
  });

  it('never matches half a segment', () => {
    expect(activeMenuRoute('/assetsx', ROUTES)).toBeNull();
    expect(activeMenuRoute('/reports', ROUTES)).toBeNull();
  });
});
