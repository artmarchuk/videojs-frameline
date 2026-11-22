/** @jsxImportSource react */

import { lazy, Suspense, useEffect, useRef, useState, type Ref, type RefObject } from 'react';

import type { FramelineApi, FramelineLinkUrl } from '../api';

import { ProStoreContext } from '../context';
import type { FramelineFeatureFlags, FramelineTier } from '../features';
import { useFrameClock } from '../frame-clock';
import type { FramelineCopyLinkInfo, FramelineFrameGrabInfo } from '../studio/controller';
import { createProStore, type FramelineMarker, type ProCallbacks } from '../store';
import { parseTimecode } from '../timecode';
import { useVideoElement } from '../use-video-element';
import { allowedView, readRemembered, storageKey, viewAttributes, writeRemembered } from '../view';
import { warnOnce } from '../dev';

const StudioLayer = lazy(() => import('../studio'));
const DebugReadout = lazy(() => import('../debug'));

const STUDIO_FLAGS = [
  'timecode',
  'frameStep',
  'range',
  'loop',
  'markers',
  'cuts',
  'grabFrame',
  'copyLink',
  'guides',
  'zones',
  'zoom',
] as const satisfies readonly (keyof FramelineFeatureFlags)[];
const NO_MARKERS: readonly FramelineMarker[] = [];

export interface ProRuntimeProps extends ProCallbacks {
  tier: FramelineTier;
  density: string;
  layout: string;
  features: Readonly<FramelineFeatureFlags>;
  /** Show the debug readout (the `debug` prop or `?debug`). */
  debug: boolean;
  fps: number;
  startTimecode?: string | undefined;
  dropFrame?: boolean | undefined;
  markers?: readonly FramelineMarker[] | undefined;
  linkUrl?: FramelineLinkUrl | undefined;
  onCopyLink?: ((info: FramelineCopyLinkInfo) => void) | undefined;
  onFrameGrab?: ((info: FramelineFrameGrabInfo) => void) | undefined;
  apiRef?: Ref<FramelineApi> | undefined;
  /** Counts renders of `FramelineSkin`, shown in the debug readout to prove the skin does not re-render per frame. */
  skinRenders: RefObject<number>;
  /** Reports the container attributes of the guides that are drawn (`data-guide-*`, `data-crop`, `data-zones`) and `data-zoom`. */
  onViewAttributes: (attributes: Record<string, string>) => void;
  /** Remember the View choices and the time display per browser: the default key, a key of the host's, or not at all. */
  persist?: boolean | string | undefined;
}

/**
 * Everything pro that is not the Viewer skin: the store, the frame clock, and the lazily loaded Studio layer.
 * This module is itself loaded lazily by `FramelineSkin`, so the Viewer tier never downloads it.
 */
export default function ProRuntime({
  tier,
  density,
  layout,
  features,
  debug,
  fps,
  startTimecode,
  dropFrame = false,
  markers = NO_MARKERS,
  linkUrl,
  onCopyLink,
  onFrameGrab,
  apiRef,
  skinRenders,
  onViewAttributes,
  persist,
  onRangeChange,
  onMarkerSelect,
  onFrameChange,
  onGuidesChange,
  onZoomChange,
}: ProRuntimeProps) {
  // One store per FramelineSkin instance, created on first render and kept for the life of the component.
  // It starts from the choices remembered in this browser, read here (not in an effect) so the first render already
  // has them and nothing flashes. Storage can be blocked or empty; then it starts empty, and nothing depends on it.
  const key = storageKey(persist);
  const [store] = useState(() => {
    const allowed = allowedView(features);
    const remembered = readRemembered(key, allowed);
    return createProStore({ allowedView: allowed, view: remembered.view, timeDisplay: remembered.timeDisplay ?? 'timecode', loop: features.loop });
  });
  const anchor = useRef<HTMLSpanElement>(null);
  const video = useVideoElement(anchor);

  useEffect(() => {
    store.setCallbacks({ onRangeChange, onMarkerSelect, onFrameChange, onGuidesChange, onZoomChange });
  }, [store, onRangeChange, onMarkerSelect, onFrameChange, onGuidesChange, onZoomChange]);

  // The host's features always win: what is no longer allowed is switched off.
  useEffect(() => {
    store.setAllowedView(allowedView(features));
  }, [store, features]);

  // Remember the View choices and the time display.
  useEffect(() => {
    if (!key) return;
    let last = store.getState();
    return store.subscribe(() => {
      const next = store.getState();
      if (next.view === last.view && next.timeDisplay === last.timeDisplay) return;
      last = next;
      writeRemembered(key, next.view, next.timeDisplay);
    });
  }, [store, key]);

  // Mirror the guides that are drawn, and the zoom level, up to the container's data attributes.
  useEffect(() => {
    // `data-zoom` ("100", "150", "200", "400") is there only while zoomed.
    const attributes = () => {
      const { view, zoom } = store.getState();
      return zoom === 'fit' ? viewAttributes(view) : { ...viewAttributes(view), 'data-zoom': zoom };
    };
    let last = store.getState();
    onViewAttributes(attributes());
    const unsubscribe = store.subscribe(() => {
      const next = store.getState();
      if (next.view === last.view && next.zoom === last.zoom) return;
      last = next;
      onViewAttributes(attributes());
    });
    return () => {
      unsubscribe();
      onViewAttributes({});
    };
  }, [store, onViewAttributes]);

  // Offset for the displayed timecode, in frames. An unreadable value warns once and counts as zero.
  const parsedStart = startTimecode === undefined ? 0 : parseTimecode(startTimecode, fps);
  if (parsedStart === null) warnOnce(`Invalid startTimecode "${String(startTimecode)}"; using 00:00:00:00.`);
  const startFrames = parsedStart ?? 0;

  const studio = STUDIO_FLAGS.some((name) => features[name] !== false);

  return (
    <ProStoreContext.Provider value={store}>
      <span ref={anchor} hidden />
      <FrameClock video={video} fps={fps} />
      <Suspense fallback={null}>
        {studio && (
          <StudioLayer
            features={features}
            fps={fps}
            startFrames={startFrames}
            dropFrame={dropFrame}
            markers={markers}
            video={video}
            anchor={anchor}
            linkUrl={linkUrl}
            onCopyLink={onCopyLink}
            onFrameGrab={onFrameGrab}
            apiRef={apiRef}
          />
        )}
        {debug && (
          <DebugReadout
            tier={tier}
            density={density}
            layout={layout}
            features={features}
            fps={fps}
            startFrames={startFrames}
            video={video}
            skinRenders={skinRenders}
          />
        )}
      </Suspense>
    </ProStoreContext.Provider>
  );
}

/** Runs the frame clock. A component of its own so it sits inside the store provider. Renders nothing. */
function FrameClock({ video, fps }: { video: HTMLVideoElement | null; fps: number }) {
  useFrameClock(video, fps);
  return null;
}
