/**
 * Studio transport logic. Pure: no React, no DOM. Everything the Studio controls decide is decided here, so it can be
 * tested without a browser.
 */
import type { FramelineLinkPosition } from '../api';
import type { FramelineMarker } from '../store';
import { formatTimecode, framesFromSeconds, parseTimecode, resolveFrameRate, type TimecodeOptions } from '../timecode';

/**
 * Where inside a frame a seek aims, as a fraction of the frame. Half a frame keeps the seek clear of both
 * boundaries, so rounding in the browser cannot land it on a neighbouring frame.
 */
export const SEEK_OFFSET = 0.5;

/** Below this player width the dock uses its narrow arrangement. */
export const DOCK_NARROW_BELOW = 740;

/**
 * The dock's narrow arrangement: a player under 740 px wide (the one-row arrangement needs about 736 px even after
 * it has shed what it can), or any touch device, where every target is 44 px and one row has no room for them. A
 * width that is not measured yet counts as wide.
 */
export function isNarrowDock(width: number, coarsePointer = false): boolean {
  if (coarsePointer) return true;
  return width > 0 && width < DOCK_NARROW_BELOW;
}

/** Frames jumped by `Shift+←` and `Shift+→`. */
export const JUMP_FRAMES = 10;

/**
 * From this player width the narrow dock has room for the instrument on row one: the timecode joined to its link
 * button, the transport, and Loop at the end (15 + 92 + 2 + 50 + 6 + 232 + 6 + 44 + 15 = 462 px at 44 px targets).
 */
export const DOCK_NARROW_KEYS_FROM = 500;

/**
 * The narrow dock has two arrangements. `keys`: row one is the instrument (timecode and link, transport, Loop) and
 * row two the flat toolbar. `compact`, under 500 px (a phone held upright): Loop and the link button are cells of
 * row two.
 */
export function narrowDockRows(width: number): 'keys' | 'compact' {
  return width >= DOCK_NARROW_KEYS_FROM ? 'keys' : 'compact';
}

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
  marker?: FramelineMarker;
}

/**
 * The cut list: chapter starts when the media has chapters, otherwise the host's markers. Sorted by time, with cuts
 * that fall on the same frame merged (the first one wins).
 */
