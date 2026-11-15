/**
 * Ruler timeline logic. Pure: no React, no DOM. Everything the timeline lays out or decides is computed here, so it
 * can be tested without a browser.
 */
import type { Marker } from '../../store';
import { framesFromSeconds, resolveFrameRate, secondsFromFrames } from '../../timecode';
import { lastFrameOf, seekTimeForFrame } from '../logic';

/* ---------- Time and pixels ---------- */

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** Horizontal position of `time` on a track `width` pixels wide. Clamped to the track. */
export function timeToX(time: number, duration: number, width: number): number {
  if (!(duration > 0) || !(width > 0) || !Number.isFinite(time)) return 0;
  return clamp((time / duration) * width, 0, width);
}

/** The time under horizontal position `x`. Clamped to `[0, duration]`. */
export function xToTime(x: number, duration: number, width: number): number {
  if (!(duration > 0) || !(width > 0) || !Number.isFinite(x)) return 0;
  return clamp((x / width) * duration, 0, duration);
}

/** `time` as a percentage of the duration, for CSS. Clamped to 0–100. */
export function timeToPercent(time: number, duration: number): number {
  return timeToX(time, duration, 100);
}

/* ---------- Frame snapping ---------- */

/** The frame a seek to `time` lands on: the frame that contains it, never past the last frame. */
export function snapFrame(time: number, duration: number, fps: number): number {
  const frame = framesFromSeconds(time, fps);
  return duration > 0 ? Math.min(frame, lastFrameOf(duration, fps)) : frame;
}

/**
 * The time a seek to `time` is moved to in the Studio tier: the middle of the frame that contains it,
 * the same half-frame rule the step buttons use (`seekTimeForFrame`).
 */
export function snapSeekTime(time: number, duration: number, fps: number): number {
  return seekTimeForFrame(snapFrame(time, duration, fps), fps);
}

/** True when `time` already sits where `snapSeekTime` would put it (within a tenth of a millisecond). */
export function isSnapped(time: number, duration: number, fps: number): boolean {
  return Math.abs(time - snapSeekTime(time, duration, fps)) < 1e-4;
}

/* ---------- Tick chooser ---------- */

/** Smallest distance between two minor ticks, in pixels. */
export const MIN_MINOR_PX = 6;
/** Smallest distance between two labelled ticks, in pixels. */
export const MIN_LABEL_PX = 80;

/** Whole-second steps a ruler may use, in seconds. */
const SECOND_STEPS = [1, 2, 5, 10, 15, 30, 60, 120, 300, 600, 900, 1800, 3600, 7200, 10800, 21600, 43200, 86400];
/** Frame-level steps, in frames. Only those that divide a second evenly at the given rate are used. */
const FRAME_STEPS = [1, 2, 5, 10];

export interface TickPlan {
  /** Seconds between the shortest ticks. */
  minor: number;
  /** Seconds between the taller, unlabelled ticks; `null` when no step fits between minor and major. */
  mid: number | null;
  /** Seconds between the full-height, labelled ticks. Always whole seconds. */
  major: number;
}

const isMultiple = (value: number, of: number) => {
  const ratio = value / of;
  return Math.abs(ratio - Math.round(ratio)) < 1e-6 && Math.round(ratio) >= 1;
};

/**
 * Picks the tick intervals for a ruler from "nice" steps, so that minor ticks are at least `MIN_MINOR_PX` apart and
 * labelled ticks at least `MIN_LABEL_PX` apart. Frame-level ticks appear only when the width allows. Labelled ticks
 * always fall on whole seconds, and every coarser level is a multiple of the finer one, so ticks line up.
 */
export function chooseTicks(duration: number, width: number, fps: number): TickPlan {
  if (!(duration > 0) || !(width > 0)) return { minor: 1, mid: null, major: 1 };

  const { nominal, exact } = resolveFrameRate(fps);
  const pxPerSecond = width / duration;
  const frameSteps = FRAME_STEPS.filter((frames) => frames < nominal && nominal % frames === 0).map((frames) => frames / exact);
  const steps = [...frameSteps, ...SECOND_STEPS];
  const last = SECOND_STEPS[SECOND_STEPS.length - 1]!;

  const minor = steps.find((step) => step * pxPerSecond >= MIN_MINOR_PX) ?? last;
  // Frame steps are measured in exact seconds (1001/30000 for 29.97), where a whole second is not an exact multiple;
  // compare frame steps by their frame count against the nominal rate instead.
  const fits = (coarse: number, fine: number) =>
    fine >= 1 ? isMultiple(coarse, fine) : isMultiple(coarse * nominal, Math.round(fine * exact));

  const midFor = (major: number): number | null => {
    let mid: number | null = null;
    for (const step of steps) {
      if (step <= minor || step >= major) continue;
      const dividesMajor = step >= 1 ? isMultiple(major, step) : fits(major, step);
      if (dividesMajor && fits(step, minor)) mid = step; // keep the largest
    }
    return mid;
  };

  // Prefer a labelled interval that leaves room for a middle tick level (1 s, 5 s, 10 s reads better than 1 s, 5 s),
  // as long as it is no more than twice the smallest interval that fits.
  const majors = SECOND_STEPS.filter((step) => step >= minor && step * pxPerSecond >= MIN_LABEL_PX && fits(step, minor));
  const smallest = majors[0] ?? Math.max(last, minor);
  const major = majors.find((step) => step <= smallest * 2 && midFor(step) !== null) ?? smallest;
  const mid = midFor(major);

  return { minor, mid, major };
}

