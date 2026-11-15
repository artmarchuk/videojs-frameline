/**
 * The guides model (the Guides menu, once called View): which guides, crop mask and platform zones are on. Pure: no React, no DOM.
 *
 * Three layers decide what is drawn. The host's `features` say what may be offered (`AllowedView`); the end user picks
 * from that in the Guides menu (`ViewState`); and the choice is remembered per browser (`serializeView`, `parseStored`).
 * The host always wins: a remembered value the host no longer allows is dropped.
 */
import type { FeatureFlags } from './features';
import type { TimeDisplay } from './store';

/** Guides that are independent checkboxes. */
export const SAFE_IDS = ['title-safe', 'action-safe'] as const;
export const COMPOSITION_IDS = ['thirds', 'centre'] as const;
/** Crop masks, one at a time, in menu order. */
export const CROP_IDS = ['2.39', '1.85', '1:1', '4:5', '9:16'] as const;
/** Platform zone sets, one at a time. */
export const ZONE_IDS = ['shorts', 'reels', 'tiktok'] as const;

export type CropId = (typeof CROP_IDS)[number];
export type ZoneId = (typeof ZONE_IDS)[number];

/** The crop every platform zone is drawn in. */
export const ZONE_CROP: CropId = '9:16';

const CHECK_IDS: readonly string[] = [...SAFE_IDS, ...COMPOSITION_IDS];

export interface ViewState {
  /** Checkbox guides that are on, in canonical order. */
  guides: readonly string[];
  crop: CropId | null;
  zones: ZoneId | null;
  /** Everything is switched off for the moment (`Shift+V`); the set above is kept and comes back. */
  hidden: boolean;
}

export const EMPTY_VIEW: Readonly<ViewState> = Object.freeze({ guides: Object.freeze([]), crop: null, zones: null, hidden: false });

/** What the host lets the end user switch on. */
export interface AllowedView {
  guides: readonly string[];
  crops: readonly CropId[];
  zones: readonly ZoneId[];
  /** Zoom (Fit, 100%, 200%) is offered. It has nothing to do with the guides: it works with `guides: false` too. */
  zoom: boolean;
}

export const NOTHING_ALLOWED: Readonly<AllowedView> = Object.freeze({ guides: [], crops: [], zones: [], zoom: false });

/**
 * What the feature flags allow. `guides: false` allows nothing (and removes the Guides button). A list restricts the
 * checkbox guides and the crops to the ids in it. Platform zones need `platformZones` and some guides to be on; they
 * always bring the 9:16 crop with them, whether or not `9:16` is in the host's list.
 */
export function allowedView(features: Pick<FeatureFlags, 'guides' | 'platformZones'> & Partial<Pick<FeatureFlags, 'zoom'>>): AllowedView {
  const zoom = features.zoom === true;
  if (features.guides === false) return zoom ? { ...NOTHING_ALLOWED, zoom } : NOTHING_ALLOWED;
  const list = features.guides as readonly string[];
  return {
    guides: CHECK_IDS.filter((id) => list.includes(id)),
    crops: CROP_IDS.filter((id) => list.includes(id)),
    zones: features.platformZones ? [...ZONE_IDS] : [],
    zoom,
  };
}

const isCrop = (value: unknown): value is CropId => typeof value === 'string' && (CROP_IDS as readonly string[]).includes(value);
const isZone = (value: unknown): value is ZoneId => typeof value === 'string' && (ZONE_IDS as readonly string[]).includes(value);

const sameList = (a: readonly string[], b: readonly string[]) => a.length === b.length && a.every((id, i) => id === b[i]);

export function sameView(a: ViewState, b: ViewState): boolean {
  return a.crop === b.crop && a.zones === b.zones && a.hidden === b.hidden && sameList(a.guides, b.guides);
}

/** Drops everything the host does not allow. Returns the same object when nothing had to go. */
export function sanitizeView(view: ViewState, allowed: AllowedView): ViewState {
  const guides = CHECK_IDS.filter((id) => view.guides.includes(id) && allowed.guides.includes(id));
  const zones = view.zones && allowed.zones.includes(view.zones) ? view.zones : null;
  // A zone carries its 9:16 frame with it; any other crop has to be allowed in its own right.
  const crop = zones ? ZONE_CROP : view.crop && allowed.crops.includes(view.crop) ? view.crop : null;
  const next: ViewState = { guides, crop, zones, hidden: view.hidden && (guides.length > 0 || crop !== null) };
  return sameView(next, view) ? view : next;
}

