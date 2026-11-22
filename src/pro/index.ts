/**
 * The public entry point of Frameline: everything a host may import. Importing from here pulls in the Viewer skin
 * only; the pro code loads on demand. Anything not exported here is internal and can change without notice.
 */
export { FramelineSkin } from './frameline-skin';
export type { FramelineDensity, FramelineSkinProps, FramelineSkinSlots } from './frameline-skin';
export { GUIDE_IDS, TIERS } from './features';
export type { FramelineFeatureFlags, FramelineFeatureOverrides, FramelineGuideId, FramelineLayout, FramelineTier } from './features';
export type { FramelineApi, FramelineGuidesInput, FramelineLinkPosition, FramelineLinkUrl } from './api';
export type { FramelineCopyLinkInfo, FramelineFrameGrabInfo } from './studio/controller';
export type { FramelineCropId, FramelineEffectiveGuides, FramelineZoneId } from './view';
export type { FramelineZoomLevel } from './zoom';
export type {
  FramelineFrameClockPrecision,
  FramelineFrameClockSource,
  FramelineFrameInfo,
  FramelineLoopMode,
  FramelineMarker,
  FramelineRange,
  FramelineTimeDisplay,
} from './store';
