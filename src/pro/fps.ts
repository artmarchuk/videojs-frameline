/** Frame-rate basics shared by the Share-side wrapper and the pro code. Kept tiny so Share stays light. */

export const DEFAULT_FPS = 24;

/** True when `fps` is a positive, finite number. */
export function isValidFps(fps: unknown): fps is number {
  return typeof fps === 'number' && Number.isFinite(fps) && fps > 0;
}
