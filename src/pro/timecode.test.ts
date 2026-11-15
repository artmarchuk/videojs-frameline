import { describe, expect, it } from 'vitest';

import {
  formatTimecode,
  framesFromSeconds,
  nearestFrame,
  parseTimecode,
  resolveFrameRate,
  secondsFromFrames,
} from './timecode';

const NTSC = 30000 / 1001;

describe('formatTimecode, integer rates', () => {
  it('formats 24 fps', () => {
    expect(formatTimecode(0, 24)).toBe('00:00:00:00');
    expect(formatTimecode(23, 24)).toBe('00:00:00:23');
    expect(formatTimecode(24, 24)).toBe('00:00:01:00');
    expect(formatTimecode(24 * 3600, 24)).toBe('01:00:00:00');
  });

  it('formats 25 and 30 fps', () => {
    expect(formatTimecode(24, 25)).toBe('00:00:00:24');
    expect(formatTimecode(25, 25)).toBe('00:00:01:00');
    expect(formatTimecode(25 * 3600, 25)).toBe('01:00:00:00');
    expect(formatTimecode(29, 30)).toBe('00:00:00:29');
    expect(formatTimecode(30, 30)).toBe('00:00:01:00');
    expect(formatTimecode(30 * 3600, 30)).toBe('01:00:00:00');
  });

  it('formats 50 and 60 fps', () => {
    expect(formatTimecode(49, 50)).toBe('00:00:00:49');
    expect(formatTimecode(60, 60)).toBe('00:00:01:00');
  });

  it('adds the start offset', () => {
    expect(formatTimecode(0, 24, { startFrames: 24 * 3600 })).toBe('01:00:00:00');
    expect(formatTimecode(25, 24, { startFrames: 24 * 3600 })).toBe('01:00:01:01');
  });

  it('ignores dropFrame for rates that have none', () => {
    expect(formatTimecode(1800, 30, { dropFrame: true })).toBe('00:01:00:00');
    expect(formatTimecode(1440, 23.976, { dropFrame: true })).toBe('00:01:00:00');
  });
});

describe('29.97', () => {
  it('uses the nominal count of 30 in non-drop', () => {
    expect(formatTimecode(1799, 29.97)).toBe('00:00:59:29');
    expect(formatTimecode(1800, 29.97)).toBe('00:01:00:00');
    expect(formatTimecode(108000, 29.97)).toBe('01:00:00:00');
  });

  it('skips frames 0 and 1 at the first minute in drop-frame', () => {
    expect(formatTimecode(1799, 29.97, { dropFrame: true })).toBe('00:00:59;29');
    expect(formatTimecode(1800, 29.97, { dropFrame: true })).toBe('00:01:00;02');
    expect(formatTimecode(1801, NTSC, { dropFrame: true })).toBe('00:01:00;03');
  });

  it('does not skip on every tenth minute', () => {
    expect(formatTimecode(17981, 29.97, { dropFrame: true })).toBe('00:09:59;29');
    expect(formatTimecode(17982, 29.97, { dropFrame: true })).toBe('00:10:00;00');
    expect(formatTimecode(17982 + 1800, 29.97, { dropFrame: true })).toBe('00:11:00;02');
  });

  it('reaches one hour of real time at 107892 frames', () => {
    expect(formatTimecode(107892, 29.97, { dropFrame: true })).toBe('01:00:00;00');
    expect(formatTimecode(107891, 29.97, { dropFrame: true })).toBe('00:59:59;29');
  });

  it('skips four frame numbers at 59.94', () => {
    expect(formatTimecode(3599, 59.94, { dropFrame: true })).toBe('00:00:59;59');
    expect(formatTimecode(3600, 59.94, { dropFrame: true })).toBe('00:01:00;04');
    expect(formatTimecode(215784, 59.94, { dropFrame: true })).toBe('01:00:00;00');
  });
});

