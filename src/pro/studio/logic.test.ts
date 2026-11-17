import { describe, expect, it } from 'vitest';

import { createProStore } from '../store';
import {
  buildCutList,
  effectiveRange,
  findCut,
  formatLinkPosition,
  grabFileName,
  isNarrowDock,
  narrowDockRows,
  lastFrameOf,
  outsideRange,
  playbackDecision,
  parseLinkPosition,
  readLinkPosition,
  seekTimeForFrame,
  stepTarget,
  withLinkPosition,
} from './logic';
import { framesFromSeconds } from '../timecode';

describe('frame stepping', () => {
  it('steps forward and back at 24 fps', () => {
    expect(stepTarget(100, 1, 239)).toEqual({ frame: 101, edge: null });
    expect(stepTarget(100, -1, 239)).toEqual({ frame: 99, edge: null });
    expect(stepTarget(100, 10, 239)).toEqual({ frame: 110, edge: null });
    expect(stepTarget(100, -10, 239)).toEqual({ frame: 90, edge: null });
  });

  it('clamps at the start and the end, and reports the edge only when nothing moved', () => {
    expect(stepTarget(0, -1, 239)).toEqual({ frame: 0, edge: 'start' });
    expect(stepTarget(239, 1, 239)).toEqual({ frame: 239, edge: 'end' });
    expect(stepTarget(4, -10, 239)).toEqual({ frame: 0, edge: null });
    expect(stepTarget(235, 10, 239)).toEqual({ frame: 239, edge: null });
    expect(stepTarget(999, 1, 239)).toEqual({ frame: 239, edge: 'end' });
  });

  it('aims half a frame into the target frame', () => {
    expect(seekTimeForFrame(0, 24)).toBeCloseTo(0.5 / 24, 10);
    expect(seekTimeForFrame(100, 24)).toBeCloseTo(100.5 / 24, 10);
    for (const fps of [24, 25, 30, 60, 23.976, 29.97]) {
      for (const frame of [0, 1, 23, 24, 1799, 1800, 107891]) {
        expect(framesFromSeconds(seekTimeForFrame(frame, fps), fps)).toBe(frame);
      }
    }
  });

  it('finds the last frame', () => {
    expect(lastFrameOf(10, 24)).toBe(239);
    expect(lastFrameOf(0, 24)).toBe(0);
    expect(framesFromSeconds(seekTimeForFrame(lastFrameOf(10, 24), 24), 24)).toBe(239);
    expect(seekTimeForFrame(lastFrameOf(10, 24), 24)).toBeLessThan(10);
  });

  it('returns to the start after 30 steps forward and 30 back', () => {
    let frame = 500;
    for (let i = 0; i < 30; i++) frame = stepTarget(frame, 1, 2000).frame;
    for (let i = 0; i < 30; i++) frame = stepTarget(frame, -1, 2000).frame;
    expect(frame).toBe(500);
  });
});

describe('cuts', () => {
  const marker = (time: number, label = 'm') => ({ time, label });

  it('uses chapters when there are any, otherwise markers', () => {
    expect(buildCutList([5, 0, 20], [marker(7)], 24).map((cut) => cut.time)).toEqual([0, 5, 20]);
    const fromMarkers = buildCutList([], [marker(7, 'b'), marker(3, 'a')], 24);
    expect(fromMarkers.map((cut) => cut.time)).toEqual([3, 7]);
    expect(fromMarkers[0]!.marker?.label).toBe('a');
    expect(buildCutList([5], [], 24)[0]!.marker).toBeUndefined();
  });

  it('merges duplicates and cuts on the same frame, and drops bad times', () => {
    expect(buildCutList([5, 5, 5.001, 10, Number.NaN, -1], [], 24).map((cut) => cut.time)).toEqual([5, 10]);
  });

  it('finds previous and next', () => {
    const cuts = buildCutList([0, 5, 10, 20], [], 24);
    expect(findCut(cuts, 150, 24, 'next')?.time).toBe(10);
    expect(findCut(cuts, 150, 24, 'previous')?.time).toBe(5);
  });

  it('never returns the cut the playhead is on', () => {
    const cuts = buildCutList([0, 5, 10, 20], [], 24);
    expect(findCut(cuts, 120, 24, 'previous')?.time).toBe(0);
    expect(findCut(cuts, 120, 24, 'next')?.time).toBe(10);
  });

  it('returns null before the first and after the last cut', () => {
    const cuts = buildCutList([5, 10], [], 24);
    expect(findCut(cuts, 0, 24, 'previous')).toBeNull();
    expect(findCut(cuts, 120, 24, 'previous')).toBeNull();
    expect(findCut(cuts, 240, 24, 'next')).toBeNull();
    expect(findCut([], 10, 24, 'next')).toBeNull();
  });

  it('moves two cuts when pressed twice from the frame just jumped to', () => {
    const cuts = buildCutList([0, 5, 10, 20], [], 24);
    const first = findCut(cuts, 250, 24, 'previous')!;
    expect(first.time).toBe(10);
    const second = findCut(cuts, framesFromSeconds(first.time, 24), 24, 'previous')!;
    expect(second.time).toBe(5);
  });

  it('handles cuts that are not on a frame boundary', () => {
    const cuts = buildCutList([12.34, 30.01], [], 24);
    const at = framesFromSeconds(12.34, 24);
    expect(findCut(cuts, at, 24, 'next')?.time).toBe(30.01);
    expect(findCut(cuts, at + 1, 24, 'previous')?.time).toBe(12.34);
  });
});

