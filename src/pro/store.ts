/**
 * The pro store: a small external store, created once per `ProSkin`. Pure: no React, no DOM.
 * Two players on one page each have their own store; nothing here is module-level state.
 *
 * Invariants kept here, not in components:
 * - In and out points are clamped to `[0, duration]` (only to `>= 0` while the duration is unknown).
 * - In is always before out. Setting one past the other **swaps** them, so the mark the user just made is kept.
 *   Setting a point exactly onto the other is rejected (a zero-length range has no use).
 * - Clearing in and out resets `loopMode` from `'range'` to `'off'`.
 * - Only overlays the host allowed can be switched on.
 */
import type { GuideId } from './features';

/** A marker on the timeline. With `end` it is a range marker. Times are in seconds. */
export interface Marker {
  time: number;
  label: string;
  end?: number;
  id?: string;
}

export type LoopMode = 'off' | 'range' | 'whole';
export type TimeDisplay = 'timecode' | 'seconds';
export type Channel = 'rgb' | 'r' | 'g' | 'b' | 'luma';
export type Zoom = 'fit' | '100%' | number;
export type FrameClockSource = 'rvfc' | 'raf';
export type FrameClockPrecision = 'frame' | 'approximate';

export interface Inspection {
  channel: Channel;
  /** Display gain, a multiplier. 1 is unchanged. Clamped to 0–8. */
  gain: number;
  /** Display gamma. 1 is unchanged. Clamped to 0.1–4. */
  gamma: number;
  zoom: Zoom;
}

export interface InOutRange {
  in: number | null;
  out: number | null;
}

export interface FrameInfo {
  frame: number;
  time: number;
}

export interface ProState {
  inPoint: number | null;
  outPoint: number | null;
  loopMode: LoopMode;
  timeDisplay: TimeDisplay;
  /** Guide ids currently on. A new set is created on every change, so it can be compared by reference. */
  activeOverlays: ReadonlySet<string>;
  inspection: Readonly<Inspection>;
  /** Current frame number, from the frame clock. Best effort. */
  frame: number;
  /** Media time of the current frame, in seconds. */
  mediaTime: number;
  clockSource: FrameClockSource | null;
  clockPrecision: FrameClockPrecision | null;
  /** Media duration in seconds; 0 while unknown. */
  duration: number;
}

export interface ProCallbacks {
  onInOutChange?: ((range: InOutRange) => void) | undefined;
  onMarkerSelect?: ((marker: Marker) => void) | undefined;
  onFrameChange?: ((frame: FrameInfo) => void) | undefined;
}

export interface ProStore {
  getState(): ProState;
  subscribe(listener: () => void): () => void;
  setIn(time: number): void;
  setOut(time: number): void;
  clearInOut(): void;
  setLoopMode(mode: LoopMode): void;
  toggleTimeDisplay(): void;
  toggleOverlay(id: string, on?: boolean): void;
  setInspection(patch: Partial<Inspection>): void;
  resetInspection(): void;
  selectMarker(marker: Marker): void;
  /** Called by the frame clock. Notifies only when the frame or the media time changed. */
  setFrame(frame: number, mediaTime: number): void;
  setClock(source: FrameClockSource | null, precision: FrameClockPrecision | null): void;
  setDuration(duration: number): void;
  /** The guide ids the host allows. Active overlays that are no longer allowed are switched off. */
  setAllowedOverlays(ids: readonly string[]): void;
  setCallbacks(callbacks: ProCallbacks): void;
}

export const DEFAULT_INSPECTION: Readonly<Inspection> = Object.freeze({ channel: 'rgb', gain: 1, gamma: 1, zoom: 'fit' });

const CHANNELS: readonly Channel[] = ['rgb', 'r', 'g', 'b', 'luma'];
const LOOP_MODES: readonly LoopMode[] = ['off', 'range', 'whole'];

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export interface ProStoreOptions {
  allowedOverlays?: readonly (GuideId | string)[];
  timeDisplay?: TimeDisplay;
}

