import { describe, expect, it } from 'vitest';

import { resolveFeatures } from './features';
import {
  activeCount,
  allowedView,
  DEFAULT_STORAGE_KEY,
  effectiveView,
  EMPTY_VIEW,
  hasViewMenu,
  parseStored,
  sanitizeView,
  serializeView,
  setCrop,
  setZones,
  storageKey,
  toggleGuide,
  toggleHidden,
  viewAttributes,
  viewMenuModel,
  type ViewState,
} from './view';

const ALL = allowedView(resolveFeatures('studio'));
const view = (patch: Partial<ViewState> = {}): ViewState => ({ ...EMPTY_VIEW, ...patch });

describe('allowedView', () => {
  it('allows everything in Studio and nothing in Viewer', () => {
    expect(ALL.guides).toEqual(['title-safe', 'action-safe', 'thirds', 'center']);
    expect(ALL.crops).toEqual(['2.39', '1.85', '1:1', '4:5', '9:16']);
    expect(ALL.zones).toEqual(['shorts', 'reels', 'tiktok']);
    expect(hasViewMenu(allowedView(resolveFeatures('viewer')))).toBe(false);
  });

  it('follows the host list and the zones flag', () => {
    const some = allowedView(resolveFeatures('studio', { guides: ['title-safe', '9:16'] }));
    expect(some).toEqual({ guides: ['title-safe'], crops: ['9:16'], zones: ['shorts', 'reels', 'tiktok'], zoom: true });
    expect(allowedView(resolveFeatures('studio', { zones: false })).zones).toEqual([]);
    expect(hasViewMenu(allowedView(resolveFeatures('studio', { guides: false })))).toBe(false);
    expect(hasViewMenu(allowedView(resolveFeatures('studio', { zoom: false })))).toBe(true);
  });

  it('offers zoom by its own flag, with or without guides', () => {
    expect(ALL.zoom).toBe(true);
    expect(allowedView(resolveFeatures('studio', { zoom: false })).zoom).toBe(false);
    expect(allowedView(resolveFeatures('viewer')).zoom).toBe(false);
    const zoomOnly = allowedView(resolveFeatures('studio', { guides: false }));
    expect(zoomOnly).toEqual({ guides: [], crops: [], zones: [], zoom: true });
    // Zoom has its own button: with no guides there is no Guides button.
    expect(hasViewMenu(zoomOnly)).toBe(false);
    expect(allowedView(resolveFeatures('viewer', { zoom: true })).zoom).toBe(true);
  });

  it('does not remember the zoom', () => {
    expect(serializeView(EMPTY_VIEW, 'timecode')).not.toContain('zoom');
  });
});

describe('the Guides menu model', () => {
  it('offers every section in Studio, with None first in the radio sections', () => {
    const sections = viewMenuModel(EMPTY_VIEW, ALL);
    expect(sections.map((section) => [section.id, section.kind, section.column])).toEqual([
      ['safe', 'checkbox', 'left'],
      ['composition', 'checkbox', 'left'],
      ['crop', 'radio', 'left'],
      ['zones', 'radio', 'right'],
    ]);
    expect(sections[2]!.items.map((item) => item.id)).toEqual(['none', '2.39', '1.85', '1:1', '4:5', '9:16']);
    expect(sections[3]!.items.map((item) => item.id)).toEqual(['none', 'shorts', 'reels', 'tiktok']);
  });

  it('removes what the host does not allow, and whole sections that are left empty', () => {
    const allowed = allowedView(resolveFeatures('studio', { guides: ['title-safe', '9:16'], zones: false }));
    const sections = viewMenuModel(EMPTY_VIEW, allowed);
    expect(sections.map((section) => section.id)).toEqual(['safe', 'crop']);
    expect(sections[0]!.items.map((item) => item.id)).toEqual(['title-safe']);
    expect(sections[1]!.items.map((item) => item.id)).toEqual(['none', '9:16']);
  });

  it('holds exactly one value in each radio section', () => {
    for (const state of [EMPTY_VIEW, view({ crop: '1:1' }), view({ crop: '9:16', zones: 'reels' })]) {
      for (const section of viewMenuModel(state, ALL).filter((item) => item.kind === 'radio')) {
        expect(section.items.filter((item) => item.checked)).toHaveLength(1);
      }
    }
    const zones = viewMenuModel(view({ crop: '9:16', zones: 'reels' }), ALL)[3]!;
    expect(zones.items.find((item) => item.checked)!.id).toBe('reels');
  });

  it('checks the guides that are on', () => {
    const safe = viewMenuModel(view({ guides: ['action-safe'] }), ALL)[0]!;
    expect(safe.items).toEqual([
      { id: 'title-safe', checked: false },
      { id: 'action-safe', checked: true },
    ]);
  });
});