export type TickLevel = 'minor' | 'mid' | 'major';

export interface Tick {
  time: number;
  x: number;
  level: TickLevel;
}

/** Every tick of a plan with its position, coarsest level winning where levels coincide. */
export function buildTicks(plan: TickPlan, duration: number, width: number): Tick[] {
  if (!(duration > 0) || !(width > 0)) return [];
  const ticks: Tick[] = [];
  const count = Math.floor(duration / plan.minor + 1e-6);
  const perMid = plan.mid ? Math.round(plan.mid / plan.minor) : 0;
  const perMajor = Math.round(plan.major / plan.minor);
  for (let i = 0; i <= count; i++) {
    const time = i * plan.minor;
    const level: TickLevel = i % perMajor === 0 ? 'major' : perMid && i % perMid === 0 ? 'mid' : 'minor';
    ticks.push({ time, x: timeToX(time, duration, width), level });
  }
  return ticks;
}

/* ---------- Ruler labels ---------- */

const pad = (value: number) => String(value).padStart(2, '0');

/**
 * Compact, seconds-first ruler label: `0s`, `10s` when the whole clip is a minute or less; `0:30`, `1:30` when it
 * needs minutes; `1:00:00` only for positions of an hour or more. An hours field that would be zero is never shown,
 * and the `s` suffix appears only in the seconds-only format.
 */
export function formatRulerLabel(seconds: number, duration: number): string {
  const total = Math.max(0, Math.round(seconds));
  if (duration <= 60) return `${total}s`;
  const s = total % 60;
  if (total < 3600) return `${Math.floor(total / 60)}:${pad(s)}`;
  return `${Math.floor(total / 3600)}:${pad(Math.floor(total / 60) % 60)}:${pad(s)}`;
}

export interface RulerLabel {
  time: number;
  x: number;
  text: string;
}

/** Rough width of a label in pixels at the ruler's type size, used to keep the last label inside the track. */
export const estimateLabelWidth = (text: string, charPx = 6.4) => text.length * charPx;

/**
 * The labels of the major ticks. Each sits just right of its tick; a label that would run past the end of the track
 * is left out, so nothing overflows the container.
 */
export function buildLabels(plan: TickPlan, duration: number, width: number, inset = 4): RulerLabel[] {
  if (!(duration > 0) || !(width > 0)) return [];
  const labels: RulerLabel[] = [];
  for (let time = 0; time <= duration + 1e-6; time += plan.major) {
    const text = formatRulerLabel(time, duration);
    const x = timeToX(time, duration, width);
    if (x + inset + estimateLabelWidth(text) > width) break;
    labels.push({ time, x, text });
  }
  return labels;
}

/* ---------- Bubble clamping ---------- */

/** Centre for a bubble `bubbleWidth` wide that wants to sit at `center`, kept wholly inside `[0, containerWidth]`. */
export function clampBubble(center: number, bubbleWidth: number, containerWidth: number): number {
  const half = bubbleWidth / 2;
  if (containerWidth <= bubbleWidth) return containerWidth / 2;
  return clamp(center, half, containerWidth - half);
}

/* ---------- Markers ---------- */

/** More markers than this still render, with a development warning. */
export const MARKER_SOFT_LIMIT = 200;

/** Half the width of a pin: a pin at 0 or at the duration is moved in by this much, so it stays whole. */
const PIN_HALF = 4;

/** One marker on the ruler: a pin at its time, and a line to `endX` when the marker has an end time. */
export interface MarkerPin {
  key: string;
  /** Centre of the pin, in pixels from the left edge of the track. */
  x: number;
  /** Where the line from the pin ends, or `null` for a marker without an end time. */
  endX: number | null;
  marker: Marker;
}

const markerKey = (marker: Marker, index: number) => marker.id ?? `${index}:${marker.time}`;