export function createProStore(options: ProStoreOptions = {}): ProStore {
  let state: ProState = {
    inPoint: null,
    outPoint: null,
    loopMode: 'off',
    timeDisplay: options.timeDisplay ?? 'timecode',
    activeOverlays: new Set<string>(),
    inspection: DEFAULT_INSPECTION,
    frame: 0,
    mediaTime: 0,
    clockSource: null,
    clockPrecision: null,
    duration: 0,
  };
  let allowed = new Set<string>(options.allowedOverlays ?? []);
  let callbacks: ProCallbacks = {};
  const listeners = new Set<() => void>();

  function commit(patch: Partial<ProState>) {
    state = { ...state, ...patch };
    for (const listener of [...listeners]) listener();
  }

  function clampTime(time: number): number | null {
    if (!Number.isFinite(time)) return null;
    const max = state.duration > 0 ? state.duration : Number.POSITIVE_INFINITY;
    return clamp(time, 0, max);
  }

  function commitRange(inPoint: number | null, outPoint: number | null, extra: Partial<ProState> = {}) {
    if (inPoint === state.inPoint && outPoint === state.outPoint) {
      if (Object.keys(extra).length) commit(extra);
      return;
    }
    commit({ inPoint, outPoint, ...extra });
    callbacks.onInOutChange?.({ in: inPoint, out: outPoint });
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

    clearInOut() {
      commitRange(null, null, state.loopMode === 'range' ? { loopMode: 'off' } : {});
    },

    setLoopMode(mode) {
      if (!LOOP_MODES.includes(mode) || mode === state.loopMode) return;
      commit({ loopMode: mode });
    },

    toggleTimeDisplay() {
      commit({ timeDisplay: state.timeDisplay === 'timecode' ? 'seconds' : 'timecode' });
    },

    toggleOverlay(id, on) {
      const active = state.activeOverlays.has(id);
      const next = on ?? !active;
      if (next === active) return;
      if (next && !allowed.has(id)) return;

      const overlays = new Set(state.activeOverlays);
      if (next) overlays.add(id);
      else overlays.delete(id);
      commit({ activeOverlays: overlays });
    },

    setInspection(patch) {
      const next: Inspection = { ...state.inspection };
      if (patch.channel !== undefined && CHANNELS.includes(patch.channel)) next.channel = patch.channel;
      if (patch.gain !== undefined && Number.isFinite(patch.gain)) next.gain = clamp(patch.gain, 0, 8);
      if (patch.gamma !== undefined && Number.isFinite(patch.gamma)) next.gamma = clamp(patch.gamma, 0.1, 4);
      if (patch.zoom !== undefined) {
        if (patch.zoom === 'fit' || patch.zoom === '100%') next.zoom = patch.zoom;
        else if (typeof patch.zoom === 'number' && Number.isFinite(patch.zoom) && patch.zoom > 0) next.zoom = patch.zoom;
      }

      const current = state.inspection;
      if (
        next.channel === current.channel &&
        next.gain === current.gain &&
        next.gamma === current.gamma &&
        next.zoom === current.zoom
      )
        return;
      commit({ inspection: Object.freeze(next) });
    },

    resetInspection() {
      if (state.inspection !== DEFAULT_INSPECTION) commit({ inspection: DEFAULT_INSPECTION });
    },

    selectMarker(marker) {
      callbacks.onMarkerSelect?.(marker);
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

    setDuration(duration) {
      const value = Number.isFinite(duration) && duration > 0 ? duration : 0;
      if (value === state.duration) return;
      commit({ duration: value });

      // Re-apply the clamp now that the real duration is known.
      if (value > 0) {
        const inPoint = state.inPoint === null ? null : Math.min(state.inPoint, value);
        const outPoint = state.outPoint === null ? null : Math.min(state.outPoint, value);
        if (inPoint !== null && outPoint !== null && inPoint >= outPoint) commitRange(inPoint, null);
        else commitRange(inPoint, outPoint);
      }
    },

    setAllowedOverlays(ids) {
      allowed = new Set(ids);
      const kept = [...state.activeOverlays].filter((id) => allowed.has(id));
      if (kept.length !== state.activeOverlays.size) commit({ activeOverlays: new Set(kept) });
    },

    setCallbacks(next) {
      callbacks = next;
    },
  };
}
