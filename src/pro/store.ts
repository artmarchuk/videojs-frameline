/**
 * The pro store: a small external store, created once per `FramelineSkin`. Pure: no React, no DOM.
 * Two players on one page each have their own store; nothing here is module-level state.
 *
 * Invariants kept here, not in components:
 * - In and out points are clamped to `[0, duration]` (only to `>= 0` while the duration is unknown).
 * - A point that is not set is `null`: the range then runs from the start, or to the end, of the media. Setting In
 *   at the start (0) or Out at the end (the duration) is the same as not setting it, so it is stored as `null`.
 * - In is always before out. Setting one past the other **swaps** them, so the mark the user just made is kept.
 *   Setting a point exactly onto the other is rejected (a zero-length range has no use).
 * - Loop is on or off, and on from the start where the host allows it (the `loop` option). While on, `loopMode` says
 *   what loops: `'range'` when a point is set, `'whole'` otherwise; the store keeps it in step as points are set and
 *   cleared. A set range confines playback whether loop is on or off; that engine lives in the Studio controller.
 * - Only guides, crops and zones the host allowed can be switched on (the rules are in `view.ts`).
 * - Zoom starts at Fit and goes back to Fit when the host stops allowing it.
 */
import {
  applyGuides,
  EMPTY_VIEW,
  effectiveView,
  NOTHING_ALLOWED,
  sameEffective,
  sanitizeView,
  setCrop as cropView,
  setZones as zonesView,
  toggleGuide as guideView,
  toggleHidden as hiddenView,
  type AllowedView,
  type FramelineCropId,
  type FramelineEffectiveGuides,
  type ViewState,
  type FramelineZoneId,
} from './view';
import { isZoomLevel, nextZoom, previousZoom, type FramelineZoomLevel } from './zoom';

/** A marker on the timeline. With `end` it is a range marker. Times are in seconds. */
export interface FramelineMarker {
  /** Where the marker is, in seconds. */
  time: number;
  /** The name shown in the Markers menu and announced when the marker is selected. */
  label: string;
  /** The end of a range marker, in seconds. Left out: a point. */
  end?: number;
  /** The host's own id. It comes back unchanged in `onMarkerSelect`. */
  id?: string;
}

/** What loops: nothing, the In-to-Out range, or the whole video. */
export type FramelineLoopMode = 'off' | 'range' | 'whole';
/** What the time field shows: timecode (`HH:MM:SS:FF`) or seconds. */
export type FramelineTimeDisplay = 'timecode' | 'seconds';
/** Where frame times come from: `requestVideoFrameCallback` (`'rvfc'`), or animation frames and `currentTime` (`'raf'`). */
export type FramelineFrameClockSource = 'rvfc' | 'raf';
/** `'frame'`: the browser reported the presented frame. `'approximate'`: computed from `currentTime`. Best effort either way. */
export type FramelineFrameClockPrecision = 'frame' | 'approximate';

/** The In and Out points, as `onRangeChange` reports them. */
export interface FramelineRange {
  /** The In point in seconds; `null` when it is not set (the range starts at the start). */
  in: number | null;
  /** The Out point in seconds; `null` when it is not set (the range runs to the end). */
  out: number | null;
}

/** What `onFrameChange` reports. Best effort: see the README on frame accuracy. */
export interface FramelineFrameInfo {
  /** The frame index, from 0. */
  frame: number;
  /** The media time of the frame, in seconds. */
  time: number;
}

export interface ProState {
  inPoint: number | null;
  outPoint: number | null;
  loopMode: FramelineLoopMode;
  timeDisplay: FramelineTimeDisplay;
  /** Guides, crop mask and platform zones: what the end user chose in the Guides menu. Replaced on every change. */
  view: Readonly<ViewState>;
  /** How closely the picture is looked at. Always starts at Fit: it is not remembered. */
  zoom: FramelineZoomLevel;
  /** Current frame number, from the frame clock. Best effort. */
  frame: number;
  /** Media time of the current frame, in seconds. */
  mediaTime: number;
  clockSource: FramelineFrameClockSource | null;
  clockPrecision: FramelineFrameClockPrecision | null;
  /** Media duration in seconds; 0 while unknown. */
  duration: number;
  /** The marker the user last selected (timeline, Markers list, or previous/next cut); drawn in the accent. */
  selectedMarker: FramelineMarker | null;
  /** Playback statistics for the debug readout; `null` until the readout samples them. */
  stats: Readonly<PlaybackStats> | null;
}