describe('parseTimecode', () => {
  it('reads valid timecode', () => {
    expect(parseTimecode('00:00:01:00', 24)).toBe(24);
    expect(parseTimecode('01:00:00:00', 24)).toBe(86400);
    expect(parseTimecode('00:01:00;02', 29.97)).toBe(1800);
    expect(parseTimecode('00:10:00;00', 29.97)).toBe(17982);
    expect(parseTimecode('00:01:00:02', 29.97, { dropFrame: true })).toBe(1800);
  });

  it('returns null for bad input and never throws', () => {
    const bad = ['', 'abc', '00:00:00', '00:00:00:24', '00:60:00:00', '00:00:60:00', '-1:00:00:00', '00:00:00:0', '1:2:3:4'];
    for (const text of bad) expect(parseTimecode(text, 24)).toBeNull();
    for (const value of [null, undefined, 12, {}, []]) expect(parseTimecode(value, 24)).toBeNull();
  });

  it('rejects frame numbers that drop-frame skips', () => {
    expect(parseTimecode('00:01:00;00', 29.97)).toBeNull();
    expect(parseTimecode('00:01:00;01', 29.97)).toBeNull();
    expect(parseTimecode('00:10:00;00', 29.97)).not.toBeNull();
    expect(parseTimecode('00:01:00;03', 59.94)).toBeNull();
  });

  it('round-trips a spread of frame numbers', () => {
    const cases: [number, boolean][] = [
      [24, false],
      [25, false],
      [30, false],
      [60, false],
      [23.976, false],
      [29.97, false],
      [29.97, true],
      [59.94, true],
    ];
    for (const [fps, dropFrame] of cases) {
      const { nominal } = resolveFrameRate(fps);
      const frames = new Set<number>([0, 1, nominal - 1, nominal, 123456, 999999]);
      // Dense around every minute boundary of the first 21 minutes, where drop-frame is easy to get wrong.
      for (let minute = 1; minute <= 21; minute++) {
        const around = minute * 60 * nominal;
        for (let offset = -70; offset <= 70; offset++) frames.add(around + offset);
      }
      for (const frame of frames) {
        const text = formatTimecode(frame, fps, { dropFrame });
        expect(parseTimecode(text, fps, { dropFrame }), `${fps} ${dropFrame} ${frame} ${text}`).toBe(frame);
      }
    }
  });
});

describe('frames and seconds', () => {
  it('finds the frame at awkward times', () => {
    expect(framesFromSeconds(25 / 24, 24)).toBe(25);
    expect(framesFromSeconds(1.0416666, 24)).toBe(25);
    expect(nearestFrame(1.0416666, 24)).toBe(25);
    expect(framesFromSeconds(1.04, 24)).toBe(24);
    expect(framesFromSeconds(0.999999, 24)).toBe(24);
    expect(framesFromSeconds(1 / 3, 30)).toBe(10);
  });

  it('agrees with itself for every frame of ten minutes', () => {
    for (const fps of [24, 25, 30, 50, 60, 23.976, 29.97, 59.94]) {
      const { nominal } = resolveFrameRate(fps);
      for (let frame = 0; frame < nominal * 600; frame += 7) {
        expect(framesFromSeconds(secondsFromFrames(frame, fps), fps)).toBe(frame);
      }
    }
  });

  it('uses the exact rate for fractional fps', () => {
    expect(resolveFrameRate(29.97)).toEqual({ exact: NTSC, nominal: 30, dropFrames: 2 });
    expect(resolveFrameRate(NTSC).exact).toBe(NTSC);
    expect(resolveFrameRate(23.976)).toEqual({ exact: 24000 / 1001, nominal: 24, dropFrames: 0 });
    expect(resolveFrameRate(59.94).dropFrames).toBe(4);
    expect(resolveFrameRate(30)).toEqual({ exact: 30, nominal: 30, dropFrames: 0 });
    expect(framesFromSeconds(3600, 29.97)).toBe(107892);
  });

  it('falls back to 24 for a bad fps and clamps bad frame numbers to 0', () => {
    for (const fps of [0, -24, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(formatTimecode(24, fps)).toBe('00:00:01:00');
      expect(framesFromSeconds(1, fps)).toBe(24);
    }
    expect(formatTimecode(-5, 24)).toBe('00:00:00:00');
    expect(formatTimecode(Number.NaN, 24)).toBe('00:00:00:00');
    expect(framesFromSeconds(-1, 24)).toBe(0);
    expect(secondsFromFrames(-10, 24)).toBe(0);
  });
});
