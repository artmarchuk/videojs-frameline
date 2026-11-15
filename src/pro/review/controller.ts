import { useEffect, useMemo, useRef } from 'react';

import { useProStoreApi } from '../context';
import type { FrameInfo, Marker, ProStore } from '../store';
import { formatTimecode, framesFromSeconds, secondsFromFrames } from '../timecode';
import type { AnnounceOptions } from './announcer';
import {
  effectiveRange,
  findCut,
  formatLinkPosition,
  grabFileName,
  JUMP_FRAMES,
  lastFrameOf,
  loopDecision,
  parseLinkPosition,
  readLinkPosition,
  seekTimeForFrame,
  stepTarget,
  withLinkPosition,
  type Cut,
} from './logic';
import { reviewStrings as t } from './strings';

export interface CopyLinkInfo {
  url: string;
  frame: number;
  time: number;
}

export interface PosterFrameInfo extends FrameInfo {
  timecode: string;
}

export interface ReviewOptions {
  video: HTMLVideoElement | null;
  fps: number;
  startFrames: number;
  dropFrame: boolean;
  cuts: readonly Cut[];
  announce: (message: string, options?: AnnounceOptions) => void;
  onCopyLink?: ((info: CopyLinkInfo) => void) | undefined;
  onPosterFrame?: ((info: PosterFrameInfo) => void) | undefined;
}

export interface ReviewController {
  /** Formats a frame as the timecode the user sees (start offset and drop-frame applied). */
  timecode(frame: number): string;
  step(delta: number): void;
  jump(direction: -1 | 1): void;
  goToCut(direction: 'previous' | 'next'): void;
  setIn(): void;
  setOut(): void;
  clearIn(): void;
  clearOut(): void;
  clearRange(): void;
  toggleLoop(): void;
  playRange(): void;
  grabFrame(): void;
  copyFrameImage(): void;
  copyLink(): void;
  usePoster(): void;
}

/** How long a just-requested frame is trusted over the clock, which needs a moment to catch up after a seek. */
const TARGET_FRESH_MS = 350;
/** How long "previous cut" remembers the cut it just jumped to, so a second press moves on to the one before. */
const CUT_FRESH_MS = 750;
/** Step announcements wait for the key repeat to stop, so a held key speaks once. */
const STEP_ANNOUNCE_MS = 400;

async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fall through to the selection-based copy, which works inside a user gesture where the async API is refused.
  }
  try {
    const field = document.createElement('textarea');
    field.value = text;
    field.setAttribute('readonly', '');
    field.style.cssText = 'position:fixed;opacity:0;pointer-events:none';
    document.body.appendChild(field);
    field.select();
    const ok = document.execCommand('copy');
    field.remove();
    return ok;
  } catch {
    return false;
  }
}

/** Draws the frame on screen at the video's own size. Throws if there is no frame; the canvas may be tainted. */
function drawFrame(video: HTMLVideoElement): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('no 2d context');
  context.drawImage(video, 0, 0, canvas.width, canvas.height);
  return canvas;
}

function canvasToPng(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    // A canvas tainted by a cross-origin video without CORS throws here, synchronously.
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('no blob'))), 'image/png');
  });
}

/**
 * Everything the Review controls do, in one place. Components and hotkeys call these actions; none of them holds
 * transport logic of its own. The returned object is stable for the life of the component.
 */
