/**
 * The imperative handle of `FramelineSkin`: a host app drives the Studio tools from its own UI through it, for
 * example a "Show the safe area" button or a comment that jumps to its range. Types only; the handle is filled by the
 * Studio layer, so it is `null` in the Viewer tier and until the pro code has loaded.
 *
 * Every call follows the feature flags: a call for a feature that is switched off does nothing. Calls are silent:
 * they are not announced to screen readers, so the host's own control should say what it did. The matching event
 * (`onRangeChange`, `onGuidesChange`, `onZoomChange`, `onFrameGrab`) fires as it does for the user's own action.
 *
 * The handle can be called before the media is ready (no duration yet, no frame decoded). `setRange`, `setLoop`,
 * `setGuides` and `setZoom` apply at once. `seek` and `step` wait and are sent once the duration is known: steps add
 * up, a seek replaces the steps before it, and steps after a seek count from its frame. `pan` and `grabFrame` do
 * nothing then.
 */
import type { FramelineZoomLevel } from './zoom';

/** What `apiRef.setGuides` takes. A field left out is not changed. */
export interface FramelineGuidesInput {
  /** The checkbox guides to have on (`'title-safe'`, `'action-safe'`, `'thirds'`, `'center'`); the others go off. */
  guides?: readonly string[];
  /** The crop mask (`'9:16'`, `'4:5'`, `'1:1'`, `'2.39'`, `'1.85'`), or `null` for none. */
  crop?: string | null;
  /** The platform zones (`'shorts'`, `'reels'`, `'tiktok'`), or `null` for none. A platform brings the 9:16 crop. */
  zones?: string | null;
}

/** The handle a host receives through `apiRef`. */
export interface FramelineApi {
  /** Seeks to the frame that contains `time` (seconds). */
  seek(time: number): void;
  /** Steps `frames` frames from the current one (negative: back). Pauses first. Needs `frameStep`. */
  step(frames: number): void;
  /** Sets the In and Out points, in seconds; `null` leaves that side at the start or the end. Needs `range`. */
  setRange(range: { in: number | null; out: number | null }): void;
  /** Loop on or off: the range when one is set, otherwise the whole video. Needs `loop`. */
  setLoop(on: boolean): void;
  /** Sets the guides that are drawn. Fields left out are not changed. Only what `features` allows is switched on. */
  setGuides(next: FramelineGuidesInput): void;
  /** Sets the zoom level: `'fit'`, `'100'`, `'150'`, `'200'` or `'400'`. Needs `zoom`. */
  setZoom(level: FramelineZoomLevel): void;
  /** Moves the zoomed view by a tenth of what is visible. Does nothing at Fit. */
  pan(direction: 'left' | 'right' | 'up' | 'down'): void;
  /** Downloads the current frame as a PNG, like the Grab frame button. Needs `grabFrame`. */
  grabFrame(): void;
}

/**
 * The position a copied link names, handed to a `linkUrl` function. The format of `fragment` is Frameline's own:
 * use it as it is, and do not rebuild it from the other fields.
 */
export interface FramelineLinkPosition {
  /**
   * The finished position without `#`, for example `t=62.104&tc=00:01:02:02`. Append it to your own hash:
   * `#${fragment}`, or `&${fragment}` after your own keys.
   */
  fragment: string;
  /** The frame index, from 0. */
  frame: number;
  /** The frame's start time in seconds, as in `onFrameChange`. */
  time: number;
  /** The timecode on screen (start offset and drop-frame applied). */
  timecode: string;
}

/**
 * What Copy link copies. A string is the base URL to share: the position goes into its hash, beside the hash keys it
 * already has. A function builds the whole link itself.
 *
 * The function is synchronous, and must stay so: a clipboard write has to happen within the user's gesture, and
 * Safari refuses one that arrives after an `await`. Return the URL to copy, or `null` when your app handled the
 * action itself (for example by opening its own share dialog); Frameline then copies and announces nothing.
 */
export type FramelineLinkUrl = string | ((position: FramelineLinkPosition) => string | null);