describe('range', () => {
  it('runs In to the end, or the start to Out, when only one point is set', () => {
    expect(effectiveRange({ in: null, out: null }, 60)).toBeNull();
    expect(effectiveRange({ in: 4, out: null }, 60)).toEqual({ start: 4, end: 60 });
    expect(effectiveRange({ in: null, out: 9 }, 60)).toEqual({ start: 0, end: 9 });
    expect(effectiveRange({ in: 4, out: 9 }, 60)).toEqual({ start: 4, end: 9 });
    expect(effectiveRange({ in: 4, out: null }, 0)).toEqual({ start: 4, end: null });
  });

  it('follows the store rules: swap on inversion, clamp, clear', () => {
    const store = createProStore();
    store.setDuration(60);
    store.setIn(9);
    store.setOut(4);
    expect(store.getState()).toMatchObject({ inPoint: 4, outPoint: 9 });
    store.setOut(100);
    expect(store.getState().outPoint).toBeNull();
    store.setOut(50);
    store.clearIn();
    expect(effectiveRange({ in: store.getState().inPoint, out: store.getState().outPoint }, 60)).toEqual({
      start: 0,
      end: 50,
    });
    store.clearInOut();
    expect(effectiveRange({ in: store.getState().inPoint, out: store.getState().outPoint }, 60)).toBeNull();
  });
});

describe('playback decision for a range', () => {
  const base = { range: { in: 4, out: 9 }, duration: 60, fps: 24, loop: true };

  it('does nothing without a range', () => {
    expect(playbackDecision({ ...base, range: { in: null, out: null }, mediaTime: 59.99 })).toBe('continue');
    expect(playbackDecision({ ...base, range: { in: null, out: null }, mediaTime: 1, starting: true })).toBe('continue');
  });

  it('goes back to In half a frame before Out with loop on', () => {
    expect(playbackDecision({ ...base, mediaTime: 8.9 })).toBe('continue');
    expect(playbackDecision({ ...base, mediaTime: 9 - 0.4 / 24 })).toBe('jumpToIn');
    expect(playbackDecision({ ...base, mediaTime: 9 - 1 / 24 })).toBe('continue');
    expect(playbackDecision({ ...base, mediaTime: 30 })).toBe('jumpToIn');
  });

  it('stops on the Out frame with loop off', () => {
    expect(playbackDecision({ ...base, loop: false, mediaTime: 8.9 })).toBe('continue');
    expect(playbackDecision({ ...base, loop: false, mediaTime: 9 - 0.4 / 24 })).toBe('stopAtOut');
    expect(playbackDecision({ ...base, loop: false, mediaTime: 30 })).toBe('stopAtOut');
  });

  it('goes to In when the range is set or moved past a playing head', () => {
    expect(playbackDecision({ ...base, mediaTime: 1 })).toBe('jumpToIn');
    expect(playbackDecision({ ...base, loop: false, mediaTime: 1 })).toBe('jumpToIn');
    expect(playbackDecision({ ...base, mediaTime: 4 - 0.4 / 24 })).toBe('continue');
  });

  it('starts at In from outside the range or from the Out frame, with loop on or off', () => {
    for (const loop of [true, false]) {
      expect(playbackDecision({ ...base, loop, mediaTime: 1, starting: true })).toBe('jumpToIn');
      expect(playbackDecision({ ...base, loop, mediaTime: 9, starting: true })).toBe('jumpToIn');
      expect(playbackDecision({ ...base, loop, mediaTime: 12, starting: true })).toBe('jumpToIn');
      expect(playbackDecision({ ...base, loop, mediaTime: 5, starting: true })).toBe('continue');
    }
  });

  it('treats In to the end and the start to Out as ranges', () => {
    expect(playbackDecision({ ...base, range: { in: 4, out: null }, mediaTime: 59.99 })).toBe('jumpToIn');
    expect(playbackDecision({ ...base, range: { in: null, out: 9 }, mediaTime: 9 })).toBe('jumpToIn');
    expect(playbackDecision({ ...base, range: { in: null, out: 9 }, loop: false, mediaTime: 9 })).toBe('stopAtOut');
  });

  it('knows what is outside the range', () => {
    expect(outsideRange(1, base.range, 60, 24)).toBe(true);
    expect(outsideRange(5, base.range, 60, 24)).toBe(false);
    expect(outsideRange(9 - 0.4 / 24, base.range, 60, 24)).toBe(true);
    expect(outsideRange(9 - 1 / 24, base.range, 60, 24)).toBe(false);
    expect(outsideRange(1, { in: null, out: null }, 60, 24)).toBe(false);
  });
});

