import { describe, expect, it } from 'vitest';

import { isTopLevel, parentRoute } from '@app/navigation/backTarget';

const MENU = ['/assets', '/services', '/services/authorship', '/measurements', '/settings/users'];

describe('back button (V3-34)', () => {
  it('is not offered on a first-level screen', () => {
    expect(isTopLevel('/services', MENU)).toBe(true);
    expect(isTopLevel('/services/', MENU)).toBe(true);
    expect(isTopLevel('/services/visits/4328', MENU)).toBe(false);
  });

  it('climbs to the nearest screen the menu knows when there is no history', () => {
    expect(parentRoute('/services/visits/4328', MENU)).toBe('/services');
    expect(parentRoute('/measurements/47/trend', MENU)).toBe('/measurements');
    expect(parentRoute('/settings/users/12', MENU)).toBe('/settings/users');
  });

  it('falls back to the start when nothing matches', () => {
    expect(parentRoute('/nowhere/at/all', MENU)).toBe('/');
  });
});
