/**
 * Frame clock: keeps "the current frame" up to date for a `<video>` element.
 *
 * Frame accuracy is best effort. `requestVideoFrameCallback` reports the media time of the frame that was presented,
 * which is the best signal a browser offers, but it can lag a frame behind in some browsers, and the frame number
 * also depends on the host passing the right `fps`. Nothing here guarantees frame accuracy.
 */
import { useEffect } from 'react';

import { useProStoreApi } from './context';
import type { FrameClockPrecision, FrameClockSource } from './store';
import { framesFromSeconds, presentedFrame } from './timecode';

export interface FrameClockReading {
  frame: number;
  mediaTime: number;
}

export interface FrameClockInfo {
  /** `rvfc`: `requestVideoFrameCallback`. `raf`: `requestAnimationFrame` plus media events, reading `currentTime`. */
  source: FrameClockSource;
  /** `frame`: per presented frame. `approximate`: sampled from `currentTime`, which can sit between frames. */
  precision: FrameClockPrecision;
}

type VideoFrameMeta = { mediaTime: number };

/** How long to wait for a presented frame after a seek or a pause before falling back to `currentTime`. */
const SETTLE_MS = 120;

/** Safari before 15.4 and Firefox before 132 have no `requestVideoFrameCallback`. */
export function supportsVideoFrameCallback(video: HTMLVideoElement): boolean {
  return typeof (video as Partial<HTMLVideoElement>).requestVideoFrameCallback === 'function';
}

export function frameClockInfo(video: HTMLVideoElement): FrameClockInfo {
  return supportsVideoFrameCallback(video)
    ? { source: 'rvfc', precision: 'frame' }
    : { source: 'raf', precision: 'approximate' };
}

/**
 * Starts the clock on `video` and calls `onReading` whenever a new reading is available. Returns a function that
 * stops it: every callback, listener and timer is removed.
 */
export function startFrameClock(
  video: HTMLVideoElement,
  fps: number,
  onReading: (reading: FrameClockReading) => void
): () => void {
  let stopped = false;
  const cleanups: (() => void)[] = [];

  const listen = (type: string, handler: () => void) => {
    video.addEventListener(type, handler);
    cleanups.push(() => video.removeEventListener(type, handler));
  };

  /** Reading from `currentTime`: the frame that time falls in. */
  const readCurrentTime = () => {
    if (stopped) return;
    const mediaTime = video.currentTime;
    onReading({ frame: framesFromSeconds(mediaTime, fps), mediaTime });
  };

  if (supportsVideoFrameCallback(video)) {
    let handle = 0;
    let settle = 0;

    const onFrame = (_now: number, metadata: VideoFrameMeta) => {
      if (stopped) return;
      window.clearTimeout(settle);
      settle = 0;
      // `mediaTime` is the presentation time of the frame on screen: its start in Chrome, the seek time in Firefox.
      onReading({ frame: presentedFrame(metadata.mediaTime, fps), mediaTime: metadata.mediaTime });
      // The API fires once per registration, so register again for the next frame.
      handle = video.requestVideoFrameCallback(onFrame);
    };
    handle = video.requestVideoFrameCallback(onFrame);

    // A paused or just-seeked video may not present a new frame in every browser. Give it a moment, then fall back
    // to `currentTime` so the reading is never stale.
    const settleSoon = () => {
      window.clearTimeout(settle);
      settle = window.setTimeout(readCurrentTime, SETTLE_MS);
    };
    listen('seeked', settleSoon);
    listen('pause', settleSoon);
    listen('loadedmetadata', settleSoon);

    cleanups.push(() => {
      video.cancelVideoFrameCallback(handle);
      window.clearTimeout(settle);
    });
  } else {
    let raf = 0;

    const tick = () => {
      raf = 0;
      if (stopped) return;
      readCurrentTime();
      if (!video.paused && !video.ended) raf = window.requestAnimationFrame(tick);
    };
    const start = () => {
      if (!raf) raf = window.requestAnimationFrame(tick);
    };

    listen('play', start);
    listen('playing', start);
    listen('seeked', readCurrentTime);
    listen('timeupdate', readCurrentTime);
    listen('pause', readCurrentTime);
    listen('loadedmetadata', readCurrentTime);
    if (!video.paused) start();

    cleanups.push(() => window.cancelAnimationFrame(raf));
  }

  readCurrentTime();

  return () => {
    stopped = true;
    for (const cleanup of cleanups) cleanup();
  };
}

/**
 * Keeps `frame` and `mediaTime` in the pro store current for `videoEl`, and records which source and precision the
 * clock has. It restarts when the element or `fps` changes and cleans up on unmount. The readings go to the store, not
 * to React state: only components that select `frame` or `mediaTime` re-render.
 */
export function useFrameClock(videoEl: HTMLVideoElement | null, fps: number): void {
  const store = useProStoreApi();

  useEffect(() => {
    if (!videoEl) {
      store.setClock(null, null);
      return;
    }

    const info = frameClockInfo(videoEl);
    store.setClock(info.source, info.precision);

    const syncDuration = () => store.setDuration(videoEl.duration);
    videoEl.addEventListener('durationchange', syncDuration);
    syncDuration();

    const stop = startFrameClock(videoEl, fps, ({ frame, mediaTime }) => store.setFrame(frame, mediaTime));

    return () => {
      stop();
      videoEl.removeEventListener('durationchange', syncDuration);
    };
  }, [videoEl, fps, store]);
}
