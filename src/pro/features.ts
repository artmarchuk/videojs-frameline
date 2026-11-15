/**
 * Feature flags and tier defaults. Pure: no React, no DOM.
 *
 * A developer picks a tier, then switches single features on or off:
 * `resolveFeatures('studio', { guides: ['title-safe', '9:16'], grabFrame: false })`.
 */
import { warnOnce } from './dev';

/**
 * The two tiers of the skin. Viewer is the clean player a creator's client or audience gets; Studio is the creator's
 * monitor with the full tool set. Anything in between is a tier plus feature flags.
 */
export type Tier = 'viewer' | 'studio';

export const TIERS: readonly Tier[] = ['viewer', 'studio'];

/** Where the controls sit: over the picture, or in a dock below it. */
export type Layout = 'overlay' | 'dock';

/**
 * The layout for a tier. Viewer is the audience's player, so its controls overlay the picture. Studio is a tool,
 * where nothing may cover the picture, so it docks. A host can override either way; anything else is ignored.
 */
export function resolveLayout(tier: Tier, layout?: unknown): Layout {
  if (layout === 'overlay' || layout === 'dock') return layout;
  return tier === 'viewer' ? 'overlay' : 'dock';
}

/** Guides and masks that can be drawn over the picture. */
export const GUIDE_IDS = ['title-safe', 'action-safe', 'thirds', 'centre', '9:16', '4:5', '1:1', '2.39', '1.85'] as const;

export type GuideId = (typeof GUIDE_IDS)[number];

/** Every feature the skin can show. `false` removes the feature and its code from rendering. */
export interface FeatureFlags {
  /** `HH:MM:SS:FF` time display with a frames/seconds toggle. */
  timecode: boolean;
  /** Step one frame back or forward, and jump ±N frames. */
  frameStep: boolean;
  /** In and out points. */
  inOut: boolean;
  /** Loop the in-to-out range or the whole clip. */
  loop: boolean;
  /** Markers and range markers on the timeline. */
  markers: boolean;
  /** Previous and next cut, from markers or chapters. */
  shotNav: boolean;
  /** Grab the current frame as a PNG. */
  grabFrame: boolean;
  /** Copy a link to the current timecode. */
  copyTimecodeLink: boolean;
  /** Use the current frame as the poster: fires an event; the host app saves it. */
  posterFrame: boolean;
  /** Guides and masks: `false`, or the list of guide ids the end user may switch on. */
  guides: false | readonly GuideId[];
  /** Approximate platform UI zones for Shorts, Reels and TikTok. */
  platformZones: boolean;
  /** Channel view: R, G, B, luma. */
  channels: boolean;
  /** Display gain and gamma (view only). */
  gainGamma: boolean;
  /** Zoom and pan, 100% pixel view. */
  zoom: boolean;
  /** Info HUD: file, resolution, fps. */
  infoHud: boolean;
  /** Debug readout. */
  debug: boolean;
}

/** What a host may pass: any subset of the flags. `guides: true` means every guide. */
export type FeatureOverrides = Partial<Omit<FeatureFlags, 'guides'>> & { guides?: boolean | readonly string[] };

const ALL_GUIDES: readonly GuideId[] = Object.freeze([...GUIDE_IDS]);

const OFF: FeatureFlags = {
  timecode: false,
  frameStep: false,
  inOut: false,
  loop: false,
  markers: false,
  shotNav: false,
  grabFrame: false,
  copyTimecodeLink: false,
  posterFrame: false,
  guides: false,
  platformZones: false,
  channels: false,
  gainGamma: false,
  zoom: false,
  infoHud: false,
  debug: false,
};

const STUDIO: FeatureFlags = {
  ...OFF,
  timecode: true,
  frameStep: true,
  inOut: true,
  loop: true,
  markers: true,
  shotNav: true,
  grabFrame: true,
  copyTimecodeLink: true,
  posterFrame: true,
  guides: ALL_GUIDES,
  platformZones: true,
  // No UI until step 7; on, so the tier's bundle is complete.
  channels: true,
  gainGamma: true,
  zoom: true,
  infoHud: true,
};