export function buildCutList(chapterStarts: readonly number[], markers: readonly FramelineMarker[], fps: number): Cut[] {
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

export type PlaybackDecision = 'continue' | 'jumpToIn' | 'stopAtOut';

export interface PlaybackInput {
  mediaTime: number;
  range: Range;
  duration: number;
  fps: number;
  /** Loop on: at Out, playback goes back to In. Off: it pauses on the Out frame. */
  loop: boolean;
  /** Playback is just starting: from outside the range, or from the Out frame, it starts at In. */
  starting?: boolean;
}

/** Out counts as reached half a frame early, because the clock reports the frame that is already on screen. */
function halfFrame(fps: number): number {
  return SEEK_OFFSET / resolveFrameRate(fps).exact;
}

/** Whether `mediaTime` is outside the range: before In, or at or past Out (half a frame early). */
export function outsideRange(mediaTime: number, range: Range, duration: number, fps: number): boolean {
  const effective = effectiveRange(range, duration);
  if (!effective) return false;
  const half = halfFrame(fps);
  return mediaTime < effective.start - half || (effective.end !== null && mediaTime >= effective.end - half);
}

/**
 * What playback does at `mediaTime` while a range is set. Starting from outside the range, or from the Out frame, it
 * starts at In. While playing: at Out it goes back to In with loop on and pauses on the Out frame with loop off;
 * before In (the range was just set or moved past the playhead) it goes to In. Expect a one-frame overshoot at the
 * loop point now and then: loops are not exact.
 */
export function playbackDecision(input: PlaybackInput): PlaybackDecision {
  const range = effectiveRange(input.range, input.duration);
  if (!range) return 'continue';

  const half = halfFrame(input.fps);
  const atOut = range.end !== null && input.mediaTime >= range.end - half;
  const beforeIn = input.mediaTime < range.start - half;
  if (input.starting) return atOut || beforeIn ? 'jumpToIn' : 'continue';
  if (atOut) return input.loop ? 'jumpToIn' : 'stopAtOut';
  if (beforeIn) return 'jumpToIn';
  return 'continue';
}

/**
 * Links to a frame. A link carries two keys in the URL fragment: `t`, the position in seconds as W3C Media Fragments
 * URI 1.0 defines it, so any tool that reads media fragments opens the right second, and `tc`, the timecode on
 * screen, so Frameline opens the exact frame. `#t=62.104&tc=00:01:02:02`. Media Fragments tells players to ignore
 * keys they do not know, so `tc` is safe beside `t`. Links written before this format (`#t=HH:MM:SS:FF`) still read.
 */
const T_KEY = 't';
const TC_KEY = 'tc';

/** A text fragment directive (`:~:text=…`) ends the part of the hash that holds keys. */
const DIRECTIVE = ':~:';

/** The raw values of the link keys in a hash, percent-decoded. A key that is absent or unreadable is `null`. */
export interface LinkFields {
  t: string | null;
  tc: string | null;
}

/** What a link names, as `formatLinkPosition` writes it. */
export interface LinkValue {
  t: string;
  tc: string;
}

function splitDirective(hash: string): [string, string] {
  const body = hash.replace(/^#/, '');
  const at = body.indexOf(DIRECTIVE);
  return at === -1 ? [body, ''] : [body.slice(0, at), body.slice(at)];
}

function keyOf(part: string): string {
  const at = part.indexOf('=');
  return at === -1 ? part : part.slice(0, at);
}

/**
 * Puts a position into a URL hash as `t=<seconds>&tc=<timecode>`, keeping whatever else the host app keeps there, in
 * its order. An existing `t` and `tc` are removed and the new pair goes at the end, before a text fragment directive
 * if there is one. `#chapter-2` becomes `#chapter-2&t=12.229&tc=00:00:12:05`.
 */
export function withLinkPosition(hash: string, value: LinkValue): string {
  const [keys, directive] = splitDirective(hash);
  const parts = keys.split('&').filter((part) => part && keyOf(part) !== T_KEY && keyOf(part) !== TC_KEY);
  parts.push(linkFragment(value));
  return `#${parts.join('&')}${directive}`;
}

/**
 * The position as it stands in a hash, without `#`: `t=62.104&tc=00:01:02:02`. The one place that writes the pair:
 * `withLinkPosition` uses it for the skin's own links, and a host's `linkUrl` function receives it as `fragment`.
 */
export function linkFragment(value: LinkValue): string {
  return `${T_KEY}=${value.t}&${TC_KEY}=${value.tc}`;
}

/** What Copy link does with the host's `linkUrl`. `warning` is for the developer, in development only. */
export type LinkResolution =
  | { action: 'copy'; url: string; warning?: string }
  /** The host's function returned `null`: it handled the action itself. Nothing is copied or announced. */
  | { action: 'handled' }
  /** The host's function threw or returned something that is not a URL. Nothing is copied; the failure is announced. */
  | { action: 'fail'; warning: string };

function baseWithPosition(base: URL, value: LinkValue): string {
  const { hash } = base;
  base.hash = '';
  // `href` keeps a bare `#` in some engines after the hash is cleared.
  return `${base.href.replace(/#$/, '')}${withLinkPosition(hash, value)}`;
}

/**
 * The URL that Copy link copies, from the host's `linkUrl`. Pure: the page URL is passed in.
 *
 * - Not given: the page's URL with the position in its hash, keeping the page's other hash keys.
 * - A string: that URL, resolved against the page (so a relative path works), with the position in its hash beside
 *   its own hash keys. A string that is not a URL falls back to the page's URL, with a warning.
 * - A function: called with the position. A string it returns is copied as it is; `null` means the host handled it;
 *   a throw or any other value is a failure.
 */
export function resolveLinkUrl(linkUrl: unknown, position: FramelineLinkPosition, value: LinkValue, pageUrl: string): LinkResolution {
  const page = () => baseWithPosition(new URL(pageUrl), value);

  if (linkUrl === undefined || linkUrl === null) return { action: 'copy', url: page() };

  if (typeof linkUrl === 'string') {
    try {
      return { action: 'copy', url: baseWithPosition(new URL(linkUrl, pageUrl), value) };
    } catch {
      return { action: 'copy', url: page(), warning: `linkUrl "${linkUrl}" is not a valid URL; copying the page's URL instead.` };
    }
  }

  if (typeof linkUrl !== 'function') {
    return { action: 'copy', url: page(), warning: `linkUrl must be a string or a function; copying the page's URL instead.` };
  }

  let result: unknown;
  try {
    result = (linkUrl as (position: FramelineLinkPosition) => unknown)(position);
  } catch (error) {
    return { action: 'fail', warning: `The linkUrl function threw: ${error instanceof Error ? error.message : String(error)}. Nothing was copied.` };
  }
  if (result === null) return { action: 'handled' };
  if (typeof result === 'string' && result !== '') return { action: 'copy', url: result };
  const got = result instanceof Promise ? 'a promise (the function must be synchronous)' : result === '' ? 'an empty string' : typeof result;
  return { action: 'fail', warning: `The linkUrl function must return a URL string or null; it returned ${got}. Nothing was copied.` };
}

/**
 * The raw `t` and `tc` values in a hash. Reading stops at a text fragment directive (`:~:`). When a key appears
 * more than once, the last one counts, as in Media Fragments.
 */
export function readLinkPosition(hash: string): LinkFields {
  const fields: LinkFields = { t: null, tc: null };
  const [keys] = splitDirective(hash);
  for (const part of keys.split('&')) {
    const at = part.indexOf('=');
    if (at === -1) continue;
    const key = part.slice(0, at);
    if (key !== T_KEY && key !== TC_KEY) continue;
    let value: string | null;
    try {
      value = decodeURIComponent(part.slice(at + 1)) || null;
    } catch {
      value = null;
    }
    fields[key] = value;
  }
  return fields;
}

/**
 * The seconds of a link: the middle of the frame, from the start of the media, at the exact rate, rounded to three
 * decimals with no trailing zeros. The middle, because the start of a frame rounded to milliseconds can fall into
 * the frame before (frame 1490 at 24 fps starts at 62.0833 s; 62.083 is frame 1489, its middle 62.104 is 1490).
 */
export function linkSeconds(frame: number, fps: number): string {
  const { exact } = resolveFrameRate(fps);
  const seconds = (Math.max(0, Math.floor(frame)) + 0.5) / exact;
  return String(Number(seconds.toFixed(3)));
}

/** Link value for a frame: `t` in seconds, `tc` the timecode the field shows (start offset and drop-frame included). */
export function formatLinkPosition(frame: number, fps: number, options: TimecodeOptions = {}): LinkValue {
  return { t: linkSeconds(frame, fps), tc: formatTimecode(frame, fps, options) };
}

/** The start of a range (`10,20` is 10, `,20` is 0). A value with no comma is returned as it is. */
function rangeStart(value: string): string {
  const at = value.indexOf(',');
  if (at === -1) return value;
  return value.slice(0, at) || '0';
}

const NPT_SECONDS = /^(\d+(?:\.\d*)?)$/;
const NPT_MMSS = /^(\d{1,2}):(\d{2}(?:\.\d*)?)$/;
const NPT_HHMMSS = /^(\d+):(\d{2}):(\d{2}(?:\.\d*)?)$/;
const SHORTHAND = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+(?:\.\d+)?)s)?$/i;