export function useReviewController(options: ReviewOptions): ReviewController {
  const store = useProStoreApi();
  const latest = useRef(options);
  latest.current = options;

  // The frame last asked for, while it is fresh. Lets held keys keep stepping without waiting for each seek.
  const target = useRef<{ frame: number; at: number } | null>(null);
  const queued = useRef<number | null>(null);
  const cutTarget = useRef<{ frame: number; at: number } | null>(null);
  const playingRange = useRef(false);
  const stepTimer = useRef(0);

  const controller = useMemo(() => createController(store, latest, { target, queued, cutTarget, playingRange, stepTimer }), [store]);

  const { video, fps } = options;

  // Coalesce seeks: while one is running only the newest target is kept, and it is applied when the seek ends.
  useEffect(() => {
    if (!video) return;
    const onSeeked = () => {
      const next = queued.current;
      queued.current = null;
      if (next !== null) video.currentTime = seekTimeForFrame(next, fps);
    };
    video.addEventListener('seeked', onSeeked);
    return () => video.removeEventListener('seeked', onSeeked);
  }, [video, fps]);

  // Loop and play-range engine. It listens to the store, not to React state, so nothing re-renders per frame.
  useEffect(() => {
    if (!video) return;

    const decide = (mediaTime: number, starting = false) => {
      const state = store.getState();
      const input = {
        mediaTime,
        range: { in: state.inPoint, out: state.outPoint },
        duration: state.duration || video.duration || 0,
        fps,
        loopMode: state.loopMode,
        playingRange: playingRange.current,
        starting,
      };
      const decision = loopDecision(input);
      if (decision === 'continue') return;

      if (decision === 'pauseAtOut') {
        playingRange.current = false;
        video.pause();
        return;
      }
      const range = effectiveRange(input.range, input.duration);
      if (!range || video.seeking) return;
      video.currentTime = seekTimeForFrame(framesFromSeconds(range.start, fps), fps);
    };

    let lastTime = store.getState().mediaTime;
    const unsubscribe = store.subscribe(() => {
      const { mediaTime } = store.getState();
      if (mediaTime === lastTime) return;
      lastTime = mediaTime;
      if (!video.paused) decide(mediaTime);
    });

    const onPlay = () => {
      target.current = null;
      decide(video.currentTime, true);
    };
    const onPause = () => {
      playingRange.current = false;
    };
    // The range can run to the very end of the media, where the clock stops before the loop point is seen.
    const onEnded = () => {
      const state = store.getState();
      if (state.loopMode !== 'range') return;
      const range = effectiveRange({ in: state.inPoint, out: state.outPoint }, video.duration || 0);
      if (!range) return;
      video.currentTime = seekTimeForFrame(framesFromSeconds(range.start, fps), fps);
      void video.play().catch(() => {});
    };

    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('ended', onEnded);
    return () => {
      unsubscribe();
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('ended', onEnded);
    };
  }, [video, fps, store]);

  // Open on the frame named in the page URL (`#t=…`), once, paused.
  const linkApplied = useRef(false);
  const { startFrames, dropFrame } = options;
  useEffect(() => {
    if (!video || linkApplied.current) return;

    const apply = () => {
      if (linkApplied.current || !(video.duration > 0)) return;
      linkApplied.current = true;
      const frame = parseLinkPosition(readLinkPosition(window.location.hash), fps, { startFrames, dropFrame });
      if (frame === null) return;
      const clamped = Math.min(frame, lastFrameOf(video.duration, fps));
      target.current = { frame: clamped, at: performance.now() };
      video.currentTime = seekTimeForFrame(clamped, fps);
    };

    apply();
    video.addEventListener('loadedmetadata', apply);
    video.addEventListener('durationchange', apply);
    return () => {
      video.removeEventListener('loadedmetadata', apply);
      video.removeEventListener('durationchange', apply);
    };
  }, [video, fps, startFrames, dropFrame]);

  useEffect(() => () => window.clearTimeout(stepTimer.current), []);

  return controller;
}

interface Refs {
  target: { current: { frame: number; at: number } | null };
  queued: { current: number | null };
  cutTarget: { current: { frame: number; at: number } | null };
  playingRange: { current: boolean };
  stepTimer: { current: number };
}

