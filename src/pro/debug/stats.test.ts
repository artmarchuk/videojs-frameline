import { describe, expect, it } from 'vitest';

import { measuredFps, shown, type FrameSample } from './stats';

describe('debug readout: playback statistics', () => {
  it('measures the frame rate over the last second of samples', () => {
    const samples: FrameSample[] = [];
    expect(measuredFps(samples, { at: 0, count: 0 })).toBeNull();
    expect(measuredFps(samples, { at: 500, count: 12 })).toBe(24);
    expect(measuredFps(samples, { at: 1000, count: 24 })).toBe(24);
    // The window moves on: 30 frames in the last second, whatever came before.
    expect(measuredFps(samples, { at: 1500, count: 42 })).toBe(30);
    expect(samples.length).toBeLessThanOrEqual(3);
  });

  it('reads 0 while nothing is presented, and one decimal otherwise', () => {
    const samples: FrameSample[] = [{ at: 0, count: 100 }];
    expect(measuredFps(samples, { at: 1000, count: 100 })).toBe(0);
    expect(measuredFps([{ at: 0, count: 0 }], { at: 1001, count: 24 })).toBe(24);
    expect(measuredFps([{ at: 0, count: 0 }], { at: 1000, count: 23 })).toBe(23);
    expect(measuredFps([{ at: 0, count: 0 }], { at: 900, count: 22 })).toBe(24.4);
  });

  it('shows a dash for a number the browser cannot give', () => {
    expect(shown(null)).toBe('—');
    expect(shown(undefined)).toBe('—');
    expect(shown(0)).toBe('0');
    expect(shown(23.9)).toBe('23.9');
  });
});
