/**
 * The imperative handle of `FramelineSkin`: a host app drives the Studio tools from its own UI through it, for
 * example a "Show the safe area" button or a comment that jumps to its range. Types only; the handle is filled by the
 * Studio layer, so it is `null` in the Viewer tier and until the pro code has loaded.
 *
 * Every call follows the feature flags: a call for a feature that is switched off does nothing. Calls are silent:
 * they are not announced to screen readers, so the host's own control should say what it did. The matching event
 * (`onInOutChange`, `onGuidesChange`, `onZoomChange`, `onFrameGrab`) fires as it does for the user's own action.
 */
import type { ZoomLevel } from './zoom';

export interface FramelineGuidesInput {
  /** The checkbox guides to have on (`'title-safe'`, `'action-safe'`, `'thirds'`, `'centre'`); the others go off. */
  guides?: readonly string[];
  /** The crop mask (`'9:16'`, `'4:5'`, `'1:1'`, `'2.39'`, `'1.85'`), or `null` for none. */
  crop?: string | null;
  /** The platform zones (`'shorts'`, `'reels'`, `'tiktok'`), or `null` for none. A platform brings the 9:16 crop. */
  zones?: string | null;
}

export interface FramelineApi {
  /** Seeks to the frame that contains `time` (seconds). */
  seek(time: number): void;
  /** Steps `frames` frames from the current one (negative: back). Pauses first. Needs `frameStep`. */
  step(frames: number): void;
  /** Sets the In and Out points, in seconds; `null` leaves that side at the start or the end. Needs `inOut`. */
  setRange(range: { in: number | null; out: number | null }): void;
  /** Loop on or off: the range when one is set, otherwise the whole video. Needs `loop`. */
  setLoop(on: boolean): void;
  /** Sets the guides that are drawn. Fields left out are not changed. Only what `features` allows is switched on. */
  setGuides(next: FramelineGuidesInput): void;
  /** Sets the zoom level: `'fit'`, `'100'`, `'150'`, `'200'` or `'400'`. Needs `zoom`. */
  setZoom(level: ZoomLevel): void;
  /** Moves the zoomed view by a tenth of what is visible. Does nothing at Fit. */
  pan(direction: 'left' | 'right' | 'up' | 'down'): void;
  /** Downloads the current frame as a PNG, like the Grab frame button. Needs `grabFrame`. */
  grabFrame(): void;
}
