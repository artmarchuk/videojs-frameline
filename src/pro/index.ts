// Public entry point of Frameline. Importing from here pulls in the Viewer skin only; pro code loads on demand.
export { FramelineSkin } from './frameline-skin';
export type { Density, FramelineSkinProps, FramelineSkinSlots } from './frameline-skin';
export { GUIDE_IDS, TIER_DEFAULTS, TIERS, resolveFeatures, resolveLayout } from './features';
export type { FeatureFlags, FeatureOverrides, GuideId, Layout, Tier } from './features';
export type { FramelineApi, FramelineGuidesInput } from './api';
export type { CopyLinkInfo, FrameGrabInfo } from './studio/controller';
export type { CropId, EffectiveGuides, ZoneId } from './view';
export type { ZoomLevel } from './zoom';
export type {
  FrameClockPrecision,
  FrameClockSource,
  FrameInfo,
  InOutRange,
  LoopMode,
  Marker,
  TimeDisplay,
} from './store';
