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
export type FramelineTier = 'viewer' | 'studio';

/** Every tier, in order: for a host that builds its own tier switch. */
export const TIERS: readonly FramelineTier[] = ['viewer', 'studio'];

/** Where the controls sit: over the picture, or in a dock below it. */
export type FramelineLayout = 'overlay' | 'dock';

/**
 * The layout for a tier. Viewer is the audience's player, so its controls overlay the picture. Studio is a tool,
 * where nothing may cover the picture, so it docks. A host can override either way; anything else is ignored.
 */
export function resolveLayout(tier: FramelineTier, layout?: unknown): FramelineLayout {
  if (layout === 'overlay' || layout === 'dock') return layout;
  return tier === 'viewer' ? 'overlay' : 'dock';
}

/** Every guide and crop mask id that `features.guides` accepts, in canonical order. */
export const GUIDE_IDS = ['title-safe', 'action-safe', 'thirds', 'center', '9:16', '4:5', '1:1', '2.39', '1.85'] as const;

/** The id of a guide or a crop mask. */
export type FramelineGuideId = (typeof GUIDE_IDS)[number];

/** Every feature the skin can show. `false` removes the feature and its code from rendering. */
export interface FramelineFeatureFlags {
  /** `HH:MM:SS:FF` time display with a frames/seconds toggle. */
  timecode: boolean;
  /** Step one frame back or forward, and jump ±N frames. */
  frameStep: boolean;
  /** The range: In and Out points, with handles on the timeline. A set range confines playback. */
  range: boolean;
  /** Loop the in-to-out range or the whole clip. */
  loop: boolean;
  /** Markers and range markers on the timeline. */
  markers: boolean;
  /** Previous and next cut, from markers or chapters. */
  cuts: boolean;
  /** Grab the current frame as a PNG. */
  grabFrame: boolean;
  /** Copy a link to the current frame. What is copied is the host's to decide: see the `linkUrl` prop. */
  copyLink: boolean;
  /** Guides and masks: `false`, or the list of guide ids the end user may switch on. */
  guides: false | readonly FramelineGuideId[];
  /** Approximate platform UI zones for Shorts, Reels and TikTok. */
  zones: boolean;
  /** Zoom the picture to 100% of the source's pixels and its multiples, and pan it. Never changes what a grabbed frame holds. */
  zoom: boolean;
}

/** What a host may pass: any subset of the flags. `guides: true` means every guide. */
export type FramelineFeatureOverrides = Partial<Omit<FramelineFeatureFlags, 'guides'>> & { guides?: boolean | readonly string[] };

const ALL_GUIDES: readonly FramelineGuideId[] = Object.freeze([...GUIDE_IDS]);

const OFF: FramelineFeatureFlags = {
  timecode: false,
  frameStep: false,
  range: false,
  loop: false,
  markers: false,
  cuts: false,
  grabFrame: false,
  copyLink: false,
  guides: false,
  zones: false,
  zoom: false,
};

const STUDIO: FramelineFeatureFlags = {
  ...OFF,
  timecode: true,
  frameStep: true,
  range: true,
  loop: true,
  markers: true,
  cuts: true,
  grabFrame: true,
  copyLink: true,
  guides: ALL_GUIDES,
  zones: true,
  zoom: true,
};

/** The default bundle of each tier. Internal: not part of the public entry. */
export const TIER_DEFAULTS: Readonly<Record<FramelineTier, Readonly<FramelineFeatureFlags>>> = Object.freeze({
  viewer: Object.freeze(OFF),
  studio: Object.freeze(STUDIO),
});

const FLAG_NAMES = Object.keys(OFF) as (keyof FramelineFeatureFlags)[];

export function isTier(value: unknown): value is FramelineTier {
  return typeof value === 'string' && (TIERS as readonly string[]).includes(value);
}

export function isGuideId(value: unknown): value is FramelineGuideId {
  return typeof value === 'string' && (GUIDE_IDS as readonly string[]).includes(value);
}

function resolveGuides(value: unknown, fallback: FramelineFeatureFlags['guides']): FramelineFeatureFlags['guides'] {
  if (value === false) return false;
  if (value === true) return ALL_GUIDES;
  if (!Array.isArray(value)) {
    warnOnce(`features.guides must be false, true or a list of guide ids; using the tier default.`);
    return fallback;
  }

  const known: FramelineGuideId[] = [];
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

const cache = new Map<string, Readonly<FramelineFeatureFlags>>();

/**
 * Resolves the feature flags for a tier with the host's overrides applied on top.
 *
 * - Overrides win over the tier defaults.
 * - Unknown flag names and unknown guide ids are ignored with one development warning each; nothing throws.
 * - The result is frozen and memoised: the same tier and equivalent overrides return the same object.
 */
export function resolveFeatures(tier: FramelineTier = 'viewer', overrides: FramelineFeatureOverrides = {}): Readonly<FramelineFeatureFlags> {
  let safeTier: FramelineTier = tier;
  if (!isTier(tier)) {
    warnOnce(`Unknown tier "${String(tier)}"; using "viewer".`);
    safeTier = 'viewer';
  }

  const defaults = TIER_DEFAULTS[safeTier];
  const resolved: FramelineFeatureFlags = { ...defaults };

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

/** True when at least one pro feature is on, which is when the pro code needs to load (the `debug` prop loads it too). */
export function hasProFeatures(features: Readonly<FramelineFeatureFlags>): boolean {
  return FLAG_NAMES.some((name) => features[name] !== false);
}