describe('choosing', () => {
  it('toggles independent guides and keeps them in canonical order', () => {
    let state = toggleGuide(EMPTY_VIEW, 'center', ALL);
    state = toggleGuide(state, 'title-safe', ALL);
    expect(state.guides).toEqual(['title-safe', 'center']);
    expect(toggleGuide(state, 'center', ALL).guides).toEqual(['title-safe']);
    expect(toggleGuide(state, 'center', ALL, true)).toBe(state);
    expect(toggleGuide(state, 'nope', ALL)).toBe(state);
  });

  it('selecting a zone turns on the 9:16 crop', () => {
    expect(setZones(view({ crop: '1:1' }), 'tiktok', ALL)).toMatchObject({ zones: 'tiktok', crop: '9:16' });
  });

  it('picking another crop clears the zone; 9:16 keeps it', () => {
    const zoned = setZones(EMPTY_VIEW, 'shorts', ALL);
    expect(setCrop(zoned, '2.39', ALL)).toMatchObject({ crop: '2.39', zones: null });
    expect(setCrop(zoned, null, ALL)).toMatchObject({ crop: null, zones: null });
    expect(setCrop(zoned, '9:16', ALL)).toBe(zoned);
  });

  it('setting zones to none keeps a 9:16 crop the host offers, and drops one it does not', () => {
    expect(setZones(setZones(EMPTY_VIEW, 'reels', ALL), null, ALL)).toMatchObject({ zones: null, crop: '9:16' });
    const zonesOnly = allowedView(resolveFeatures('studio', { guides: ['thirds'] }));
    const zoned = setZones(EMPTY_VIEW, 'reels', zonesOnly);
    expect(zoned).toMatchObject({ zones: 'reels', crop: '9:16' });
    expect(setZones(zoned, null, zonesOnly)).toMatchObject({ zones: null, crop: null });
  });

  it('refuses what is not allowed', () => {
    const allowed = allowedView(resolveFeatures('studio', { guides: ['thirds'], zones: false }));
    expect(setCrop(EMPTY_VIEW, '1:1', allowed)).toBe(EMPTY_VIEW);
    expect(setZones(EMPTY_VIEW, 'tiktok', allowed)).toBe(EMPTY_VIEW);
    expect(toggleGuide(EMPTY_VIEW, 'title-safe', allowed)).toBe(EMPTY_VIEW);
  });

  it('hides everything and restores the same set', () => {
    const set = view({ guides: ['thirds'], crop: '9:16', zones: 'tiktok' });
    const hidden = toggleHidden(set);
    expect(effectiveView(hidden)).toEqual({ guides: [], crop: null, zones: null });
    expect(hidden).toMatchObject({ guides: ['thirds'], crop: '9:16', zones: 'tiktok', hidden: true });
    expect(toggleHidden(hidden)).toEqual(set);
    expect(toggleHidden(EMPTY_VIEW)).toBe(EMPTY_VIEW); // nothing to hide
  });

  it('shows the guides again when a choice is made while they are hidden', () => {
    const hidden = toggleHidden(view({ guides: ['thirds'] }));
    expect(toggleGuide(hidden, 'center', ALL)).toMatchObject({ guides: ['thirds', 'center'], hidden: false });
    expect(setCrop(hidden, '1:1', ALL).hidden).toBe(false);
  });
});

describe('badge count and attributes', () => {
  it('counts guides; a crop is one; a zone with its frame is one', () => {
    expect(activeCount(EMPTY_VIEW)).toBe(0);
    expect(activeCount(view({ guides: ['title-safe', 'thirds'] }))).toBe(2);
    expect(activeCount(view({ guides: ['title-safe', 'thirds'], crop: '2.39' }))).toBe(3);
    expect(activeCount(view({ crop: '9:16', zones: 'tiktok' }))).toBe(1);
    expect(activeCount(toggleHidden(view({ guides: ['thirds'], crop: '1:1' })))).toBe(0);
  });

  it('names the container attributes', () => {
    expect(viewAttributes(view({ guides: ['title-safe'], crop: '9:16', zones: 'tiktok' }))).toEqual({
      'data-guide-title-safe': '',
      'data-guide-9-16': '',
      'data-crop': '9-16',
      'data-zones': 'tiktok',
    });
    expect(viewAttributes(view({ crop: '2.39' }))).toEqual({ 'data-guide-2-39': '', 'data-crop': '2-39' });
    expect(viewAttributes(toggleHidden(view({ guides: ['thirds'] })))).toEqual({});
  });
});