/** What the debug readout shows about playback. A field is `null` where the browser lacks the API behind it. */
export interface PlaybackStats {
  /** Frames the decoder dropped, from `getVideoPlaybackQuality()`. */
  droppedFrames: number | null;
  /** Frames decoded and dropped in total, from the same call. */
  totalFrames: number | null;
  /** Frames presented over the last second, from `requestVideoFrameCallback`. */
  measuredFps: number | null;
}

export interface ProCallbacks {
  onRangeChange?: ((range: FramelineRange) => void) | undefined;
  onMarkerSelect?: ((marker: FramelineMarker) => void) | undefined;
  onFrameChange?: ((frame: FramelineFrameInfo) => void) | undefined;
  /** The set of guides that is drawn changed. Not fired for the set the store starts with. */
  onGuidesChange?: ((view: FramelineEffectiveGuides) => void) | undefined;
  /** The zoom level changed, by the user, by the host's handle, or because the host switched zoom off. */
  onZoomChange?: ((level: FramelineZoomLevel) => void) | undefined;
}

export interface ProStore {
  getState(): ProState;
  subscribe(listener: () => void): () => void;
  setIn(time: number): void;
  setOut(time: number): void;
  clearIn(): void;
  clearOut(): void;
  clearInOut(): void;
  /** Sets both points at once, with the same rules as `setIn` and `setOut`, and tells the host once. */
  setRange(inPoint: number | null, outPoint: number | null): void;
  setLoopMode(mode: FramelineLoopMode): void;
  toggleTimeDisplay(): void;
  /** Loop on or off; with no argument, toggles. On loops the range when a point is set, otherwise the whole video. */
  setLoop(on?: boolean): void;
  /** Switches one checkbox guide on or off; with no `on`, toggles it. */
  toggleGuide(id: string, on?: boolean): void;
  /** Picks a crop mask, or `null` for none. Any crop but 9:16 clears the platform zones. */
  setCrop(crop: FramelineCropId | null): void;
  /** Picks a platform's zones, or `null` for none. Picking one turns on the 9:16 crop. */
  setZones(zones: FramelineZoneId | null): void;
  /** Hides every guide, or shows the hidden set again. */
  toggleGuidesHidden(): void;
  /** Sets guides, crop and zones in one change; fields left out stay as they are. */
  setGuides(next: { guides?: readonly string[]; crop?: string | null; zones?: string | null }): void;
  /** Picks a zoom level. Ignored while the host does not allow zoom. */
  setZoom(level: FramelineZoomLevel): void;
  /** `Z`: the next level, and Fit again after the last. `-1` (`Shift+Z`) goes the other way. */
  cycleZoom(direction?: 1 | -1): void;
  selectMarker(marker: FramelineMarker): void;
  /** Drops the selection without telling the host: the playhead moved away from the marker. */
  deselectMarker(): void;
  /** Called by the frame clock. Notifies only when the frame or the media time changed. */
  setFrame(frame: number, mediaTime: number): void;
  setClock(source: FramelineFrameClockSource | null, precision: FramelineFrameClockPrecision | null): void;
  /** Called by the frame clock for every presented frame. Only counts: it notifies nobody, so nothing re-renders. */
  countPresentedFrame(): void;
  /** How many frames the clock has seen presented since the store was created. */
  presentedFrames(): number;
  /** Called by the debug readout, at most twice a second. Notifies only when a number changed. */
  setStats(stats: PlaybackStats): void;
  setDuration(duration: number): void;
  /** What the host allows. Guides, crops and zones that are no longer allowed are switched off. */
  setAllowedView(allowed: AllowedView): void;
  setCallbacks(callbacks: ProCallbacks): void;
}

