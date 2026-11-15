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
 * The time a seek to `time` is moved to in the Review and Studio tiers: the middle of the frame that contains it,
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

/** Point markers closer than this share one cluster badge. */
export const CLUSTER_PX = 12;
/** More markers than this still render, with a development warning. */
export const MARKER_SOFT_LIMIT = 200;

const POINT_WIDTH = 10;
const CLUSTER_WIDTH = 20;
const MIN_RANGE_WIDTH = 6;

export type MarkerItem =
  | { kind: 'point'; key: string; x: number; markers: readonly [Marker] }
  | { kind: 'cluster'; key: string; x: number; markers: readonly Marker[] }
  | { kind: 'range'; key: string; x: number; width: number; markers: readonly [Marker] };

const markerKey = (marker: Marker, index: number) => marker.id ?? `${index}:${marker.time}`;

/**
 * Markers the timeline can place: finite, non-negative times, sorted by time. A marker past the end is kept and
 * drawn at the end, because a host's "last frame" marker is often a few milliseconds past the media's duration.
 */
export function validMarkers(markers: readonly Marker[], _duration?: number): Marker[] {
  return markers
    .filter((marker) => marker && Number.isFinite(marker.time) && marker.time >= 0)
    .slice()
    .sort((a, b) => a.time - b.time);
}

/**
 * Lays the markers out in the marker lane.
 *
 * - A marker with `end` is a range: a thin bar from its start to its end, at least `MIN_RANGE_WIDTH` wide.
 * - Other markers are points. Points closer than `CLUSTER_PX` collapse into one cluster with a count; a single lane
 *   stays readable at any width, where stacked rows would not on a phone.
 * - Positions are clamped so a marker at 0 or at the duration stays fully inside the lane.
 */
export function layoutMarkers(markers: readonly Marker[], duration: number, width: number): MarkerItem[] {
  if (!(duration > 0) || !(width > 0)) return [];
  const sorted = validMarkers(markers, duration);
  const items: MarkerItem[] = [];

  sorted.forEach((marker, index) => {
    if (marker.end === undefined || !Number.isFinite(marker.end) || marker.end <= marker.time) return;
    const start = timeToX(marker.time, duration, width);
    const end = timeToX(marker.end, duration, width);
    const barWidth = Math.min(width, Math.max(MIN_RANGE_WIDTH, end - start));
    items.push({ kind: 'range', key: `r-${markerKey(marker, index)}`, x: clamp(start, 0, width - barWidth), width: barWidth, markers: [marker] });
  });

  let group: { first: number; last: number; markers: Marker[]; index: number } | null = null;
  const flush = () => {
    if (!group) return;
    const single = group.markers.length === 1;
    const half = (single ? POINT_WIDTH : CLUSTER_WIDTH) / 2;
    const x = clamp((group.first + group.last) / 2, half, Math.max(half, width - half));
    const key = `${single ? 'p' : 'c'}-${markerKey(group.markers[0]!, group.index)}`;
    if (single) items.push({ kind: 'point', key, x, markers: [group.markers[0]!] });
    else items.push({ kind: 'cluster', key, x, markers: group.markers });
    group = null;
  };

  sorted.forEach((marker, index) => {
    if (marker.end !== undefined && Number.isFinite(marker.end) && marker.end > marker.time) return;
    const x = timeToX(marker.time, duration, width);
    if (group && x - group.last < CLUSTER_PX) {
      group.last = x;
      group.markers.push(marker);
      return;
    }
    flush();
    group = { first: x, last: x, markers: [marker], index };
  });
  flush();

  return items.sort((a, b) => a.x - b.x);
}

/* ---------- In and Out handles ---------- */

export interface RangePoints {
  in: number | null;
  out: number | null;
}

/** The time a handle dragged to `x` lands on: the start of the frame under the pointer, within the clip. */
export function handleTimeFromX(x: number, width: number, duration: number, fps: number): number {
  return secondsFromFrames(snapFrame(xToTime(x, duration, width), duration, fps), fps);
}

