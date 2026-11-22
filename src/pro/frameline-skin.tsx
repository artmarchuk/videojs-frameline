/** @jsxImportSource react */

'use client';

import { lazy, Suspense, useCallback, useMemo, useRef, useState, type ReactNode, type Ref } from 'react';

import { VideoSkin, type VideoSkinProps } from '../video/skin';
import type { FramelineApi, FramelineLinkUrl } from './api';
import { warnOnce } from './dev';
import {
  hasProFeatures,
  isTier,
  resolveFeatures,
  resolveLayout,
  type FramelineFeatureOverrides,
  type FramelineLayout,
  type FramelineTier,
} from './features';
import type { FramelineCopyLinkInfo, FramelineFrameGrabInfo } from './studio/controller';
import type { FramelineFrameInfo, FramelineRange, FramelineMarker } from './store';
import type { FramelineEffectiveGuides } from './view';
import type { FramelineZoomLevel } from './zoom';
import { DEFAULT_FPS, isValidFps } from './fps';

// The pro runtime (store, frame clock, the Studio layer) is a separate chunk. The Viewer tier never requests it.
const ProRuntime = lazy(() => import('./runtime'));

/** Spacing of the controls. */
export type FramelineDensity = 'comfortable' | 'compact';

/** Places where a host app can add its own UI. A slot whose area is not rendered is ignored. */
export interface FramelineSkinSlots {
  /** In the control bar, after the play and volume controls. */
  toolbarStart?: ReactNode;
  /** In the control bar, before the captions button. */
  toolbarEnd?: ReactNode;
  /** In the overlay layer over the picture. That layer is `aria-hidden` and ignores the pointer: visuals only. */
  overlay?: ReactNode;
}

type InternalSkinProps =
  | 'children'
  | 'toolbarStart'
  | 'toolbarEnd'
  | 'overlay'
  | 'extras'
  | 'proBar'
  | 'pictureWrapper'
  | 'layout'
  | 'arrowSeekWhilePlayingOnly';

/** The props of `FramelineSkin`. Beyond these it takes the Video.js container's own props (`className`, `style`, …). */
export interface FramelineSkinProps extends Omit<VideoSkinProps, InternalSkinProps> {
  /**
   * Which bundle of features to start from. `'viewer'` (default): the clean player a creator's client or audience
   * gets, with no pro code loaded. `'studio'`: the creator's monitor, with the full set.
   */
  tier?: FramelineTier;
  /** Single features switched on or off on top of the tier, for example `{ grabFrame: false, guides: ['9:16'] }`. */
  features?: FramelineFeatureOverrides;
  /**
   * Frames per second of the source. The video element does not expose it, so frame numbers and timecode depend on
   * this being right. Pass `29.97` or `30000 / 1001` for NTSC rates. Default 24.
   */
  fps?: number;
  /** Timecode of the first frame, for example `'01:00:00:00'`. Default `'00:00:00:00'`. */
  startTimecode?: string;
  /** Count in drop-frame timecode. Only meaningful for 29.97 and 59.94; ignored for other rates. */
  dropFrame?: boolean;
  /**
   * Markers for the timeline: the host's data. The skin shows them as pins, lists them in the Markers menu and
   * reports clicks; it never creates or stores them. Times in seconds; `end` adds a line to that time.
   */
  markers?: FramelineMarker[];
  /**
   * `'dock'` puts the controls in a panel below the picture, where they never cover it (also in fullscreen) and never
   * hide; `'overlay'` puts them over the picture. Default: `'overlay'` for Viewer, `'dock'` for Studio.
   * In the dock layout the aspect ratio applies to the picture's stage, and the component's height is stage plus dock.
   */
  layout?: FramelineLayout;
  /**
   * What Copy link copies. Not given: the page's URL with the position in its hash (`#t=<seconds>&tc=<timecode>`),
   * beside the page's other hash keys. A string: that URL as the base, resolved against the page, with the position
   * in its hash. A function: called with the position (`FramelineLinkPosition`) when the user copies; it returns
   * the full URL to copy, or `null` when the host handled the action itself, and then the skin copies nothing,
   * announces nothing and does not fire `onCopyLink`. The function must be synchronous: a clipboard write has to
   * happen within the user's gesture, and Safari refuses one that arrives after an `await`.
   */
  linkUrl?: FramelineLinkUrl;
  /** Spacing of the controls. Touch devices always get `'comfortable'` with 44 px targets. */
  density?: FramelineDensity;
  /** Show the debug readout. Also switched on by `?debug` in the page URL. */
  debug?: boolean;
  /** Host UI placed inside the skin. */
  slots?: FramelineSkinSlots;
  /** Fires when the In or Out point changes. Times in seconds; `null` when a point is not set. */
  onRangeChange?: (range: FramelineRange) => void;
  /** Fires when the user selects a marker. */
  onMarkerSelect?: (marker: FramelineMarker) => void;
  /** Fires when the current frame number changes. Best effort: see the README on frame accuracy. */
  onFrameChange?: (frame: FramelineFrameInfo) => void;
  /**
   * Fires after the skin itself copied a link to the current frame: `{ url, frame, time, timecode }`. Not fired when
   * the clipboard refused, or when a `linkUrl` function returned `null`.
   */
  onCopyLink?: (info: FramelineCopyLinkInfo) => void;
  /**
   * Fires when the guides that are drawn change: `guides` (ids), `crop` and `zones` (an id or `null`). Not fired for
   * the remembered set the player starts with.
   */
  onGuidesChange?: (view: FramelineEffectiveGuides) => void;
  /** Fires when the zoom level changes: `'fit'`, `'100'`, `'150'`, `'200'` or `'400'`. */
  onZoomChange?: (level: FramelineZoomLevel) => void;
  /** Fires after a frame was grabbed: downloaded as a PNG (`target: 'file'`) or copied as an image (`'clipboard'`). */
  onFrameGrab?: (info: FramelineFrameGrabInfo) => void;
  /**
   * A handle for driving the Studio tools from the host's own UI: seek, step, set the range, the guides and the zoom,
   * grab a frame. `null` in the Viewer tier and until the pro code has loaded. See `FramelineApi`.
   */
  apiRef?: Ref<FramelineApi>;
  /**
   * Remember the end user's Guides choices (guides, crop, zones) and the time display in this browser's
   * `localStorage`. `true` (default) uses the key `frameline:v1`, a string uses that key, `false` turns it off.
   * The `features` always win over a remembered value.
   */
  persist?: boolean | string;
  /** The media element, as in the Viewer skin: for example `<MuxVideo src="…" />`. */
  children: ReactNode;
}