/** The default bundle of each tier. */
export const TIER_DEFAULTS: Readonly<Record<Tier, Readonly<FeatureFlags>>> = Object.freeze({
  viewer: Object.freeze(OFF),
  studio: Object.freeze(STUDIO),
});

const FLAG_NAMES = Object.keys(OFF) as (keyof FeatureFlags)[];

export function isTier(value: unknown): value is Tier {
  return typeof value === 'string' && (TIERS as readonly string[]).includes(value);
}

export function isGuideId(value: unknown): value is GuideId {
  return typeof value === 'string' && (GUIDE_IDS as readonly string[]).includes(value);
}

function resolveGuides(value: unknown, fallback: FeatureFlags['guides']): FeatureFlags['guides'] {
  if (value === false) return false;
  if (value === true) return ALL_GUIDES;
  if (!Array.isArray(value)) {
    warnOnce(`features.guides must be false, true or a list of guide ids; using the tier default.`);
    return fallback;
  }

  const known: GuideId[] = [];
  for (const id of value) {
    if (isGuideId(id)) {
      if (!known.includes(id)) known.push(id);
    } else {
      warnOnce(`Unknown guide id "${String(id)}" ignored. Valid ids: ${GUIDE_IDS.join(', ')}.`);
    }
  }
  // Keep the canonical order so the same set always resolves to the same list.
  const ordered = GUIDE_IDS.filter((id) => known.includes(id));
  return ordered.length ? Object.freeze(ordered) : false;
}

const cache = new Map<string, Readonly<FeatureFlags>>();

/**
 * Resolves the feature flags for a tier with the host's overrides applied on top.
 *
 * - Overrides win over the tier defaults.
 * - Unknown flag names and unknown guide ids are ignored with one development warning each; nothing throws.
 * - The result is frozen and memoised: the same tier and equivalent overrides return the same object.
 */
export function resolveFeatures(tier: Tier = 'viewer', overrides: FeatureOverrides = {}): Readonly<FeatureFlags> {
  let safeTier: Tier = tier;
  if (!isTier(tier)) {
    warnOnce(`Unknown tier "${String(tier)}"; using "viewer".`);
    safeTier = 'viewer';
  }

  const defaults = TIER_DEFAULTS[safeTier];
  const resolved: FeatureFlags = { ...defaults };

  for (const [name, value] of Object.entries(overrides ?? {})) {
    if (value === undefined) continue;

    if (!(FLAG_NAMES as string[]).includes(name)) {
      warnOnce(`Unknown feature "${name}" ignored. Valid features: ${FLAG_NAMES.join(', ')}.`);
      continue;
    }

    if (name === 'guides') {
      resolved.guides = resolveGuides(value, defaults.guides);
    } else if (typeof value === 'boolean') {
      (resolved as unknown as Record<string, boolean>)[name] = value;
    } else {
      warnOnce(`features.${name} must be a boolean; using the tier default.`);
    }
  }

  const key = `${safeTier}|${FLAG_NAMES.map((name) => {
    const value = resolved[name];
    return Array.isArray(value) ? value.join(',') : String(value);
  }).join('|')}`;

  const cached = cache.get(key);
  if (cached) return cached;

  const frozen = Object.freeze(resolved);
  cache.set(key, frozen);
  return frozen;
}

/** True when at least one pro feature is on, which is when the pro code needs to load. */
export function hasProFeatures(features: Readonly<FeatureFlags>): boolean {
  return FLAG_NAMES.some((name) => features[name] !== false);
}

/** `data-guide-*` attribute name for a guide id: `9:16` becomes `data-guide-9-16`, `2.39` becomes `data-guide-2-39`. */
export function guideAttribute(id: string): string {
  return `data-guide-${id.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`;
}
