/** @jsxImportSource react */

'use client';

import { lazy, Suspense, useCallback, useMemo, useRef, useState, type ReactNode } from 'react';

import { VideoSkin, type VideoSkinProps } from '../video/skin';
import { warnOnce } from './dev';
import {
  hasProFeatures,
  isTier,
  resolveFeatures,
  resolveLayout,
  type FeatureOverrides,
  type Layout,
  type Tier,
} from './features';
import type { CopyLinkInfo } from './studio/controller';
import type { FrameInfo, InOutRange, Marker } from './store';
import type { EffectiveView } from './view';
import { DEFAULT_FPS, isValidFps } from './fps';

// The pro runtime (store, frame clock, the Studio layer) is a separate chunk. The Viewer tier never requests it.
const ProRuntime = lazy(() => import('./runtime'));

export type Density = 'comfortable' | 'compact';

/** Places where a host app can add its own UI. A slot whose area is not rendered is ignored. */
export interface ProSkinSlots {
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

export interface ProSkinProps extends Omit<VideoSkinProps, InternalSkinProps> {
  /**
   * Which bundle of features to start from. `'viewer'` (default): the clean player a creator's client or audience
   * gets, with no pro code loaded. `'studio'`: the creator's monitor, with the full set.
   */
  tier?: Tier;
  /** Single features switched on or off on top of the tier, for example `{ grabFrame: false, guides: ['9:16'] }`. */
  features?: FeatureOverrides;
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
  markers?: Marker[];
  /**
   * `'dock'` puts the controls in a panel below the picture, where they never cover it (also in fullscreen) and never
   * hide; `'overlay'` puts them over the picture. Default: `'overlay'` for Viewer, `'dock'` for Studio.
   * In the dock layout the aspect ratio applies to the picture's stage, and the component's height is stage plus dock.
   */
  layout?: Layout;
  /** Spacing of the controls. Touch devices always get `'comfortable'` with 44 px targets. */
  density?: Density;
  /** Show the debug readout. Also switched on by `?debug` in the page URL. */
  debug?: boolean;
  /** Host UI placed inside the skin. */
  slots?: ProSkinSlots;
  /** Fires when the in or out point changes. Times in seconds; `null` when a point is not set. */
  onInOutChange?: (range: InOutRange) => void;
  /** Fires when the user selects a marker. */
  onMarkerSelect?: (marker: Marker) => void;
  /** Fires when the current frame number changes. Best effort: see the README on frame accuracy. */
  onFrameChange?: (frame: FrameInfo) => void;
  /** Fires after a link to the current frame was copied. `url` carries the position as `#t=HH:MM:SS:FF`. */
  onCopyLink?: (info: CopyLinkInfo) => void;
  /**
   * Fires when the guides that are drawn change: `guides` (ids), `crop` and `zones` (an id or `null`). Not fired for
   * the remembered set the player starts with.
   */
  onViewChange?: (view: EffectiveView) => void;
  /**
   * Remember the end user's View choices (guides, crop, zones) and the time display in this browser's
   * `localStorage`. `true` (default) uses the key `videojs-pro:v1`, a string uses that key, `false` turns it off.
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
 * Video.js PRO: a player skin for video creators' tools.
 *
 * `ProSkin` is the public entry point. It wraps the Viewer skin and adds what the chosen tier and feature flags ask
 * for. With `tier="viewer"` and no flags it is exactly the Viewer skin and loads no pro code.
 *
 * @example
 * <VideoPlayer>
 *   <ProSkin tier="studio" fps={24} onInOutChange={saveRange}>
 *     <MuxVideo src="https://stream.mux.com/…" playsInline crossOrigin="" />
 *   </ProSkin>
 * </VideoPlayer>
 */
export function ProSkin({
  tier = 'viewer',
  features: overrides,
  fps = DEFAULT_FPS,
  startTimecode,
  dropFrame,
  markers,
  density = 'comfortable',
  layout,
  debug = false,
  slots,
  onInOutChange,
  onMarkerSelect,
  onFrameChange,
  onCopyLink,
  onViewChange,
  persist = true,
  children,
  ...skinProps
}: ProSkinProps) {
  const renders = useRef(0);
  renders.current += 1;

  const safeTier: Tier = isTier(tier) ? tier : 'viewer';
  if (safeTier !== tier) warnOnce(`Unknown tier "${String(tier)}"; using "viewer".`);

  let safeFps = fps;
  if (!isValidFps(fps)) {
    warnOnce(`Invalid fps "${String(fps)}"; using ${DEFAULT_FPS}. fps must be a positive, finite number.`);
    safeFps = DEFAULT_FPS;
  }

  const safeDensity: Density = density === 'compact' ? 'compact' : 'comfortable';
  const safeLayout = resolveLayout(safeTier, layout);

  const wantsDebug = debug || debugInUrl();
  // resolveFeatures memoises by value, so a new `features` object with the same content gives the same result.
  const features = useMemo(
    () => resolveFeatures(safeTier, wantsDebug ? { ...overrides, debug: true } : overrides),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [safeTier, wantsDebug, JSON.stringify(overrides ?? null)]
  );

  const [guideAttributes, setGuideAttributes] = useState<Record<string, string>>({});
  const onViewAttributes = useCallback((next: Record<string, string>) => {
    setGuideAttributes((current) => {
      const keys = Object.keys(next);
      return keys.length === Object.keys(current).length && keys.every((name) => current[name] === next[name]) ? current : next;
    });
  }, []);

  const pro = hasProFeatures(features);
  // Any Studio control in the bar means the pro bar: the timeline row and the three-column main row with its slots.
  const proBar =
    features.timecode ||
    features.markers ||
    features.guides !== false ||
    features.frameStep ||
    features.shotNav ||
    features.inOut ||
    features.loop ||
    features.grabFrame ||
    features.copyTimecodeLink ||
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
              fps={safeFps}
              startTimecode={startTimecode}
              dropFrame={dropFrame}
              markers={markers}
              onCopyLink={onCopyLink}
              skinRenders={renders}
              onViewAttributes={onViewAttributes}
              persist={persist}
              onViewChange={onViewChange}
              onInOutChange={onInOutChange}
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
