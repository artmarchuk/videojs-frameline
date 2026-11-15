/**
 * Studio transport logic. Pure: no React, no DOM. Everything the Studio controls decide is decided here, so it can be
 * tested without a browser.
 */
import type { LoopMode, Marker } from '../store';
import { formatTimecode, framesFromSeconds, parseTimecode, resolveFrameRate, type TimecodeOptions } from '../timecode';

/**
 * Where inside a frame a seek aims, as a fraction of the frame. Half a frame keeps the seek clear of both
 * boundaries, so rounding in the browser cannot land it on a neighbouring frame.
 */
export const SEEK_OFFSET = 0.5;

/** Below this player width the dock uses its narrow arrangement. */
export const DOCK_NARROW_BELOW = 700;

/**
 * The dock's narrow arrangement: a player under 700 px wide (the one-row arrangement needs about 690 px even after
 * it has shed what it can), or any touch device (which has no keyboard for `I` and
 * `O`, so it gets In and Out buttons). A width that is not measured yet counts as wide.
 */
export function isNarrowDock(width: number, coarsePointer = false): boolean {
  if (coarsePointer) return true;
  return width > 0 && width < DOCK_NARROW_BELOW;
}

/** Frames jumped by `Shift+←` and `Shift+→`. */
export const JUMP_FRAMES = 10;

/** Number of the last frame of a clip of `duration` seconds. */
export function lastFrameOf(duration: number, fps: number): number {
  return Math.max(0, framesFromSeconds(duration, fps) - 1);
}

/** The time to seek to so that `frame` is the frame on screen. */
export function seekTimeForFrame(frame: number, fps: number): number {
  const { exact } = resolveFrameRate(fps);
  return (Math.max(0, Math.floor(frame)) + SEEK_OFFSET) / exact;
}

export interface StepResult {
  frame: number;
  /** Set when the step ran into the start or the end and the frame did not change. */
  edge: 'start' | 'end' | null;
}

/** The frame reached by moving `delta` frames from `frame`, clamped to `[0, lastFrame]`. */
export function stepTarget(frame: number, delta: number, lastFrame: number): StepResult {
  const from = Math.min(Math.max(0, Math.floor(frame)), lastFrame);
  const target = Math.min(Math.max(0, from + Math.trunc(delta)), lastFrame);
  if (target !== from || delta === 0) return { frame: target, edge: null };
  return { frame: target, edge: delta < 0 ? 'start' : 'end' };
}

/** A place to jump to with previous/next cut. `marker` is set when it came from the host's markers. */
export interface Cut {
  time: number;
  marker?: Marker;
}

/**
 * The cut list: chapter starts when the media has chapters, otherwise the host's markers. Sorted by time, with cuts
 * that fall on the same frame merged (the first one wins).
 */
export function buildCutList(chapterStarts: readonly number[], markers: readonly Marker[], fps: number): Cut[] {
  const source: Cut[] = chapterStarts.length
    ? chapterStarts.map((time) => ({ time }))
    : markers.map((marker) => ({ time: marker.time, marker }));

  const valid = source.filter((cut) => Number.isFinite(cut.time) && cut.time >= 0).sort((a, b) => a.time - b.time);
  const cuts: Cut[] = [];
  let lastFrame = -1;
  for (const cut of valid) {
    const frame = framesFromSeconds(cut.time, fps);
    if (frame === lastFrame) continue;
    lastFrame = frame;
    cuts.push(cut);
  }
  return cuts;
}

/**
 * The nearest cut before or after `fromFrame`, compared by frame so a cut on the current frame is never returned.
 * Callers pass the frame they last jumped to while that seek is still fresh, so pressing "previous" twice quickly
 * moves two cuts even though playback has moved on a little.
 */
export function findCut(cuts: readonly Cut[], fromFrame: number, fps: number, direction: 'previous' | 'next'): Cut | null {
  if (direction === 'next') {
    return cuts.find((cut) => framesFromSeconds(cut.time, fps) > fromFrame) ?? null;
  }
  for (let i = cuts.length - 1; i >= 0; i--) {
    const cut = cuts[i]!;
    if (framesFromSeconds(cut.time, fps) < fromFrame) return cut;
  }
  return null;
}