/**
 * Markers the timeline can place: finite, non-negative times, sorted by time. A marker past the end is kept and
 * drawn at the end, because a host's "last frame" marker is often a few milliseconds past the media's duration.
 */
export function validMarkers(markers: readonly Marker[]): Marker[] {
  return markers
    .filter((marker) => marker && Number.isFinite(marker.time) && marker.time >= 0)
    .slice()
    .sort((a, b) => a.time - b.time);
}

/**
 * One pin per marker, in time order, so later markers are drawn on top of earlier ones. There is one visual and no
 * clustering: pins that are close together simply overlap. Pins at 0 and at the duration stay fully inside.
 */
export function layoutMarkers(markers: readonly Marker[], duration: number, width: number): MarkerPin[] {
  if (!(duration > 0) || !(width > 0)) return [];
  return validMarkers(markers).map((marker, index) => {
    const x = clamp(timeToX(marker.time, duration, width), PIN_HALF, Math.max(PIN_HALF, width - PIN_HALF));
    const hasEnd = marker.end !== undefined && Number.isFinite(marker.end) && marker.end > marker.time;
    return { key: markerKey(marker, index), x, endX: hasEnd ? Math.max(x, timeToX(marker.end!, duration, width)) : null, marker };
  });
}

/* ---------- In and Out handles ---------- */

export interface RangePoints {
  in: number | null;
  out: number | null;
}

/** How close, in pixels, a dragged handle must come to the playhead or a marker to jump onto it. */
export const MAGNET_PX = 5;

/** Width of a handle's tab, in pixels. */
export const HANDLE_TAB_PX = 9;

export interface HandleBox {
  /** The x of the point itself: the edge of the range. */
  anchor: number;
  /** Left and right edges of the visible tab. The In tab ends on the anchor, the Out tab starts on it. */
  tabLeft: number;
  tabRight: number;
  /** Left and right edges of the target. It grows away from the range, so the two targets never meet. */
  hitLeft: number;
  hitRight: number;
}

/**
 * Where a handle is, anchored on its outer edge as in editing tools: the In handle's right edge is on the In point
 * and its body hangs to the left, outside the range; the Out handle's left edge is on the Out point and its body
 * hangs to the right. `hit` is the target's width (24 px, 44 px on touch). Because both targets grow away from the
 * range, they cannot overlap while In is before Out, however short the range; the handle being dragged keeps the
 * pointer through pointer capture, so there is nothing to arbitrate.
 */
export function handleBox(which: 'in' | 'out', time: number, duration: number, width: number, hit = 24, tab = HANDLE_TAB_PX): HandleBox {
  const anchor = timeToX(time, duration, width);
  return which === 'in'
    ? { anchor, tabLeft: anchor - tab, tabRight: anchor, hitLeft: anchor - hit, hitRight: anchor }
    : { anchor, tabLeft: anchor, tabRight: anchor + tab, hitLeft: anchor, hitRight: anchor + hit };
}

/** The time a handle dragged to `x` lands on: the start of the frame under the pointer, within the clip. */
export function handleTimeFromX(x: number, width: number, duration: number, fps: number): number {
  return secondsFromFrames(snapFrame(xToTime(x, duration, width), duration, fps), fps);
}

/**
 * The time a dragged handle lands on, with magnets. A pixel covers more than one frame on most timelines, so a drag
 * could never hit the playhead or a marker exactly: within `MAGNET_PX` of one, the handle jumps to its frame. The
 * nearest magnet wins. Otherwise the handle lands on the frame under the pointer. The result is always the start
 * of a frame.
 */
export function handleDragTime(x: number, width: number, duration: number, fps: number, magnets: readonly number[] = []): number {
  let best: number | null = null;
  let bestDistance = MAGNET_PX;
  for (const time of magnets) {
    if (!Number.isFinite(time) || time < 0 || (duration > 0 && time > duration)) continue;
    const distance = Math.abs(timeToX(time, duration, width) - x);
    if (distance <= bestDistance) {
      best = time;
      bestDistance = distance;
    }
  }
  if (best !== null) return secondsFromFrames(snapFrame(best, duration, fps), fps);
  return handleTimeFromX(x, width, duration, fps);
}

/** Where a handle sits: at its point, or at its own end of the track while the point is not set. */
export function handleValue(which: 'in' | 'out', range: RangePoints, duration: number): number {
  return which === 'in' ? (range.in ?? 0) : (range.out ?? Math.max(0, duration));
}

/**
 * True when `time` is at the handle's own end of the clip: the first frame for In, the last frame (or later) for Out.
 * A handle there means "not set": the range runs from the start, or to the end.
 */
