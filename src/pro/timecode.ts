/**
 * Timecode utilities. Pure: no React, no DOM.
 *
 * Rates. `fps` is a plain number. The fractional broadcast rates are recognised by value, so a host can pass either
 * `29.97` or `30000 / 1001`; both resolve to the exact rational 30000/1001. Conversions between seconds and frames use
 * that exact rate. Timecode digits use the nominal integer count (24, 30 or 60 frames per second), which is how
 * 23.976, 29.97 and 59.94 material is labelled.
 *
 * Rounding. A frame's start time rarely survives floating point exactly (25 / 24 is 1.0416666…), so
 * `framesFromSeconds` adds a small tolerance before flooring instead of trusting the raw product.
 *
 * Bad input. A non-finite or non-positive `fps` falls back to 24. Negative or non-finite frame numbers and times are
 * clamped to 0. `parseTimecode` returns `null` for anything it cannot read and never throws.
 */

import { DEFAULT_FPS, isValidFps } from './fps';

export { DEFAULT_FPS, isValidFps };

/** Tolerance, in frames, when deciding which frame a time falls in. 0.01 frame is 0.4 ms at 24 fps. */
const FRAME_EPSILON = 0.01;

export interface FrameRate {
  /** Frames per real second, exact (30000/1001 for 29.97). */
  exact: number;
  /** Frames counted per timecode second: 24, 25, 30, 50, 60. */
  nominal: number;
  /** Frame numbers skipped per minute in drop-frame timecode: 2 for 29.97, 4 for 59.94, otherwise 0. */
  dropFrames: number;
}

const FRACTIONAL = [24, 30, 60];

/** Normalises an `fps` value: exact rate, nominal count, and how many frame numbers drop-frame skips. */
export function resolveFrameRate(fps: number): FrameRate {
  const safe = isValidFps(fps) ? fps : DEFAULT_FPS;

  for (const nominal of FRACTIONAL) {
    const exact = (nominal * 1000) / 1001;
    if (Math.abs(safe - exact) < 0.01 && Math.abs(safe - nominal) > 0.005) {
      return { exact, nominal, dropFrames: nominal === 24 ? 0 : nominal / 15 };
    }
  }

  return { exact: safe, nominal: Math.max(1, Math.round(safe)), dropFrames: 0 };
}

function clampCount(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 0;
}

/** The frame on screen at `seconds`: frame 0 covers `[0, 1/fps)`. */
export function framesFromSeconds(seconds: number, fps: number): number {
  const { exact } = resolveFrameRate(fps);
  return Math.floor(clampCount(seconds) * exact + FRAME_EPSILON);
}

/**
 * The frame whose start is nearest to `seconds`. Use it for presentation timestamps, such as the `mediaTime` that
 * `requestVideoFrameCallback` reports, which mark the start of a frame.
 */
export function nearestFrame(seconds: number, fps: number): number {
  const { exact } = resolveFrameRate(fps);
  return Math.round(clampCount(seconds) * exact);
}

/**
 * The frame that a presented-frame timestamp belongs to. Chrome's `requestVideoFrameCallback` reports the frame's
 * start time; Firefox reports the time that was seeked to, which can be the middle of the frame (the skin seeks to
 * half a frame in). So a timestamp up to a quarter frame early still counts as that frame, and anything later inside
 * the frame is that frame. Rounding to the nearest start would move Firefox's reading to the next frame.
 */
export function presentedFrame(seconds: number, fps: number): number {
  const { exact } = resolveFrameRate(fps);
  return Math.floor(clampCount(seconds) * exact + 0.25);
}

/** The start time of a frame, in seconds. */
export function secondsFromFrames(frames: number, fps: number): number {
  const { exact } = resolveFrameRate(fps);
  return Math.floor(clampCount(frames)) / exact;
}

export interface TimecodeOptions {
  /** Use drop-frame counting. Only applies to 29.97 and 59.94; ignored for every other rate. */
  dropFrame?: boolean;
  /** Offset added before formatting, in frames: the timecode of the first frame. */
  startFrames?: number;
}

const pad = (value: number) => String(value).padStart(2, '0');

/**
 * Formats a frame number as `HH:MM:SS:FF`. Drop-frame timecode uses `;` before the frames (`HH:MM:SS;FF`), the SMPTE
 * convention. Hours are not wrapped at 24.
 */
export function formatTimecode(frames: number, fps: number, options: TimecodeOptions = {}): string {
  const { nominal, dropFrames } = resolveFrameRate(fps);
  const drop = Boolean(options.dropFrame) && dropFrames > 0;

  let count = Math.floor(clampCount(frames)) + Math.floor(clampCount(options.startFrames ?? 0));

  if (drop) {
    // Drop-frame skips `dropFrames` frame numbers at the start of every minute, except every tenth minute.
    const perMinute = nominal * 60 - dropFrames;
    const perTenMinutes = nominal * 600 - dropFrames * 9;
    const tens = Math.floor(count / perTenMinutes);
    const rest = count % perTenMinutes;
    count += dropFrames * 9 * tens;
    if (rest >= nominal * 60) count += dropFrames * (1 + Math.floor((rest - nominal * 60) / perMinute));
  }

  const ff = count % nominal;
  const ss = Math.floor(count / nominal) % 60;
  const mm = Math.floor(count / (nominal * 60)) % 60;
  const hh = Math.floor(count / (nominal * 3600));

  return `${pad(hh)}:${pad(mm)}:${pad(ss)}${drop ? ';' : ':'}${pad(ff)}`;
}

const TIMECODE = /^(\d{1,3}):(\d{2}):(\d{2})([:;])(\d{2,3})$/;

/**
 * Reads `HH:MM:SS:FF` (or `HH:MM:SS;FF`) into a frame number. Returns `null` when the text is not a timecode, a field
 * is out of range, or, in drop-frame, the text names a frame number that drop-frame skips (such as `00:01:00;00`).
 * Drop-frame applies when `dropFrame` is set or the text uses `;`, and only for 29.97 and 59.94.
 */
export function parseTimecode(text: unknown, fps: number, options: Pick<TimecodeOptions, 'dropFrame'> = {}): number | null {
  if (typeof text !== 'string') return null;

  const match = TIMECODE.exec(text.trim());
  if (!match) return null;

  const { nominal, dropFrames } = resolveFrameRate(fps);
  const [hh, mm, ss, ff] = [match[1], match[2], match[3], match[5]].map(Number) as [number, number, number, number];

  if (mm > 59 || ss > 59 || ff >= nominal) return null;

  const count = ((hh * 60 + mm) * 60 + ss) * nominal + ff;
  const drop = (Boolean(options.dropFrame) || match[4] === ';') && dropFrames > 0;
  if (!drop) return count;

  const minutes = hh * 60 + mm;
  if (ss === 0 && ff < dropFrames && minutes % 10 !== 0) return null;

  return count - dropFrames * (minutes - Math.floor(minutes / 10));
}
