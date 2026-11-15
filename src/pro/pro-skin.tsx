/** @jsxImportSource react */

'use client';

import { lazy, Suspense, useCallback, useMemo, useRef, useState, type ReactNode } from 'react';

import { VideoSkin, type VideoSkinProps } from '../video/skin';
import { warnOnce } from './dev';
import { guideAttribute, hasProFeatures, isTier, resolveFeatures, type FeatureOverrides, type Tier } from './features';
import type { CopyLinkInfo, PosterFrameInfo } from './review/controller';
import type { FrameInfo, InOutRange, Marker } from './store';
import { DEFAULT_FPS, isValidFps } from './fps';

// The pro runtime (store, frame clock, tier layers) is a separate chunk. The Share tier never requests it.
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
  | 'proSlots'
  | 'stackedBar'
  | 'arrowSeekWhilePlayingOnly';

export interface ProSkinProps extends Omit<VideoSkinProps, InternalSkinProps> {
  /** Which bundle of features to start from. Default `'share'`: the clean player, with no pro code loaded. */
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
  /** Markers for the timeline. Times in seconds; `end` makes a range marker. */
  markers?: Marker[];
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
  /** Fires when the user picks the current frame as the poster. The host app saves it; the skin stores nothing. */
  onPosterFrame?: (info: PosterFrameInfo) => void;
  /** The media element, as in the Share skin: for example `<MuxVideo src="…" />`. */
  children: ReactNode;
}

function debugInUrl(): boolean {
  return typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('debug');
}

/**
 * Video.js PRO: a player skin for video creators' tools.
 *
 * `ProSkin` is the public entry point. It wraps the Share skin and adds what the chosen tier and feature flags ask
 * for. With `tier="share"` and no flags it is exactly the Share skin and loads no pro code.
 *
 * @example
 * <VideoPlayer>
 *   <ProSkin tier="review" fps={24} onInOutChange={saveRange}>
 *     <MuxVideo src="https://stream.mux.com/…" playsInline crossOrigin="" />
 *   </ProSkin>
 * </VideoPlayer>
 */
export function ProSkin({
  tier = 'share',
  features: overrides,
  fps = DEFAULT_FPS,
  startTimecode,
  dropFrame,
  markers,
  density = 'comfortable',
  debug = false,
  slots,
  onInOutChange,
  onMarkerSelect,
  onFrameChange,
  onCopyLink,
  onPosterFrame,
  children,
  ...skinProps
}: ProSkinProps) {
  const renders = useRef(0);
  renders.current += 1;

  const safeTier: Tier = isTier(tier) ? tier : 'share';
  if (safeTier !== tier) warnOnce(`Unknown tier "${String(tier)}"; using "share".`);

  let safeFps = fps;
  if (!isValidFps(fps)) {
    warnOnce(`Invalid fps "${String(fps)}"; using ${DEFAULT_FPS}. fps must be a positive, finite number.`);
    safeFps = DEFAULT_FPS;
  }

  const safeDensity: Density = density === 'compact' ? 'compact' : 'comfortable';

  const wantsDebug = debug || debugInUrl();
  // resolveFeatures memoises by value, so a new `features` object with the same content gives the same result.
  const features = useMemo(
    () => resolveFeatures(safeTier, wantsDebug ? { ...overrides, debug: true } : overrides),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [safeTier, wantsDebug, JSON.stringify(overrides ?? null)]
  );

  const [overlays, setOverlays] = useState<readonly string[]>([]);
  const onOverlaysChange = useCallback((ids: readonly string[]) => {
    setOverlays((current) => (current.length === ids.length && current.every((id, i) => id === ids[i]) ? current : ids));
  }, []);

  const guideAttributes: Record<string, string> = {};
  for (const id of overlays) guideAttributes[guideAttribute(id)] = '';

  const pro = hasProFeatures(features);
  // Any Review control in the bar means the pro bar layout: seek bar on its own row, slots for the controls.
  const proBar =
    features.timecode ||
    features.frameStep ||
    features.shotNav ||
    features.inOut ||
    features.loop ||
    features.grabFrame ||
    features.copyTimecodeLink ||
    features.posterFrame;

  return (
    <VideoSkin
      {...skinProps}
      {...guideAttributes}
      data-tier={safeTier}
      data-density={safeDensity}
      data-bar={proBar ? 'pro' : undefined}
      proSlots={proBar}
      stackedBar={proBar}
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
              features={features}
              fps={safeFps}
              startTimecode={startTimecode}
              dropFrame={dropFrame}
              markers={markers}
              onCopyLink={onCopyLink}
              onPosterFrame={onPosterFrame}
              skinRenders={renders}
              onOverlaysChange={onOverlaysChange}
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