export function isAtOwnEnd(which: 'in' | 'out', time: number, duration: number, fps: number): boolean {
  const frame = framesFromSeconds(Math.max(0, time), fps);
  return which === 'in' ? frame <= 0 : duration > 0 && frame >= lastFrameOf(duration, fps);
}

export interface HandleMove {
  in: number | null;
  out: number | null;
  /** The move crossed the other point, so the two points changed places (the store's swap rule). */
  swapped: boolean;
  /** The move would put both points on one frame; nothing changes (the store's reject rule). */
  rejected: boolean;
  /** The handle is back at its own end, so its point is not set any more. */
  unset: boolean;
}

/**
 * What the range becomes when `which` moves to `time`. Mirrors the store's invariants so a drag can be previewed
 * before it is committed: clamp to `[0, duration]`, round to a frame, unset at the handle's own end, reject a
 * zero-length range, swap on crossing.
 */
export function resolveHandleMove(which: 'in' | 'out', time: number, range: RangePoints, duration: number, fps: number): HandleMove {
  const max = duration > 0 ? duration : Number.POSITIVE_INFINITY;
  const frame = snapFrame(clamp(time, 0, max), duration, fps);
  const value = secondsFromFrames(frame, fps);

  if (isAtOwnEnd(which, value, duration, fps)) {
    return { in: which === 'in' ? null : range.in, out: which === 'out' ? null : range.out, swapped: false, rejected: false, unset: true };
  }

  const other = which === 'in' ? range.out : range.in;
  if (other !== null && framesFromSeconds(other, fps) === frame) return { in: range.in, out: range.out, swapped: false, rejected: true, unset: false };

  let next: RangePoints = which === 'in' ? { in: value, out: range.out } : { in: range.in, out: value };
  let swapped = false;
  if (next.in !== null && next.out !== null && next.in > next.out) {
    next = { in: next.out, out: next.in };
    swapped = true;
  }
  return { ...next, swapped, rejected: false, unset: false };
}

/**
 * The time a handle moves to for a key press; `'clear'` when the key unsets the point (`Delete`, `Backspace`, or a
 * move that takes the handle back to its own end); `null` when the key is not a handle key. A handle whose point is
 * not set starts from its end of the clip.
 */
export function handleKeyTarget(
  key: string,
  shift: boolean,
  which: 'in' | 'out',
  range: RangePoints,
  duration: number,
  fps: number
): number | 'clear' | null {
  const lastFrame = lastFrameOf(duration, fps);
  const current = which === 'in' ? range.in : range.out;
  const frame = current === null ? (which === 'in' ? 0 : lastFrame) : framesFromSeconds(current, fps);
  // A handle's limits: its own end of the clip, and one frame short of the other point.
  const min = which === 'out' ? (range.in !== null ? framesFromSeconds(range.in, fps) + 1 : 1) : 0;
  const max = which === 'in' ? (range.out !== null ? framesFromSeconds(range.out, fps) - 1 : Math.max(0, lastFrame - 1)) : lastFrame;
  const to = (target: number): number | 'clear' => {
    const landed = clamp(target, min, Math.max(min, max));
    const time = secondsFromFrames(landed, fps);
    return isAtOwnEnd(which, time, duration, fps) ? 'clear' : time;
  };

  switch (key) {
    case 'ArrowLeft':
    case 'ArrowDown':
      return to(frame - (shift ? 10 : 1));
    case 'ArrowRight':
    case 'ArrowUp':
      return to(frame + (shift ? 10 : 1));
    case 'Home':
      return to(min);
    case 'End':
      return to(max);
    case 'Delete':
    case 'Backspace':
      return 'clear';
    default:
      return null;
  }
}

/* ---------- Range band ---------- */

export interface RangeBand {
  /** Left edge of the band, 0–100 (% of the track). */
  start: number;
  /** Right edge of the band, 0–100. */
  end: number;
  /** Right edge of the played part: the playhead, kept inside the band. */
  played: number;
}

/**
 * Geometry of the In/Out band, in percentages of the track. No point set: `null` (the track stays neutral). One
 * point set: the band runs from the start, or to the end, of the track. The played part runs from the band's start
 * to the playhead. The band is drawn to the Out time; the loop shows the Out frame before it jumps, so the range in
 * effect includes that frame, which is under a pixel at normal widths.
 */
export function rangeBand(range: RangePoints, playhead: number, duration: number): RangeBand | null {
  if (range.in === null && range.out === null) return null;
  if (!(duration > 0)) return null;
  const start = range.in === null ? 0 : timeToPercent(range.in, duration);
  const end = range.out === null ? 100 : timeToPercent(range.out, duration);
  return { start, end, played: clamp(timeToPercent(playhead, duration), start, end) };
}