const LOOP_MODES: readonly FramelineLoopMode[] = ['off', 'range', 'whole'];

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export interface ProStoreOptions {
  allowedView?: AllowedView;
  /** The view to start with, for example the remembered one. It is checked against `allowedView`. */
  view?: ViewState;
  timeDisplay?: FramelineTimeDisplay;
  /** Loop on from the start (the host allows the loop feature). Off: it stays off until switched on. */
  loop?: boolean;
}

export function createProStore(options: ProStoreOptions = {}): ProStore {
  let state: ProState = {
    inPoint: null,
    outPoint: null,
    loopMode: options.loop ? 'whole' : 'off',
    timeDisplay: options.timeDisplay ?? 'timecode',
    view: sanitizeView(options.view ?? EMPTY_VIEW, options.allowedView ?? NOTHING_ALLOWED),
    zoom: 'fit',
    frame: 0,
    mediaTime: 0,
    clockSource: null,
    clockPrecision: null,
    duration: 0,
    selectedMarker: null,
    stats: null,
  };
  let presented = 0;
  let allowed: AllowedView = options.allowedView ?? NOTHING_ALLOWED;
  let callbacks: ProCallbacks = {};
  const listeners = new Set<() => void>();

  function commit(patch: Partial<ProState>) {
    state = { ...state, ...patch };
    for (const listener of [...listeners]) listener();
  }

  function commitView(next: ViewState) {
    if (next === state.view) return;
    const before = effectiveView(state.view);
    commit({ view: Object.freeze(next) });
    const after = effectiveView(next);
    if (!sameEffective(before, after)) callbacks.onGuidesChange?.(after);
  }

  function commitZoom(level: FramelineZoomLevel) {
    commit({ zoom: level });
    callbacks.onZoomChange?.(level);
  }

  function clampTime(time: number): number | null {
    if (!Number.isFinite(time)) return null;
    const max = state.duration > 0 ? state.duration : Number.POSITIVE_INFINITY;
    return clamp(time, 0, max);
  }

  function commitRange(inPoint: number | null, outPoint: number | null, extra: Partial<ProState> = {}) {
    // Loop follows the range: with loop on, it loops the range while a point is set and the whole video otherwise.
    if (state.loopMode !== 'off') extra = { ...extra, loopMode: inPoint !== null || outPoint !== null ? 'range' : 'whole' };
    if (inPoint === state.inPoint && outPoint === state.outPoint) {
      if (Object.keys(extra).length) commit(extra);
      return;
    }
    commit({ inPoint, outPoint, ...extra });
    callbacks.onRangeChange?.({ in: inPoint, out: outPoint });
  }

  function setPoint(which: 'in' | 'out', time: number) {
    const value = clampTime(time);
    if (value === null) return;

    let inPoint = which === 'in' ? value : state.inPoint;
    let outPoint = which === 'out' ? value : state.outPoint;

    if (inPoint !== null && outPoint !== null) {
      if (inPoint === outPoint) return; // rejected: zero-length range
      if (inPoint > outPoint) [inPoint, outPoint] = [outPoint, inPoint]; // swapped
    }
    // A point at its own end of the media is "not set".
    if (inPoint !== null && inPoint <= 0) inPoint = null;
    if (outPoint !== null && state.duration > 0 && outPoint >= state.duration) outPoint = null;
    commitRange(inPoint, outPoint);
  }

  return {
    getState: () => state,

    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    setIn: (time) => setPoint('in', time),
    setOut: (time) => setPoint('out', time),

    clearIn() {
      commitRange(null, state.outPoint);
    },

    clearOut() {
      commitRange(state.inPoint, null);
    },

    clearInOut() {
      commitRange(null, null);
    },

    setRange(inTime, outTime) {
      let inPoint = inTime === null ? null : clampTime(inTime);
      let outPoint = outTime === null ? null : clampTime(outTime);
      if ((inTime !== null && inPoint === null) || (outTime !== null && outPoint === null)) return; // not a time
      if (inPoint !== null && outPoint !== null) {
        if (inPoint === outPoint) return; // rejected: zero-length range
        if (inPoint > outPoint) [inPoint, outPoint] = [outPoint, inPoint];
      }
      if (inPoint !== null && inPoint <= 0) inPoint = null;
      if (outPoint !== null && state.duration > 0 && outPoint >= state.duration) outPoint = null;
      commitRange(inPoint, outPoint);
    },

    setLoopMode(mode) {
      if (!LOOP_MODES.includes(mode) || mode === state.loopMode) return;
      commit({ loopMode: mode });
    },

    toggleTimeDisplay() {
      commit({ timeDisplay: state.timeDisplay === 'timecode' ? 'seconds' : 'timecode' });
    },

    setLoop(on) {
      const next = typeof on === 'boolean' ? on : state.loopMode === 'off';
      const mode: FramelineLoopMode = !next ? 'off' : state.inPoint !== null || state.outPoint !== null ? 'range' : 'whole';
      if (mode !== state.loopMode) commit({ loopMode: mode });
    },

    toggleGuide: (id, on) => commitView(guideView(state.view, id, allowed, on)),
    setCrop: (crop) => commitView(cropView(state.view, crop, allowed)),
    setZones: (zones) => commitView(zonesView(state.view, zones, allowed)),
    toggleGuidesHidden: () => commitView(hiddenView(state.view)),
    setGuides: (next) => commitView(applyGuides(state.view, next, allowed)),

    setZoom(level) {
      if (!allowed.zoom || !isZoomLevel(level) || level === state.zoom) return;
      commitZoom(level);
    },

    cycleZoom(direction = 1) {
      if (allowed.zoom) commitZoom(direction === -1 ? previousZoom(state.zoom) : nextZoom(state.zoom));
    },

    selectMarker(marker) {
      if (marker !== state.selectedMarker) commit({ selectedMarker: marker });
      callbacks.onMarkerSelect?.(marker);
    },

    deselectMarker() {
      if (state.selectedMarker !== null) commit({ selectedMarker: null });
    },

    setFrame(frame, mediaTime) {
      if (!Number.isFinite(frame) || !Number.isFinite(mediaTime)) return;
      if (frame === state.frame && mediaTime === state.mediaTime) return;
      const frameChanged = frame !== state.frame;
      commit({ frame, mediaTime });
      if (frameChanged) callbacks.onFrameChange?.({ frame, time: mediaTime });
    },

    setClock(source, precision) {
      if (source === state.clockSource && precision === state.clockPrecision) return;
      commit({ clockSource: source, clockPrecision: precision });
    },

    countPresentedFrame() {
      presented += 1;
    },

    presentedFrames: () => presented,

    setStats(stats) {
      const last = state.stats;
      if (last && last.droppedFrames === stats.droppedFrames && last.totalFrames === stats.totalFrames && last.measuredFps === stats.measuredFps) return;
      commit({ stats: Object.freeze({ ...stats }) });
    },

    setDuration(duration) {
      const value = Number.isFinite(duration) && duration > 0 ? duration : 0;
      if (value === state.duration) return;
      commit({ duration: value });

      // Re-apply the clamp now that the real duration is known.
      if (value > 0) {
        const inPoint = state.inPoint === null ? null : Math.min(state.inPoint, value);
        const outPoint = state.outPoint === null ? null : Math.min(state.outPoint, value);
        if (outPoint !== null && (outPoint >= value || (inPoint !== null && inPoint >= outPoint))) commitRange(inPoint, null);
        else commitRange(inPoint, outPoint);
      }
    },

    setAllowedView(next) {
      allowed = next;
      if (!allowed.zoom && state.zoom !== 'fit') commitZoom('fit');
      commitView(sanitizeView(state.view, allowed));
    },

    setCallbacks(next) {
      callbacks = next;
    },
  };
}