/**
 * Seconds in a link's `t`: every Media Fragments form (`62.5`, `npt:62.5`, `1:02.5`, `0:01:02.5`) and the video
 * platforms' shorthand (`90s`, `1m42s`, `1h2m3s`). `null` for anything else.
 */
export function parseLinkSeconds(value: string): number | null {
  const text = value.trim();
  const npt = text.replace(/^npt:/, '');

  let match = NPT_SECONDS.exec(npt);
  if (match) return Number(match[1]);

  match = NPT_MMSS.exec(npt);
  if (match) {
    const [mm, ss] = [Number(match[1]), Number(match[2])];
    return mm < 60 && ss < 60 ? mm * 60 + ss : null;
  }

  match = NPT_HHMMSS.exec(npt);
  if (match) {
    const [hh, mm, ss] = [Number(match[1]), Number(match[2]), Number(match[3])];
    return mm < 60 && ss < 60 ? hh * 3600 + mm * 60 + ss : null;
  }

  match = SHORTHAND.exec(text);
  if (match && (match[1] || match[2] || match[3])) {
    return Number(match[1] ?? 0) * 3600 + Number(match[2] ?? 0) * 60 + Number(match[3] ?? 0);
  }
  return null;
}

const FOUR_FIELDS = /^(\d{1,3}:\d{2}:\d{2})([:;.])(\d{2,3})$/;