/** Any choice made while the guides are hidden shows them again: the user is clearly looking at them. */
const shown = (view: ViewState): ViewState => (view.hidden ? { ...view, hidden: false } : view);

/** Switches one checkbox guide on or off (`on` omitted: toggles). */
export function toggleGuide(view: ViewState, id: string, allowed: AllowedView, on?: boolean): ViewState {
  const active = view.guides.includes(id);
  const next = on ?? !active;
  if (next === active) return view;
  if (next && !allowed.guides.includes(id)) return view;
  const guides = CHECK_IDS.filter((guide) => (guide === id ? next : view.guides.includes(guide)));
  return shown({ ...view, guides });
}

/** Picks a crop, or none. Platform zones live in the 9:16 frame, so any other choice clears them. */
export function setCrop(view: ViewState, crop: CropId | null, allowed: AllowedView): ViewState {
  if (crop !== null && !(allowed.crops.includes(crop) || (crop === ZONE_CROP && view.zones !== null))) return view;
  if (crop === view.crop) return view;
  return shown({ ...view, crop, zones: crop === ZONE_CROP ? view.zones : null });
}

/** Picks a platform, or none. Picking one turns on the 9:16 crop, the frame the zones are drawn in. */
export function setZones(view: ViewState, zones: ZoneId | null, allowed: AllowedView): ViewState {
  if (zones !== null && !allowed.zones.includes(zones)) return view;
  if (zones === view.zones) return view;
  if (zones === null) {
    // The 9:16 crop stays only if the host offers it as a crop of its own.
    return shown({ ...view, zones: null, crop: view.crop && allowed.crops.includes(view.crop) ? view.crop : null });
  }
  return shown({ ...view, zones, crop: ZONE_CROP });
}

/** `Shift+V` and the menu's footer: every guide off, and back again. Nothing to do when nothing is on. */
export function toggleHidden(view: ViewState): ViewState {
  if (!view.hidden && view.guides.length === 0 && view.crop === null) return view;
  return { ...view, hidden: !view.hidden };
}

/** What is actually drawn: the chosen set, or nothing while hidden. This is also what `onGuidesChange` reports. */
export interface EffectiveGuides {
  guides: string[];
  crop: string | null;
  zones: string | null;
}

export function effectiveView(view: ViewState): EffectiveGuides {
  if (view.hidden) return { guides: [], crop: null, zones: null };
  return { guides: [...view.guides], crop: view.crop, zones: view.zones };
}

export function sameEffective(a: EffectiveGuides, b: EffectiveGuides): boolean {
  return a.crop === b.crop && a.zones === b.zones && sameList(a.guides, b.guides);
}

/** The number on the Guides button: guides that are on. A crop counts as one; a zone and its 9:16 frame count as one. */
export function activeCount(view: ViewState): number {
  if (view.hidden) return 0;
  return view.guides.length + (view.zones !== null || view.crop !== null ? 1 : 0);
}

/** Attribute-safe form of an id: `9:16` becomes `9-16`, `2.39` becomes `2-39`. */
export const attributeValue = (id: string) => id.replace(/[^a-z0-9]+/gi, '-').toLowerCase();

/**
 * The attributes the player container carries: `data-guide-<id>` for every guide that is drawn (a crop included),
 * `data-crop` and `data-zones`.
 */
export function viewAttributes(view: ViewState): Record<string, string> {
  const { guides, crop, zones } = effectiveView(view);
  const attributes: Record<string, string> = {};
  for (const id of guides) attributes[`data-guide-${attributeValue(id)}`] = '';
  if (crop) {
    attributes[`data-guide-${attributeValue(crop)}`] = '';
    attributes['data-crop'] = attributeValue(crop);
  }
  if (zones) attributes['data-zones'] = zones;
  return attributes;
}

/* ---------- The Guides menu ---------- */

export interface ViewMenuItem {
  id: string;
  checked: boolean;
}

export interface ViewMenuSection {
  id: 'safe' | 'composition' | 'crop' | 'zones';
  kind: 'checkbox' | 'radio';
  /** Wide menus have two columns. */
  column: 'left' | 'right';
  /** For a radio section the first item is `none`. */
  items: ViewMenuItem[];
}