function debugInUrl(): boolean {
  return typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('debug');
}

/**
 * Frameline: a player skin for video creators' tools.
 *
 * `FramelineSkin` is the public entry point. It wraps the Viewer skin and adds what the chosen tier and feature flags ask
 * for. With `tier="viewer"` and no flags it is exactly the Viewer skin and loads no pro code.
 *
 * @example
 * <VideoPlayer>
 *   <FramelineSkin tier="studio" fps={24} onRangeChange={saveRange}>
 *     <MuxVideo src="https://stream.mux.com/…" playsInline crossOrigin="" />
 *   </FramelineSkin>
 * </VideoPlayer>
 */
export function FramelineSkin({
  tier = 'viewer',
  features: overrides,
  fps = DEFAULT_FPS,
  startTimecode,
  dropFrame,
  markers,
  linkUrl,
  density = 'comfortable',
  layout,
  debug = false,
  slots,
  onRangeChange,
  onMarkerSelect,
  onFrameChange,
  onCopyLink,
  onGuidesChange,
  onZoomChange,
  onFrameGrab,
  apiRef,
  persist = true,
  children,
  ...skinProps
}: FramelineSkinProps) {
  const renders = useRef(0);
  renders.current += 1;

  const safeTier: FramelineTier = isTier(tier) ? tier : 'viewer';
  if (safeTier !== tier) warnOnce(`Unknown tier "${String(tier)}"; using "viewer".`);

  let safeFps = fps;
  if (!isValidFps(fps)) {
    warnOnce(`Invalid fps "${String(fps)}"; using ${DEFAULT_FPS}. fps must be a positive, finite number.`);
    safeFps = DEFAULT_FPS;
  }

  const safeDensity: FramelineDensity = density === 'compact' ? 'compact' : 'comfortable';
  const safeLayout = resolveLayout(safeTier, layout);

  const wantsDebug = debug || debugInUrl();
  // resolveFeatures memoises by value, so a new `features` object with the same content gives the same result.
  const features = useMemo(
    () => resolveFeatures(safeTier, overrides),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [safeTier, JSON.stringify(overrides ?? null)]
  );

  const [guideAttributes, setGuideAttributes] = useState<Record<string, string>>({});
  const onViewAttributes = useCallback((next: Record<string, string>) => {
    setGuideAttributes((current) => {
      const keys = Object.keys(next);
      return keys.length === Object.keys(current).length && keys.every((name) => current[name] === next[name]) ? current : next;
    });
  }, []);

  // The debug readout lives in the pro runtime, so it loads the runtime even over a plain Viewer.
  const pro = hasProFeatures(features) || wantsDebug;
  // Any Studio control in the bar means the pro bar: the timeline row and the three-column main row with its slots.
  const proBar =
    features.timecode ||
    features.markers ||
    features.guides !== false ||
    features.frameStep ||
    features.cuts ||
    features.range ||
    features.loop ||
    features.grabFrame ||
    features.copyLink ||
    features.zoom;

  return (
    <VideoSkin
      {...skinProps}
      {...guideAttributes}
      data-tier={safeTier}
      data-density={safeDensity}
      data-bar={proBar ? 'pro' : undefined}
      proBar={proBar}
      pictureWrapper={features.zoom}
      layout={safeLayout}
      arrowSeekWhilePlayingOnly={features.frameStep}
      toolbarStart={slots?.toolbarStart}
      toolbarEnd={slots?.toolbarEnd}
      overlay={slots?.overlay}
      extras={
        pro && (
          <Suspense fallback={null}>
            <ProRuntime
              tier={safeTier}
              density={safeDensity}
              layout={safeLayout}
              features={features}
              debug={wantsDebug}
              fps={safeFps}
              startTimecode={startTimecode}
              dropFrame={dropFrame}
              markers={markers}
              linkUrl={linkUrl}
              onCopyLink={onCopyLink}
              onFrameGrab={onFrameGrab}
              onZoomChange={onZoomChange}
              apiRef={apiRef}
              skinRenders={renders}
              onViewAttributes={onViewAttributes}
              persist={persist}
              onGuidesChange={onGuidesChange}
              onRangeChange={onRangeChange}
              onMarkerSelect={onMarkerSelect}
              onFrameChange={onFrameChange}
            />
          </Suspense>
        )
      }
    >
      {children}
    </VideoSkin>
  );
}