/**
 * A timecode in a link, read with the player's rate, start offset and drop-frame setting, as a frame number from the
 * start of the media. `;` before the frames means drop-frame; in `tc`, so does `.` (`allowDot`). `null` when the text
 * is not a timecode, or names a frame before the start offset.
 */
function parseLinkTimecode(value: string, fps: number, options: TimecodeOptions, allowDot: boolean): number | null {
  const match = FOUR_FIELDS.exec(value.trim());
  if (!match) return null;
  if (match[2] === '.' && !allowDot) return null;
  const frames = parseTimecode(`${match[1]}${match[2] === '.' ? ';' : match[2]}${match[3]}`, fps, options);
  if (frames === null) return null;
  const frame = frames - Math.floor(options.startFrames ?? 0);
  return frame >= 0 ? frame : null;
}

/** Where a link points, and the frame its other key named when the two disagree. */
export interface LinkTarget {
  frame: number;
  /** Which key gave the frame. */
  from: 'tc' | 't';
  /** Set when `tc` and `t` both name a frame inside the media, more than one frame apart: the frame `t` named. */
  disagreement: number | null;
}

/**
 * The frame a link opens on. Reads, in order, and takes the first that gives a frame inside the media
 * (`0` to `lastFrame`):
 * 1. `tc`, a timecode;
 * 2. `t` holding a timecode (`HH:MM:SS:FF` or `HH:MM:SS;FF`, links written before `tc`; a Media Fragments value never
 *    has four fields);
 * 3. `t` in seconds, in every Media Fragments form;
 * 4. `t` in the platforms' shorthand (`1m42s`).
 * Seconds become the frame that contains them. A range (`t=10,20`, `tc=a,b`) is read from its start. `null` when
 * nothing can be read.
 */
export function resolveLinkPosition(
  fields: LinkFields,
  fps: number,
  options: TimecodeOptions = {},
  lastFrame = Number.POSITIVE_INFINITY,
): LinkTarget | null {
  const inside = (frame: number | null) => (frame !== null && frame >= 0 && frame <= lastFrame ? frame : null);

  let tc: number | null = null;
  if (fields.tc !== null) {
    const start = fields.tc.trim();
    // An empty range start (`tc=,b`) is the start of the media.
    tc = inside(start.startsWith(',') ? 0 : parseLinkTimecode(rangeStart(start), fps, options, true));
  }

  let t: number | null = null;
  if (fields.t !== null) {
    const start = rangeStart(fields.t.trim());
    const fromTimecode = parseLinkTimecode(start, fps, options, false);
    if (fromTimecode !== null) t = inside(fromTimecode);
    else {
      const seconds = parseLinkSeconds(start);
      t = seconds === null ? null : inside(framesFromSeconds(seconds, fps));
    }
  }

  if (tc !== null) return { frame: tc, from: 'tc', disagreement: t !== null && Math.abs(tc - t) > 1 ? t : null };
  if (t !== null) return { frame: t, from: 't', disagreement: null };
  return null;
}

/** `frame_00-00-12-05.png`: the title (or "frame"), then the timecode with dashes. */
/**
 * Where the quiet leading part of a timecode ends. The rule:
 * 1. The lead is the run of `0`, `:` and `;` before the first digit that is not zero.
 * 2. It never reaches into the last two characters (the frames).
 * 3. It never splits the hours field: a run that stops before the first separator is no lead at all, so
 *    `01:00:00:00` and `09:59:00:00` are drawn whole.
 * Examples: `00:00:02:04` gives 7 (`00:00:0`), `00:00:00:00` gives 9,
 * `01:00:00:00` gives 0. Seconds (`2.167`) have no lead. A plain scan: it runs on every frame.
 */
export function timecodeLeadLength(value: string, seconds = false): number {
  if (seconds) return 0;
  const limit = value.length - 2;
  let index = 0;
  let pastFirstField = false;
  while (index < limit) {
    const char = value.charCodeAt(index);
    // "0" is 48, ":" 58, ";" 59.
    if (char === 58 || char === 59) pastFirstField = true;
    else if (char !== 48) break;
    index++;
  }
  return pastFirstField ? index : 0;
}

export function grabFileName(title: string | null | undefined, timecode: string): string {
  const base = (title ?? '').trim().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'frame';
  return `${base}_${timecode.replace(/[:;]/g, '-')}.png`;
}
