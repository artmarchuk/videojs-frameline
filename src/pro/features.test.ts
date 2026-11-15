import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { resetWarnings } from './dev';
import { GUIDE_IDS, guideAttribute, hasProFeatures, resolveFeatures, type FeatureOverrides } from './features';

describe('resolveFeatures', () => {
  let warn: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    resetWarnings();
    warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => warn.mockRestore());

  it('gives Share no pro features', () => {
    const share = resolveFeatures('share');
    expect(Object.values(share).every((value) => value === false)).toBe(true);
    expect(hasProFeatures(share)).toBe(false);
  });

  it('gives Review the review bundle and Studio the inspection tools on top', () => {
    const review = resolveFeatures('review');
    expect(review).toMatchObject({ timecode: true, frameStep: true, inOut: true, loop: true, markers: true });
    expect(review).toMatchObject({ shotNav: true, grabFrame: true, copyTimecodeLink: true, platformZones: true });
    expect(review.posterFrame).toBe(true);
    expect(resolveFeatures('share').posterFrame).toBe(false);
    expect(resolveFeatures('studio').posterFrame).toBe(true);
    expect(resolveFeatures('review', { posterFrame: false }).posterFrame).toBe(false);
    expect(review).toMatchObject({ channels: false, gainGamma: false, zoom: false, infoHud: false, debug: false });
    expect(review.guides).toEqual([...GUIDE_IDS]);

    const studio = resolveFeatures('studio');
    expect(studio).toMatchObject({ timecode: true, channels: true, gainGamma: true, zoom: true, infoHud: true });
    expect(studio.debug).toBe(false);
  });

  it('lets overrides win over the tier', () => {
    expect(resolveFeatures('share', { timecode: true }).timecode).toBe(true);
    expect(resolveFeatures('studio', { zoom: false, grabFrame: false })).toMatchObject({ zoom: false, grabFrame: false });
    expect(hasProFeatures(resolveFeatures('share', { debug: true }))).toBe(true);
  });

  it('filters the guides list', () => {
    expect(resolveFeatures('review', { guides: ['9:16', 'title-safe'] }).guides).toEqual(['title-safe', '9:16']);
    expect(resolveFeatures('review', { guides: false }).guides).toBe(false);
    expect(resolveFeatures('share', { guides: true }).guides).toEqual([...GUIDE_IDS]);
    expect(resolveFeatures('review', { guides: ['nope', '1:1', '1:1'] }).guides).toEqual(['1:1']);
    expect(resolveFeatures('review', { guides: ['nope'] }).guides).toBe(false);
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('ignores unknown flags with one warning and never throws', () => {
    const overrides = { scopes: true, timecode: 'yes' } as unknown as FeatureOverrides;
    expect(() => resolveFeatures('review', overrides)).not.toThrow();
    const first = resolveFeatures('review', overrides);
    resolveFeatures('review', overrides);
    expect(first).toBe(resolveFeatures('review'));
    expect(warn).toHaveBeenCalledTimes(2); // one for "scopes", one for the non-boolean "timecode"; not repeated
    expect(resolveFeatures('nope' as never)).toBe(resolveFeatures('share'));
  });

  it('returns a frozen, memoised object', () => {
    const a = resolveFeatures('review', { guides: ['thirds', 'centre'], zoom: true });
    const b = resolveFeatures('review', { zoom: true, guides: ['centre', 'thirds'] });
    expect(a).toBe(b);
    expect(Object.isFrozen(a)).toBe(true);
    expect(Object.isFrozen(a.guides)).toBe(true);
    expect(resolveFeatures('review')).toBe(resolveFeatures('review', {}));
    expect(resolveFeatures('review')).not.toBe(resolveFeatures('studio'));
  });

  it('names data attributes for guides', () => {
    expect(guideAttribute('title-safe')).toBe('data-guide-title-safe');
    expect(guideAttribute('9:16')).toBe('data-guide-9-16');
    expect(guideAttribute('2.39')).toBe('data-guide-2-39');
  });
});
