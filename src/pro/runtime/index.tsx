/** @jsxImportSource react */

import { lazy, Suspense, useEffect, useRef, useState, type RefObject } from 'react';

import { ProStoreContext } from '../context';
import type { FeatureFlags, Tier } from '../features';
import { useFrameClock } from '../frame-clock';
import type { CopyLinkInfo, PosterFrameInfo } from '../studio/controller';
import { createProStore, type Marker, type ProCallbacks } from '../store';
import { parseTimecode } from '../timecode';
import { useVideoElement } from '../use-video-element';
import { warnOnce } from '../dev';

const StudioLayer = lazy(() => import('../studio'));
const DebugReadout = lazy(() => import('../debug'));

const STUDIO_FLAGS = [
  'timecode',
  'frameStep',
  'inOut',
  'loop',
  'markers',
  'shotNav',
  'grabFrame',
  'copyTimecodeLink',
  'posterFrame',
  'guides',
  'platformZones',
  'channels',
  'gainGamma',
  'zoom',
  'infoHud',
] as const satisfies readonly (keyof FeatureFlags)[];
const NO_MARKERS: readonly Marker[] = [];

export interface ProRuntimeProps extends ProCallbacks {
  tier: Tier;
  density: string;
  layout: string;
  features: Readonly<FeatureFlags>;
  fps: number;
  startTimecode?: string | undefined;
  dropFrame?: boolean | undefined;
  markers?: readonly Marker[] | undefined;
  onCopyLink?: ((info: CopyLinkInfo) => void) | undefined;
  onPosterFrame?: ((info: PosterFrameInfo) => void) | undefined;
  /** Counts renders of `ProSkin`, shown in the debug readout to prove the skin does not re-render per frame. */
  skinRenders: RefObject<number>;
  /** Reports the active overlay ids so `ProSkin` can put one `data-guide-*` attribute per overlay on the container. */
  onOverlaysChange: (ids: readonly string[]) => void;
}

/**
 * Everything pro that is not the Viewer skin: the store, the frame clock, and the lazily loaded Studio layer.
 * This module is itself loaded lazily by `ProSkin`, so the Viewer tier never downloads it.
 */
export default function ProRuntime({
  tier,
  density,
  layout,
  features,
  fps,
  startTimecode,
  dropFrame = false,
  markers = NO_MARKERS,
  onCopyLink,
  onPosterFrame,
  skinRenders,
  onOverlaysChange,
  onInOutChange,
  onMarkerSelect,
  onFrameChange,
}: ProRuntimeProps) {
  // One store per ProSkin instance, created on first render and kept for the life of the component.
  const [store] = useState(() => createProStore({ allowedOverlays: features.guides || [] }));
  const anchor = useRef<HTMLSpanElement>(null);
  const video = useVideoElement(anchor);

  useEffect(() => {
    store.setCallbacks({ onInOutChange, onMarkerSelect, onFrameChange });
  }, [store, onInOutChange, onMarkerSelect, onFrameChange]);

  useEffect(() => {
    store.setAllowedOverlays(features.guides || []);
  }, [store, features.guides]);

  // Mirror the active overlays up to the container's data attributes.
  useEffect(() => {
    let last = store.getState().activeOverlays;
    onOverlaysChange([...last]);
    const unsubscribe = store.subscribe(() => {
      const next = store.getState().activeOverlays;
      if (next === last) return;
      last = next;
      onOverlaysChange([...next]);
    });
    return () => {
      unsubscribe();
      onOverlaysChange([]);
    };
  }, [store, onOverlaysChange]);

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
            onCopyLink={onCopyLink}
            onPosterFrame={onPosterFrame}
          />
        )}
        {features.debug && (
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
