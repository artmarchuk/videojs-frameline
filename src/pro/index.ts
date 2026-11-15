// Public entry point of Video.js PRO. Importing from here pulls in the Viewer skin only; pro code loads on demand.
export { ProSkin } from './pro-skin';
export type { Density, ProSkinProps, ProSkinSlots } from './pro-skin';
export { GUIDE_IDS, TIER_DEFAULTS, TIERS, resolveFeatures, resolveLayout } from './features';
export type { FeatureFlags, FeatureOverrides, GuideId, Layout, Tier } from './features';
export type { CopyLinkInfo } from './studio/controller';
export type { CropId, EffectiveView, ZoneId } from './view';
export type {
  Channel,
  FrameClockPrecision,
  FrameClockSource,
  FrameInfo,
  InOutRange,
  Inspection,
  LoopMode,
  Marker,
  TimeDisplay,
  Zoom,
} from './store';