export interface Range {
  in: number | null;
  out: number | null;
}

/**
 * The range that playback uses. Only In set: In to the end. Only Out set: the start to Out. Neither: no range.
 * `end` is `null` when it is the end of the media and the duration is not known yet.
 */
export function effectiveRange(range: Range, duration: number): { start: number; end: number | null } | null {
  if (range.in === null && range.out === null) return null;
  const end = range.out ?? (duration > 0 ? duration : null);
  return { start: range.in ?? 0, end };
}

export type LoopDecision = 'continue' | 'jumpToIn';

export interface LoopInput {
  mediaTime: number;
  range: Range;
  duration: number;
  fps: number;
  /** `'range'`: loop the range. `'whole'`: the whole video loops when it ends, which the `ended` event handles. */
  loopMode: LoopMode;
  /** Playback is just starting: with loop on, a playhead outside the range jumps to In first. */
  starting?: boolean;
}

/**
 * What playback should do at `mediaTime`. Out is treated as reached half a frame early, because the clock reports the
 * frame that is already on screen; expect a one-frame overshoot now and then, loops are not exact.
 */
export function loopDecision(input: LoopInput): LoopDecision {
  if (input.loopMode !== 'range') return 'continue';

  const range = effectiveRange(input.range, input.duration);
  if (!range) return 'continue';

  const half = SEEK_OFFSET / resolveFrameRate(input.fps).exact;
  if (range.end !== null && input.mediaTime >= range.end - half) return 'jumpToIn';
  if (input.starting && input.mediaTime < range.start - half) return 'jumpToIn';
  return 'continue';
}

const LINK_KEY = 't';

/**
 * Puts a position into a URL hash as `t=<value>`, keeping whatever else the host app keeps there.
 * `#chapter-2` becomes `#chapter-2&t=00:00:12:05`; an existing `t=` is replaced.
 */
export function withLinkPosition(hash: string, value: string): string {
  const body = hash.replace(/^#/, '');
  const parts = body ? body.split('&').filter((part) => part && !part.startsWith(`${LINK_KEY}=`)) : [];
  parts.push(`${LINK_KEY}=${value}`);
  return `#${parts.join('&')}`;
}

/** The raw `t=` value in a hash, or `null`. */
export function readLinkPosition(hash: string): string | null {
  for (const part of hash.replace(/^#/, '').split('&')) {
    if (part.startsWith(`${LINK_KEY}=`)) {
      const value = part.slice(LINK_KEY.length + 1);
      try {
        return decodeURIComponent(value) || null;
      } catch {
        return null;
      }
    }
  }
  return null;
}

/**
 * Link format: `#t=HH:MM:SS:FF`, the timecode the user sees (start offset and drop-frame included), because a
 * timecode names an exact frame and seconds do not.
 */
export function formatLinkPosition(frame: number, fps: number, options: TimecodeOptions = {}): string {
  return formatTimecode(frame, fps, options);
}

/**
 * Reads a link position back into a frame number. Accepts the timecode this skin writes, and plain seconds
 * (`t=12.5`) as other tools write them. Returns `null` for anything else, or for a timecode before the start offset.
 */
export function parseLinkPosition(value: string | null, fps: number, options: TimecodeOptions = {}): number | null {
  if (!value) return null;

  if (/^\d+(\.\d+)?$/.test(value)) return framesFromSeconds(Number(value), fps);

  const frames = parseTimecode(value, fps, options);
  if (frames === null) return null;
  const frame = frames - Math.floor(options.startFrames ?? 0);
  return frame >= 0 ? frame : null;
}

/** `frame_00-00-12-05.png`: the title (or "frame"), then the timecode with dashes. */
export function grabFileName(title: string | null | undefined, timecode: string): string {
  const base = (title ?? '').trim().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'frame';
  return `${base}_${timecode.replace(/[:;]/g, '-')}.png`;
}