export interface HandleMove {
  in: number | null;
  out: number | null;
  /** The move crossed the other point, so the two points changed places (the store's swap rule). */
  swapped: boolean;
  /** The move would put both points on one frame; nothing changes (the store's reject rule). */
  rejected: boolean;
}

/**
 * What the range becomes when `which` moves to `time`. Mirrors the store's invariants so a drag can be previewed
 * before it is committed: clamp to `[0, duration]`, round to a frame, reject a zero-length range, swap on crossing.
 */
export function resolveHandleMove(which: 'in' | 'out', time: number, range: RangePoints, duration: number, fps: number): HandleMove {
  const max = duration > 0 ? duration : Number.POSITIVE_INFINITY;
  const frame = snapFrame(clamp(time, 0, max), duration, fps);
  const value = secondsFromFrames(frame, fps);
  const other = which === 'in' ? range.out : range.in;

  if (other !== null && framesFromSeconds(other, fps) === frame) return { in: range.in, out: range.out, swapped: false, rejected: true };

  let next: RangePoints = which === 'in' ? { in: value, out: range.out } : { in: range.in, out: value };
  let swapped = false;
  if (next.in !== null && next.out !== null && next.in > next.out) {
    next = { in: next.out, out: next.in };
    swapped = true;
  }
  return { ...next, swapped, rejected: false };
}

/** The time a handle moves to for a key press, or `'clear'`, or `null` when the key is not a handle key. */
export function handleKeyTarget(
  key: string,
  shift: boolean,
  which: 'in' | 'out',
  range: RangePoints,
  duration: number,
  fps: number
): number | 'clear' | null {
  const current = which === 'in' ? range.in : range.out;
  if (current === null) return null;
  const frame = framesFromSeconds(current, fps);
  const lastFrame = lastFrameOf(duration, fps);
  // A handle's limits: the clip, and one frame short of the other point.
  const min = which === 'out' && range.in !== null ? framesFromSeconds(range.in, fps) + 1 : 0;
  const max = which === 'in' && range.out !== null ? framesFromSeconds(range.out, fps) - 1 : lastFrame;
  const to = (target: number) => secondsFromFrames(clamp(target, min, Math.max(min, max)), fps);

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
  /** The In point is not set: the band runs from the start of the track and fades in. */
  openStart: boolean;
  /** The Out point is not set: the band runs to the end of the track and fades out. */
  openEnd: boolean;
}

/**
 * Geometry of the In/Out band, in percentages of the track. No point set: `null` (the track shows plain progress).
 * One point set: the band runs to the open end of the track. The played part runs from the band's start to the
 * playhead. The band is drawn to the Out time; the loop shows the Out frame before it jumps, so the range in effect
 * includes that frame, which is under a pixel at normal widths.
 */
export function rangeBand(range: RangePoints, playhead: number, duration: number): RangeBand | null {
  if (range.in === null && range.out === null) return null;
  if (!(duration > 0)) return null;
  const start = range.in === null ? 0 : timeToPercent(range.in, duration);
  const end = range.out === null ? 100 : timeToPercent(range.out, duration);
  return {
    start,
    end,
    played: clamp(timeToPercent(playhead, duration), start, end),
    openStart: range.in === null,
    openEnd: range.out === null,
  };
}

/** `17 s`, `1 min 5 s`, `0.5 s`: the length of a range in plain words. */
export function formatRangeLength(seconds: number): string {
  const value = Math.max(0, seconds);
  if (value < 10 && Math.abs(value - Math.round(value)) > 0.05) return `${value.toFixed(1)} s`;
  const total = Math.round(value);
  if (total < 60) return `${total} s`;
  const m = Math.floor(total / 60);
  const s = total % 60;
  return s ? `${m} min ${s} s` : `${m} min`;
}
