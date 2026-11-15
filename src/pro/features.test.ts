import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { resetWarnings } from './dev';
import { GUIDE_IDS, hasProFeatures, resolveFeatures, resolveLayout, TIERS, isTier, type FeatureOverrides } from './features';

describe('resolveFeatures', () => {
  let warn: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    resetWarnings();
    warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => warn.mockRestore());

  it('gives Viewer no pro features', () => {
    const viewer = resolveFeatures('viewer');
    expect(Object.values(viewer).every((value) => value === false)).toBe(true);
    expect(hasProFeatures(viewer)).toBe(false);
    expect(resolveFeatures()).toBe(viewer);
  });

  it('gives Studio the full set', () => {
    const studio = resolveFeatures('studio');
    expect(studio).toMatchObject({ timecode: true, frameStep: true, inOut: true, loop: true, markers: true });
    expect(studio).toMatchObject({ shotNav: true, grabFrame: true, copyTimecodeLink: true });
    expect(studio).toMatchObject({ platformZones: true, channels: true, gainGamma: true, zoom: true, infoHud: true });
    expect(studio.debug).toBe(false);
    expect(studio.guides).toEqual([...GUIDE_IDS]);
    expect(studio.guides).toContain('1.85');
    expect(resolveFeatures('studio', { grabFrame: false }).grabFrame).toBe(false);
  });

  it('has two tiers only: the old names are not accepted', () => {
    expect(TIERS).toEqual(['viewer', 'studio']);
    expect(isTier('share')).toBe(false);
    expect(isTier('review')).toBe(false);
    expect(resolveFeatures('share' as never)).toBe(resolveFeatures('viewer'));
    expect(resolveFeatures('review' as never)).toBe(resolveFeatures('viewer'));
  });

  it('lets overrides win over the tier', () => {
    expect(resolveFeatures('viewer', { timecode: true }).timecode).toBe(true);
    expect(resolveFeatures('studio', { zoom: false, grabFrame: false })).toMatchObject({ zoom: false, grabFrame: false });
    expect(hasProFeatures(resolveFeatures('viewer', { debug: true }))).toBe(true);
  });

  it('filters the guides list', () => {
    expect(resolveFeatures('studio', { guides: ['9:16', 'title-safe'] }).guides).toEqual(['title-safe', '9:16']);
    expect(resolveFeatures('studio', { guides: false }).guides).toBe(false);
    expect(resolveFeatures('viewer', { guides: true }).guides).toEqual([...GUIDE_IDS]);
    expect(resolveFeatures('studio', { guides: ['nope', '1:1', '1:1'] }).guides).toEqual(['1:1']);
    expect(resolveFeatures('studio', { guides: ['nope'] }).guides).toBe(false);
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('ignores unknown flags with one warning and never throws', () => {
    const overrides = { scopes: true, timecode: 'yes' } as unknown as FeatureOverrides;
    expect(() => resolveFeatures('studio', overrides)).not.toThrow();
    const first = resolveFeatures('studio', overrides);
    resolveFeatures('studio', overrides);
    expect(first).toBe(resolveFeatures('studio'));
    expect(warn).toHaveBeenCalledTimes(2); // one for "scopes", one for the non-boolean "timecode"; not repeated
    expect(resolveFeatures('nope' as never)).toBe(resolveFeatures('viewer'));
  });

  it('returns a frozen, memoised object', () => {
    const a = resolveFeatures('studio', { guides: ['thirds', 'centre'], zoom: true });
    const b = resolveFeatures('studio', { zoom: true, guides: ['centre', 'thirds'] });
    expect(a).toBe(b);
    expect(Object.isFrozen(a)).toBe(true);
    expect(Object.isFrozen(a.guides)).toBe(true);
    expect(resolveFeatures('studio')).toBe(resolveFeatures('studio', {}));
    expect(resolveFeatures('studio')).not.toBe(resolveFeatures('viewer'));
  });
});

describe('resolveLayout', () => {
  it('defaults to overlay for Viewer and dock for Studio', () => {
    expect(resolveLayout('viewer')).toBe('overlay');
    expect(resolveLayout('studio')).toBe('dock');
  });

  it('lets the host override either way', () => {
    expect(resolveLayout('viewer', 'dock')).toBe('dock');
    expect(resolveLayout('studio', 'overlay')).toBe('overlay');
  });

  it('ignores anything that is not a layout', () => {
    expect(resolveLayout('studio', 'sidebar')).toBe('dock');
    expect(resolveLayout('viewer', null)).toBe('overlay');
  });
});