describe('links', () => {
  it('writes the position into the hash and keeps host data', () => {
    expect(withLinkPosition('', '00:00:12:05')).toBe('#t=00:00:12:05');
    expect(withLinkPosition('#chapter-2', '00:00:12:05')).toBe('#chapter-2&t=00:00:12:05');
    expect(withLinkPosition('#width=320&t=00:00:01:00&dir=rtl', '00:00:12:05')).toBe('#width=320&dir=rtl&t=00:00:12:05');
  });

  it('reads the position back', () => {
    expect(readLinkPosition('#t=00:00:12:05')).toBe('00:00:12:05');
    expect(readLinkPosition('#chapter-2&t=00:00:12:05')).toBe('00:00:12:05');
    expect(readLinkPosition('#chapter-2')).toBeNull();
    expect(readLinkPosition('#t=')).toBeNull();
    expect(readLinkPosition('#t=%E0%A4%A')).toBeNull();
  });

  it('round-trips frames, with a start offset and in drop-frame', () => {
    const cases = [
      { fps: 24, options: {} },
      { fps: 24, options: { startFrames: 86400 } },
      { fps: 29.97, options: { dropFrame: true } },
      { fps: 30, options: {} },
    ];
    for (const { fps, options } of cases) {
      for (const frame of [0, 1, 293, 1799, 1800, 54321]) {
        const value = formatLinkPosition(frame, fps, options);
        const hash = withLinkPosition('#host=1', value);
        expect(parseLinkPosition(readLinkPosition(hash), fps, options)).toBe(frame);
      }
    }
  });

  it('accepts seconds and rejects everything else', () => {
    expect(parseLinkPosition('12.5', 24)).toBe(300);
    expect(parseLinkPosition('90', 30)).toBe(2700);
    for (const bad of ['', null, 'abc', '12:5', '00:00:00:99', '-4', '1e3']) expect(parseLinkPosition(bad, 24)).toBeNull();
    expect(parseLinkPosition('00:59:59:00', 24, { startFrames: 86400 })).toBeNull();
  });

  it('names grabbed frames', () => {
    expect(grabFileName(null, '00:00:12:05')).toBe('frame_00-00-12-05.png');
    expect(grabFileName('My Film: Take 2', '00:01:00;02')).toBe('My-Film-Take-2_00-01-00-02.png');
    expect(grabFileName('  ', '00:00:00:00')).toBe('frame_00-00-00-00.png');
  });
});

describe('dock arrangement', () => {
  it('is narrow under 740 px, and always on touch', () => {
    expect(isNarrowDock(739)).toBe(true);
    expect(isNarrowDock(740)).toBe(false);
    expect(isNarrowDock(1280)).toBe(false);
    expect(isNarrowDock(1280, true)).toBe(true);
    expect(isNarrowDock(0)).toBe(false); // not measured yet
  });

  it('puts the instrument on row one of the narrow dock from 500 px', () => {
    expect(narrowDockRows(499)).toBe('compact');
    expect(narrowDockRows(500)).toBe('keys');
    expect(narrowDockRows(796)).toBe('keys'); // a phone on its side
    expect(narrowDockRows(320)).toBe('compact');
  });
});