/**
 * The sections of the Guides menu for what the host allows. A section with nothing to offer is left out; a radio
 * section offers "none" plus the allowed values and has exactly one item checked.
 */
export function viewMenuModel(view: ViewState, allowed: AllowedView): ViewMenuSection[] {
  const sections: ViewMenuSection[] = [];
  const checks = (ids: readonly string[]) => ids.filter((id) => allowed.guides.includes(id)).map((id) => ({ id, checked: view.guides.includes(id) }));

  const safe = checks(SAFE_IDS);
  if (safe.length) sections.push({ id: 'safe', kind: 'checkbox', column: 'left', items: safe });
  const composition = checks(COMPOSITION_IDS);
  if (composition.length) sections.push({ id: 'composition', kind: 'checkbox', column: 'left', items: composition });

  if (allowed.crops.length) {
    const ids = ['none', ...allowed.crops];
    // A zone can hold the 9:16 crop on without the host offering it; then no listed crop matches and "none" is not it either.
    sections.push({ id: 'crop', kind: 'radio', column: 'left', items: ids.map((id) => ({ id, checked: (view.crop ?? 'none') === id })) });
  }
  if (allowed.zones.length) {
    const ids = ['none', ...allowed.zones];
    sections.push({ id: 'zones', kind: 'radio', column: 'right', items: ids.map((id) => ({ id, checked: (view.zones ?? 'none') === id })) });
  }
  return sections;
}

/** True when the Guides menu has anything to show, which is when the Guides button is rendered. Zoom has its own button. */
export function hasViewMenu(allowed: AllowedView): boolean {
  return allowed.guides.length > 0 || allowed.crops.length > 0 || allowed.zones.length > 0;
}

/* ---------- Remembered choices ---------- */

export const DEFAULT_STORAGE_KEY = 'videojs-pro:v1';

/** The storage key for a `persist` prop: `true` or nothing is the default key, a string is that key, `false` is none. */
export function storageKey(persist: boolean | string | undefined): string | null {
  if (persist === false) return null;
  if (typeof persist === 'string') return persist.trim() || DEFAULT_STORAGE_KEY;
  return DEFAULT_STORAGE_KEY;
}

export interface Remembered {
  view: ViewState;
  timeDisplay: TimeDisplay | null;
}

/** What is written: the guides, the crop, the zone and the time display. Not the range, the loop, the playhead or the zoom. */
export function serializeView(view: ViewState, timeDisplay: TimeDisplay): string {
  return JSON.stringify({ v: 1, guides: [...view.guides], crop: view.crop, zones: view.zones, timeDisplay });
}

/**
 * Reads a stored value back. Storage can hold anything (an older version, another app's data, a hand edit), so
 * every field is checked: invalid JSON, wrong types, unknown ids and ids the host does not allow are dropped
 * silently. It never throws, and with nothing usable it returns an empty view.
 */
export function parseStored(raw: string | null | undefined, allowed: AllowedView): Remembered {
  const empty: Remembered = { view: EMPTY_VIEW, timeDisplay: null };
  if (typeof raw !== 'string' || raw === '') return empty;

  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return empty;
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) return empty;
  const record = data as Record<string, unknown>;

  const guides = Array.isArray(record.guides) ? CHECK_IDS.filter((id) => (record.guides as unknown[]).includes(id)) : [];
  const view = sanitizeView({ guides, crop: isCrop(record.crop) ? record.crop : null, zones: isZone(record.zones) ? record.zones : null, hidden: false }, allowed);
  const timeDisplay = record.timeDisplay === 'timecode' || record.timeDisplay === 'seconds' ? record.timeDisplay : null;
  return { view: sameView(view, EMPTY_VIEW) ? EMPTY_VIEW : view, timeDisplay };
}

/** Reads the remembered choices. Storage can be blocked, full or empty; the skin works the same without it. */
export function readRemembered(key: string | null, allowed: AllowedView): Remembered {
  if (!key) return { view: EMPTY_VIEW, timeDisplay: null };
  try {
    return parseStored(globalThis.localStorage?.getItem(key), allowed);
  } catch {
    return { view: EMPTY_VIEW, timeDisplay: null };
  }
}

export function writeRemembered(key: string | null, view: ViewState, timeDisplay: TimeDisplay): void {
  if (!key) return;
  try {
    globalThis.localStorage?.setItem(key, serializeView(view, timeDisplay));
  } catch {
    // Blocked or full: nothing depends on it.
  }
}
