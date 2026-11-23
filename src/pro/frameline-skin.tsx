/** @jsxImportSource react */

'use client';

import { lazy, Suspense, useCallback, useMemo, useRef, useState, type ReactNode, type Ref } from 'react';

import type { ProFallback } from '../video/pro-fallback';
import { VideoSkin, type VideoSkinProps } from '../video/skin';
import { strings } from '../video/strings';
import type { FramelineApi, FramelineLinkUrl } from './api';
import { ChunkBoundary } from './chunk-boundary';
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
const loadRuntime = () => import('./runtime');
// `let`: React keeps the rejection of a `lazy()` whose import failed, so a retry needs a new one (see `retry` below).
let ProRuntime = lazy(loadRuntime);
let runtimeFailed = false;

/**
 * How the pro code is doing. `failed`: it could not load, the player is a Viewer and offers one retry.
 * `retrying`: that retry is under way. `gone`: the retry failed too, or the pro code failed again after it.
 */
type ProState = 'ok' | 'failed' | 'retrying' | 'gone';

/** What a successful retry puts back once the Studio bar is on screen: the player it came from and its playback. */
interface RetryReturn {
  root: HTMLElement | null;
  video: HTMLVideoElement | null;
  time: number;
  paused: boolean;
}

/**
 * Puts the playback position and the paused or playing state back on the player's media element after the switch
 * back to Studio. The bar changes from the overlay to the dock, so the picture moves into the dock's stage and React
 * mounts the media element anew: a new element starts at 0, paused. When the element is still the same one, nothing
 * changed and nothing is done.
 */
/**
 * Focuses the settings button of the rebuilt bar. A host page can keep the bar hidden for a moment (the site's landing
 * page does while it stages its opening state), and a hidden button takes no focus, so this tries again each frame
 * for up to two seconds. It stops as soon as focus is anywhere but the page body: the user has moved on.
 */
function focusSettings(root: HTMLElement): void {
  const until = performance.now() + 2000;
  const attempt = () => {
    const button = root.querySelector<HTMLElement>('.media-settings-button');
    const active = document.activeElement;
    if (!button || (active && active !== document.body)) return;
    button.focus({ preventScroll: true });
    if (document.activeElement !== button && performance.now() < until) requestAnimationFrame(attempt);
  };
  attempt();
}