function createController(store: ProStore, latest: { current: ReviewOptions }, refs: Refs): ReviewController {
  const opts = () => latest.current;

  const timecode = (frame: number) => {
    const { fps, startFrames, dropFrame } = opts();
    return formatTimecode(frame, fps, { startFrames, dropFrame });
  };

  /** The frame the user is on: the one just asked for while that is fresh, otherwise what the clock reports. */
  const currentFrame = () => {
    const { video } = opts();
    const fresh = refs.target.current;
    if (fresh && (video?.seeking || performance.now() - fresh.at < TARGET_FRESH_MS)) return fresh.frame;
    return store.getState().frame;
  };

  const seekToFrame = (frame: number) => {
    const { video, fps } = opts();
    if (!video) return;
    refs.target.current = { frame, at: performance.now() };
    if (video.seeking) {
      refs.queued.current = frame;
      return;
    }
    refs.queued.current = null;
    video.currentTime = seekTimeForFrame(frame, fps);
  };

  const announceFrameSoon = () => {
    window.clearTimeout(refs.stepTimer.current);
    refs.stepTimer.current = window.setTimeout(() => {
      const frame = currentFrame();
      opts().announce(t.frame(frame, timecode(frame)));
    }, STEP_ANNOUNCE_MS);
  };

  const step = (delta: number) => {
    const { video, fps, announce } = opts();
    if (!video || !(video.duration > 0)) return;
    // Stepping while playing: pause first, then step from the frame that was on screen.
    if (!video.paused) video.pause();

    const result = stepTarget(currentFrame(), delta, lastFrameOf(video.duration, fps));
    if (result.edge) {
      announce(result.edge === 'start' ? t.start : t.end);
      return;
    }
    seekToFrame(result.frame);
    announceFrameSoon();
  };

  const mark = (which: 'in' | 'out') => {
    const { fps, announce } = opts();
    const frame = currentFrame();
    const time = secondsFromFrames(frame, fps);
    const before = store.getState();
    const other = which === 'in' ? before.outPoint : before.inPoint;

    if (other !== null && framesFromSeconds(other, fps) === frame) {
      announce(t.sameFrame, { toast: true });
      return;
    }

    if (which === 'in') store.setIn(time);
    else store.setOut(time);

    const after = store.getState();
    const landed = which === 'in' ? after.inPoint : after.outPoint;
    if (landed !== time && after.inPoint !== null && after.outPoint !== null) {
      // The store keeps In before Out by swapping; say so rather than leave the user guessing.
      announce(
        t.swapped(timecode(framesFromSeconds(after.inPoint, fps)), timecode(framesFromSeconds(after.outPoint, fps))),
        { toast: true }
      );
      return;
    }
    announce((which === 'in' ? t.inSet : t.outSet)(timecode(frame)));
  };

  const hasRange = () => {
    const state = store.getState();
    return state.inPoint !== null || state.outPoint !== null;
  };

  const withCapture = async (work: (blob: Promise<Blob>, name: string) => Promise<string>) => {
    const { video, announce } = opts();
    if (!video || !video.videoWidth || !video.videoHeight) {
      announce(t.noFrame, { toast: true });
      return;
    }
    const frame = currentFrame();
    try {
      // The frame is drawn now, inside the click, so it is the frame the user sees even while playing.
      const canvas = drawFrame(video);
      const message = await work(canvasToPng(canvas), grabFileName(null, timecode(frame)));
      announce(message, { toast: true });
    } catch (error) {
      const blocked = error instanceof DOMException && error.name === 'SecurityError';
      announce(blocked ? t.captureBlocked : t.copyFailed, { toast: true });
    }
  };

  return {
    timecode,
    step,
    jump: (direction) => step(direction * JUMP_FRAMES),

    goToCut(direction) {
      const { video, fps, cuts, announce } = opts();
      if (!video) return;
      const recent = refs.cutTarget.current;
      const from = recent && performance.now() - recent.at < CUT_FRESH_MS ? recent.frame : currentFrame();
      const cut = findCut(cuts, from, fps, direction);
      if (!cut) {
        announce(direction === 'previous' ? t.noPreviousCut : t.noNextCut, { toast: true });
        return;
      }
      const frame = Math.min(framesFromSeconds(cut.time, fps), lastFrameOf(video.duration || 0, fps));
      refs.cutTarget.current = { frame, at: performance.now() };
      seekToFrame(frame);
      if (cut.marker) store.selectMarker(cut.marker);
      announceFrameSoon();
    },

    setIn: () => mark('in'),
    setOut: () => mark('out'),

    clearIn() {
      if (store.getState().inPoint === null) return;
      store.clearIn();
      opts().announce(t.inCleared);
    },

    clearOut() {
      if (store.getState().outPoint === null) return;
      store.clearOut();
      opts().announce(t.outCleared);
    },

    clearRange() {
      if (!hasRange()) return;
      store.clearInOut();
      opts().announce(t.rangeCleared, { toast: true });
    },

    toggleLoop() {
      const { announce } = opts();
      if (!hasRange()) {
        announce(t.needRange, { toast: true });
        return;
      }
      const on = store.getState().loopMode !== 'range';
      store.setLoopMode(on ? 'range' : 'off');
      announce(on ? t.loopOn : t.loopOff, { toast: true });
    },

    playRange() {
      const { video, fps, announce } = opts();
      if (!video) return;
      const state = store.getState();
      const range = effectiveRange({ in: state.inPoint, out: state.outPoint }, video.duration || 0);
      if (!range) {
        announce(t.needRange, { toast: true });
        return;
      }
      seekToFrame(framesFromSeconds(range.start, fps));
      refs.playingRange.current = true;
      void video
        .play()
        .then(() => {
          // `play` clears the flag through the pause listener only on a real pause; set it again after start.
          refs.playingRange.current = true;
        })
        .catch(() => {
          refs.playingRange.current = false;
        });
    },

    grabFrame() {
      void withCapture(async (blob, name) => {
        const url = URL.createObjectURL(await blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = name;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
        return t.grabbed(timecode(currentFrame()));
      });
    },

    copyFrameImage() {
      const { announce } = opts();
      if (typeof ClipboardItem === 'undefined' || !navigator.clipboard?.write) {
        announce(t.copyImageUnsupported, { toast: true });
        return;
      }
      void withCapture(async (blob) => {
        // Passing the promise keeps the write inside the user gesture, which Safari requires.
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        return t.imageCopied;
      });
    },

    copyLink() {
      const { fps, startFrames, dropFrame, announce, onCopyLink } = opts();
      const frame = currentFrame();
      const value = formatLinkPosition(frame, fps, { startFrames, dropFrame });
      const { origin, pathname, search, hash } = window.location;
      const url = `${origin}${pathname}${search}${withLinkPosition(hash, value)}`;
      void copyText(url).then((ok) => {
        announce(ok ? t.linkCopied : t.copyFailed, { toast: true });
        if (ok) onCopyLink?.({ url, frame, time: secondsFromFrames(frame, fps) });
      });
    },

    usePoster() {
      const { fps, announce, onPosterFrame } = opts();
      const frame = currentFrame();
      const code = timecode(frame);
      onPosterFrame?.({ frame, time: secondsFromFrames(frame, fps), timecode: code });
      announce(t.posterSet(code), { toast: true });
    },
  };
}

