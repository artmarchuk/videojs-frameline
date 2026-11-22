/**
 * Playback statistics for the debug readout. Pure: no React, no DOM.
 */

/** How often the readout samples: twice a second. */
export const SAMPLE_MS = 500;
/** The measured frame rate is the number of frames presented over this window. */
export const WINDOW_MS = 1000;

/** The presented-frame counter at a moment in time (milliseconds). */
export interface FrameSample {
  at: number;
  count: number;
}

/**
 * Frames per second over the last `WINDOW_MS`, from samples of a running counter, oldest first. Samples older than
 * the window are removed from `samples`. `null` until the samples span at least half the window.
 */
export function measuredFps(samples: FrameSample[], now: FrameSample): number | null {
  samples.push(now);
  while (samples.length > 1 && now.at - samples[1]!.at >= WINDOW_MS) samples.shift();
  const first = samples[0]!;
  const elapsed = now.at - first.at;
  if (elapsed < WINDOW_MS / 2) return null;
  return Math.round(((now.count - first.count) * 1000 * 10) / elapsed) / 10;
}

/** A statistic as the readout shows it: the number, or a dash where the browser lacks the API behind it. */
export const shown = (value: number | null | undefined): string => (value === null || value === undefined ? '—' : String(value));