function restorePlayback(root: HTMLElement, before: RetryReturn): void {
  const video = root.querySelector('video');
  if (!video || video === before.video) return;
  const apply = () => {
    if (before.time > 0) video.currentTime = before.time;
    if (!before.paused) video.play().catch(() => {});
  };
  if (video.readyState >= 1) apply();
  else video.addEventListener('loadedmetadata', apply, { once: true });
}

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

  const askedTier: FramelineTier = isTier(tier) ? tier : 'viewer';
  if (askedTier !== tier) warnOnce(`Unknown tier "${String(tier)}"; using "viewer".`);

  // When a pro chunk cannot load (see `ChunkBoundary`), the player carries on as the plain Viewer: its own tier,
  // flags and overlay bar, with nothing pro mounted, so there is no dock with empty places in it.
  const [proState, setProState] = useState<ProState>('ok');
  const [attempt, setAttempt] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const retried = useRef(false);
  const returning = useRef<RetryReturn | null>(null);
  const down = proState !== 'ok';
  const safeTier: FramelineTier = down ? 'viewer' : askedTier;
  const onProError = useCallback(() => setProState(retried.current ? 'gone' : 'failed'), []);
  const onRuntimeError = useCallback(() => {
    runtimeFailed = true;
    onProError();
  }, [onProError]);

  let safeFps = fps;
  if (!isValidFps(fps)) {
    warnOnce(`Invalid fps "${String(fps)}"; using ${DEFAULT_FPS}. fps must be a positive, finite number.`);
    safeFps = DEFAULT_FPS;
  }

  const safeDensity: FramelineDensity = density === 'compact' ? 'compact' : 'comfortable';
  const safeLayout = resolveLayout(safeTier, down ? undefined : layout);

  const wantsDebug = debug || debugInUrl();
  // resolveFeatures memoises by value, so a new `features` object with the same content gives the same result.
  const features = useMemo(
    () => resolveFeatures(safeTier, down ? undefined : overrides),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [safeTier, down, JSON.stringify(overrides ?? null)]
  );
  // What the host asked for, whatever is shown: only a player that wanted Studio tools says that they are missing.
  const wantsStudio = useMemo(
    () => hasProFeatures(resolveFeatures(askedTier, overrides)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [askedTier, JSON.stringify(overrides ?? null)]
  );

  /**
   * One more try, from the settings menu. It imports the chunks again and goes back to the pro tier only when they
   * arrived, so a retry that fails changes nothing on screen. It rarely helps after a deploy: the old chunk is gone
   * from the server for good, and only a reload of the page, which gets the new build, brings the tools back. That
   * reload is the host's to do (the README, "When a chunk fails to load"); the skin never reloads the page. The
   * retry is for the other case, a request that failed on the way.
   */
  const retry = useCallback(() => {
    if (retried.current) return;
    retried.current = true;
    setProState('retrying');
    // The retry is chosen in this player's settings menu, so focus is inside the player.
    const root = document.activeElement?.closest<HTMLElement>('.media-skin') ?? null;
    const video = root?.querySelector('video') ?? null;
    returning.current = { root, video, time: video?.currentTime ?? 0, paused: video?.paused ?? true };
    loadRuntime()
      .then((runtime) => runtime.preloadStudio(wantsStudio))
      .then(
        () => {
          if (runtimeFailed) {
            ProRuntime = lazy(loadRuntime);
            runtimeFailed = false;
          }
          setAttempt((count) => count + 1);
          setProState('ok');
          // The rest happens in `onProReady`, once the Studio bar is on screen.
        },
        (error: unknown) => {
          returning.current = null;
          setProState('gone');
          // React never sees this failure (the import is ours, not a `lazy()` in the tree), so it is logged here,
          // once. A failure caught by a `ChunkBoundary` is logged by React itself.
          console.error(error);
        }
      );
  }, [wantsStudio]);

  /**
   * After a successful retry, once the Studio bar and its tools are on screen: focus goes to the settings button (the
   * user was in that menu, whose button the rebuilt bar replaced), the playback position and state come back, and
   * "Studio tools loaded." is announced in the same live region.
   */
  const onProReady = useCallback(() => {
    const before = returning.current;
    if (!before) return;
    returning.current = null;
    const root = before.root;
    if (!root) return;
    requestAnimationFrame(() => {
      focusSettings(root);
      restorePlayback(root, before);
      setLoaded(true);
    });
  }, []);

  const proFallback = useMemo<ProFallback | null>(
    () =>
      down && wantsStudio
        ? { notice: strings.proUnavailable, retry: proState === 'failed' ? retry : undefined }
        : loaded
          ? { notice: strings.proLoaded }
          : null,
    [down, wantsStudio, proState, retry, loaded]
  );

  const [guideAttributes, setGuideAttributes] = useState<Record<string, string>>({});
  const onViewAttributes = useCallback((next: Record<string, string>) => {
    setGuideAttributes((current) => {
      const keys = Object.keys(next);
      return keys.length === Object.keys(current).length && keys.every((name) => current[name] === next[name]) ? current : next;
    });
  }, []);

  // The debug readout lives in the pro runtime, so it loads the runtime even over a plain Viewer.
  const pro = !down && (hasProFeatures(features) || wantsDebug);
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
      {...(down ? null : guideAttributes)}
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
      proFallback={proFallback}
      extras={
        pro && (
          <ChunkBoundary key={attempt} onError={onRuntimeError}>
            <Suspense fallback={null}>
              <ProRuntime
                onStudioError={onProError}
                onReady={onProReady}
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
          </ChunkBoundary>
        )
      }
    >
      {children}
    </VideoSkin>
  );
}