describe('remembered choices', () => {
  it('round-trips a view and the time display', () => {
    const state = view({ guides: ['title-safe', 'center'], crop: '9:16', zones: 'reels' });
    expect(parseStored(serializeView(state, 'seconds'), ALL)).toEqual({ view: state, timeDisplay: 'seconds' });
  });

  it('reads the centre cross under its id from before API 0.1', () => {
    // The old id is spelled out on purpose: it is what a browser may still hold.
    const stored = JSON.stringify({ v: 1, guides: ['thirds', 'centre'], crop: null, zones: null, timeDisplay: 'timecode' });
    expect(parseStored(stored, ALL).view.guides).toEqual(['thirds', 'center']);
    expect(serializeView(parseStored(stored, ALL).view, 'timecode')).not.toContain('centre');
  });

  it('does not remember that the guides were hidden', () => {
    const stored = serializeView(toggleHidden(view({ guides: ['thirds'] })), 'timecode');
    expect(parseStored(stored, ALL).view).toMatchObject({ guides: ['thirds'], hidden: false });
  });

  it('returns an empty view for nothing, invalid JSON and wrong shapes, and never throws', () => {
    for (const raw of [null, undefined, '', '{', 'null', '[]', '"x"', '42', '{"guides":"title-safe"}', '{"guides":{"0":"thirds"}}']) {
      expect(() => parseStored(raw, ALL)).not.toThrow();
      expect(parseStored(raw, ALL)).toEqual({ view: EMPTY_VIEW, timeDisplay: null });
    }
  });

  it('drops unknown ids and wrong types field by field', () => {
    const raw = JSON.stringify({ guides: ['thirds', 'golden-ratio', 7, null], crop: '16:10', zones: 'vine', timeDisplay: 'frames' });
    expect(parseStored(raw, ALL)).toEqual({ view: view({ guides: ['thirds'] }), timeDisplay: null });
    expect(parseStored(JSON.stringify({ crop: 2.39, zones: ['tiktok'], timeDisplay: 'seconds' }), ALL)).toEqual({ view: EMPTY_VIEW, timeDisplay: 'seconds' });
  });

  it('lets the host win: ids the features do not allow are dropped', () => {
    const allowed = allowedView(resolveFeatures('studio', { guides: ['title-safe', '1:1'], zones: false }));
    const raw = serializeView(view({ guides: ['title-safe', 'thirds'], crop: '9:16', zones: 'tiktok' }), 'timecode');
    expect(parseStored(raw, allowed).view).toEqual(view({ guides: ['title-safe'] }));
    expect(parseStored(raw, allowedView(resolveFeatures('viewer'))).view).toBe(EMPTY_VIEW);
  });

  it('keeps a remembered zone with its 9:16 frame even when 9:16 is not offered as a crop', () => {
    const allowed = allowedView(resolveFeatures('studio', { guides: ['thirds'] }));
    const raw = JSON.stringify({ guides: [], crop: null, zones: 'shorts' });
    expect(parseStored(raw, allowed).view).toMatchObject({ zones: 'shorts', crop: '9:16' });
  });

  it('sanitizes a live view when the allowed set shrinks', () => {
    const state = view({ guides: ['title-safe', 'thirds'], crop: '9:16', zones: 'tiktok' });
    expect(sanitizeView(state, ALL)).toBe(state);
    expect(sanitizeView(state, allowedView(resolveFeatures('studio', { guides: ['thirds'], zones: false })))).toEqual(view({ guides: ['thirds'] }));
  });

  it('resolves the storage key from the persist prop', () => {
    expect(storageKey(undefined)).toBe(DEFAULT_STORAGE_KEY);
    expect(storageKey(true)).toBe(DEFAULT_STORAGE_KEY);
    expect(storageKey('my-app:player')).toBe('my-app:player');
    expect(storageKey('  ')).toBe(DEFAULT_STORAGE_KEY);
    expect(storageKey(false)).toBeNull();
  });
});
