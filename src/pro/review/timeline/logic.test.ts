import { describe, expect, it } from 'vitest';

import type { Marker } from '../../store';
import { framesFromSeconds } from '../../timecode';
import { seekTimeForFrame } from '../logic';
import {
  buildLabels,
  buildTicks,
  chooseTicks,
  clampBubble,
  formatRangeLength,
  formatRulerLabel,
  handleKeyTarget,
  handleTimeFromX,
  isSnapped,
  layoutMarkers,
  MIN_LABEL_PX,
  MIN_MINOR_PX,
  rangeBand,
  resolveHandleMove,
  snapSeekTime,
  timeToX,
  xToTime,
} from './logic';

const DURATIONS = [10, 60, 90, 600, 3600, 3 * 3600];
const WIDTHS = [320, 800, 1920];
const RATES = [24, 25, 29.97, 30, 60];

describe('chooseTicks', () => {
  it('keeps the spacing rules for every duration, width and rate', () => {
    for (const duration of DURATIONS)
      for (const width of WIDTHS)
        for (const fps of RATES) {
          const plan = chooseTicks(duration, width, fps);
          const px = width / duration;
          expect(plan.minor * px, `minor ${duration}/${width}/${fps}`).toBeGreaterThanOrEqual(MIN_MINOR_PX - 1e-6);
          expect(plan.major * px, `major ${duration}/${width}/${fps}`).toBeGreaterThanOrEqual(MIN_LABEL_PX - 1e-6);
          expect(Number.isInteger(plan.major)).toBe(true);
          expect(plan.major).toBeGreaterThanOrEqual(plan.minor);
          if (plan.mid !== null) {
            expect(plan.mid).toBeGreaterThan(plan.minor);
            expect(plan.mid).toBeLessThan(plan.major);
          }
        }
  });

  it('shows no frame-level ticks for a 60 s clip at 800 px', () => {
    expect(chooseTicks(60, 800, 24).minor).toBeGreaterThanOrEqual(1);
  });

  it('shows frame ticks when the width allows', () => {
    const plan = chooseTicks(10, 1920, 24);
    expect(plan.minor).toBeCloseTo(1 / 24);
    expect(plan.major).toBe(1);
  });

  it('matches the mockup: 60 s at 1166 px gives 1 s, 5 s and 10 s', () => {
    expect(chooseTicks(60, 1166, 24)).toEqual({ minor: 1, mid: 5, major: 10 });
  });

  it('widens the label interval on a narrow player and a long video', () => {
    expect(chooseTicks(3600, 320, 24).major).toBeGreaterThanOrEqual(900);
    expect(chooseTicks(60, 320, 24).major).toBe(30);
  });

  it('survives an unknown duration or width', () => {
    expect(chooseTicks(0, 800, 24)).toEqual({ minor: 1, mid: null, major: 1 });
    expect(chooseTicks(60, 0, 24)).toEqual({ minor: 1, mid: null, major: 1 });
  });

  it('never renders hundreds of labels, and ticks stay bounded by the width', () => {
    for (const duration of DURATIONS)
      for (const width of WIDTHS) {
        const plan = chooseTicks(duration, width, 24);
        expect(buildTicks(plan, duration, width).length).toBeLessThanOrEqual(width / MIN_MINOR_PX + 2);
        expect(buildLabels(plan, duration, width).length).toBeLessThanOrEqual(width / MIN_LABEL_PX + 1);
      }
  });

  it('marks tick levels so that coarser levels win', () => {
    const ticks = buildTicks({ minor: 1, mid: 5, major: 10 }, 20, 400);
    expect(ticks[0]!.level).toBe('major');
    expect(ticks[5]!.level).toBe('mid');
    expect(ticks[10]!.level).toBe('major');
    expect(ticks[3]!.level).toBe('minor');
    expect(ticks).toHaveLength(21);
  });
});

describe('ruler labels', () => {
  it('uses seconds with a suffix under a minute', () => {
    expect(formatRulerLabel(0, 10)).toBe('0s');
    expect(formatRulerLabel(5, 10)).toBe('5s');
    expect(formatRulerLabel(50, 59)).toBe('50s');
  });

  it('uses minutes and seconds when the duration needs minutes', () => {
    expect(formatRulerLabel(50, 60)).toBe('50s');
    expect(formatRulerLabel(0, 61)).toBe('0:00');
    expect(formatRulerLabel(30, 90)).toBe('0:30');
    expect(formatRulerLabel(60, 90)).toBe('1:00');
    expect(formatRulerLabel(90, 90)).toBe('1:30');
    expect(formatRulerLabel(570, 600)).toBe('9:30');
  });

  it('shows hours only for positions of an hour or more', () => {
    expect(formatRulerLabel(3600, 3 * 3600)).toBe('1:00:00');
    expect(formatRulerLabel(9000, 3 * 3600)).toBe('2:30:00');
    expect(formatRulerLabel(1800, 3 * 3600)).toBe('30:00');
    expect(formatRulerLabel(0, 3 * 3600)).toBe('0:00');
    expect(formatRulerLabel(1800, 3599)).toBe('30:00');
  });

  it('never shows an hours field below an hour, or a minutes field below a minute', () => {
    for (const duration of [10, 59]) for (let t = 0; t <= duration; t += 7) expect(formatRulerLabel(t, duration)).toMatch(/^\d+s$/);
    for (const duration of [61, 90, 600, 3 * 3600]) for (let t = 0; t <= Math.min(duration, 3599); t += 15) expect(formatRulerLabel(t, duration)).toMatch(/^\d+:\d\d$/);
    expect(formatRulerLabel(7200, 3 * 3600)).not.toMatch(/^0:/);
  });

  it('keeps labels at least 80 px apart and inside the track', () => {
    for (const duration of [10, 60, 90, 600, 3 * 3600])
      for (const width of WIDTHS) {
        const labels = buildLabels(chooseTicks(duration, width, 24), duration, width);
        expect(labels.length).toBeGreaterThan(0);
        for (let i = 1; i < labels.length; i++) expect(labels[i]!.x - labels[i - 1]!.x).toBeGreaterThanOrEqual(MIN_LABEL_PX - 1e-6);
        const last = labels[labels.length - 1]!;
        expect(last.x + 4 + last.text.length * 6.4).toBeLessThanOrEqual(width);
        expect(labels[0]!.x).toBe(0);
      }
  });
});

describe('time and pixels', () => {
  it('round-trips', () => {
    for (const time of [0, 1.5, 30, 59.99, 60]) expect(xToTime(timeToX(time, 60, 800), 60, 800)).toBeCloseTo(time);
  });

  it('clamps at both ends', () => {
    expect(timeToX(-5, 60, 800)).toBe(0);
    expect(timeToX(90, 60, 800)).toBe(800);
    expect(xToTime(-20, 60, 800)).toBe(0);
    expect(xToTime(900, 60, 800)).toBe(60);
  });

  it('returns 0 while the duration or width is unknown', () => {
    expect(timeToX(5, 0, 800)).toBe(0);
    expect(xToTime(5, 60, 0)).toBe(0);
  });
});

describe('frame snapping', () => {
  it('equals the step rule: the middle of the frame under the time', () => {
    for (const fps of [24, 29.97, 30])
      for (const time of [0, 0.01, 1, 12.345, 59.2]) {
        const frame = framesFromSeconds(time, fps);
        expect(snapSeekTime(time, 60, fps)).toBe(seekTimeForFrame(frame, fps));
      }
  });

  it('never snaps past the last frame', () => {
    expect(snapSeekTime(60, 60, 24)).toBe(seekTimeForFrame(60 * 24 - 1, 24));
    expect(snapSeekTime(75, 60, 24)).toBe(seekTimeForFrame(60 * 24 - 1, 24));
  });

  it('is stable: a snapped time snaps to itself', () => {
    for (const time of [0, 3.3, 41.7]) {
      const snapped = snapSeekTime(time, 60, 30);
      expect(snapSeekTime(snapped, 60, 30)).toBe(snapped);
      expect(isSnapped(snapped, 60, 30)).toBe(true);
    }
    expect(isSnapped(3.3, 60, 30)).toBe(false);
  });
});

describe('layoutMarkers', () => {
  const m = (time: number, extra: Partial<Marker> = {}): Marker => ({ time, label: `m${time}`, ...extra });

  it('places a point and a range with different kinds', () => {
    const items = layoutMarkers([m(10), m(30, { end: 40 })], 60, 600);
    expect(items.map((item) => item.kind)).toEqual(['point', 'range']);
    const range = items[1]!;
    expect(range.kind === 'range' && range.width).toBeCloseTo(100);
  });

  it('clusters points closer than 12 px and counts them', () => {
    const items = layoutMarkers([m(20), m(20.3), m(20.6), m(40)], 60, 600);
    expect(items.map((item) => item.kind)).toEqual(['cluster', 'point']);
    expect(items[0]!.markers).toHaveLength(3);
  });

  it('does not cluster points that are far enough apart', () => {
    expect(layoutMarkers([m(10), m(12)], 60, 600).map((item) => item.kind)).toEqual(['point', 'point']);
  });

  it('keeps markers at 0 and at the duration fully inside the lane', () => {
    const items = layoutMarkers([m(0), m(60), m(59, { end: 60 })], 60, 600);
    const points = items.filter((item) => item.kind === 'point');
    expect(points[0]!.x).toBe(5);
    expect(points[1]!.x).toBe(595);
    const range = items.find((item) => item.kind === 'range')!;
    expect(range.kind === 'range' && range.x + range.width).toBeLessThanOrEqual(600);
  });

  it('gives a very short range a visible width', () => {
    const range = layoutMarkers([m(10, { end: 10.01 })], 60, 600)[0]!;
    expect(range.kind === 'range' && range.width).toBe(6);
  });

  it('ignores bad times and sorts by time', () => {
    const items = layoutMarkers([m(50), m(Number.NaN), m(-1), m(5), m(500)], 60, 600);
    expect(items.map((item) => item.markers[0]!.time)).toEqual([5, 50, 500]);
    expect(items[2]!.x).toBe(595); // past the end: drawn at the end
  });

  it('handles 200 markers, and more, without growing past the lane', () => {
    const many = Array.from({ length: 250 }, (_, i) => m((i / 250) * 60));
    const items = layoutMarkers(many, 60, 320);
    expect(items.length).toBeLessThanOrEqual(320 / 12 + 1);
    expect(items.reduce((sum, item) => sum + item.markers.length, 0)).toBe(250);
  });

  it('returns nothing while the duration is unknown', () => {
    expect(layoutMarkers([m(1)], 0, 600)).toEqual([]);
  });
});

describe('handle drag maths', () => {
  it('rounds a drag position to the start of a frame', () => {
    const time = handleTimeFromX(123.4, 800, 60, 24);
    expect(time * 24).toBeCloseTo(Math.round(time * 24));
    expect(time).toBeLessThanOrEqual((123.4 / 800) * 60);
  });

  it('clamps to the clip', () => {
    expect(handleTimeFromX(-50, 800, 60, 24)).toBe(0);
    expect(handleTimeFromX(5000, 800, 60, 24)).toBeCloseTo((60 * 24 - 1) / 24);
  });

  it('moves a point', () => {
    expect(resolveHandleMove('in', 5, { in: 2, out: 10 }, 60, 24)).toEqual({ in: 5, out: 10, swapped: false, rejected: false });
  });

  it('swaps when a handle is dragged past the other', () => {
    expect(resolveHandleMove('in', 12, { in: 2, out: 10 }, 60, 24)).toEqual({ in: 10, out: 12, swapped: true, rejected: false });
    expect(resolveHandleMove('out', 1, { in: 2, out: 10 }, 60, 24)).toEqual({ in: 1, out: 2, swapped: true, rejected: false });
  });

  it('rejects a move onto the other point', () => {
    expect(resolveHandleMove('in', 10.01, { in: 2, out: 10 }, 60, 24)).toEqual({ in: 2, out: 10, swapped: false, rejected: true });
  });

  it('clamps a move to the clip and rounds to a frame', () => {
    expect(resolveHandleMove('out', 500, { in: 2, out: null }, 60, 24).out).toBeCloseTo((60 * 24 - 1) / 24);
    expect(resolveHandleMove('in', -3, { in: 2, out: null }, 60, 24).in).toBe(0);
    expect(resolveHandleMove('in', 1.03, { in: null, out: null }, 60, 24).in).toBeCloseTo(1);
  });

  it('moves by keys, one or ten frames, within the limits', () => {
    const range = { in: 2, out: 10 };
    expect(handleKeyTarget('ArrowRight', false, 'in', range, 60, 24)).toBeCloseTo(2 + 1 / 24);
    expect(handleKeyTarget('ArrowLeft', true, 'out', range, 60, 24)).toBeCloseTo(10 - 10 / 24);
    expect(handleKeyTarget('Home', false, 'in', range, 60, 24)).toBe(0);
    expect(handleKeyTarget('End', false, 'in', range, 60, 24)).toBeCloseTo(10 - 1 / 24);
    expect(handleKeyTarget('Home', false, 'out', range, 60, 24)).toBeCloseTo(2 + 1 / 24);
    expect(handleKeyTarget('End', false, 'out', range, 60, 24)).toBeCloseTo((60 * 24 - 1) / 24);
    expect(handleKeyTarget('Delete', false, 'out', range, 60, 24)).toBe('clear');
    expect(handleKeyTarget('Backspace', false, 'in', range, 60, 24)).toBe('clear');
    expect(handleKeyTarget('a', false, 'in', range, 60, 24)).toBeNull();
    expect(handleKeyTarget('ArrowRight', false, 'in', { in: null, out: 5 }, 60, 24)).toBeNull();
  });

  it('a key cannot push a handle past the other point', () => {
    expect(handleKeyTarget('ArrowRight', true, 'in', { in: 9.9, out: 10 }, 60, 24)).toBeCloseTo(10 - 1 / 24);
  });
});

describe('rangeBand', () => {
  it('is null with no points', () => {
    expect(rangeBand({ in: null, out: null }, 5, 60)).toBeNull();
  });

  it('spans In to Out with the played part up to the playhead', () => {
    expect(rangeBand({ in: 15, out: 45 }, 30, 60)).toEqual({ start: 25, end: 75, played: 50, openStart: false, openEnd: false });
  });

  it('keeps the played part inside the band when the playhead is outside it', () => {
    expect(rangeBand({ in: 15, out: 45 }, 5, 60)!.played).toBe(25);
    expect(rangeBand({ in: 15, out: 45 }, 55, 60)!.played).toBe(75);
  });

  it('runs to the open end with one point', () => {
    expect(rangeBand({ in: 15, out: null }, 0, 60)).toMatchObject({ start: 25, end: 100, openEnd: true, openStart: false });
    expect(rangeBand({ in: null, out: 45 }, 0, 60)).toMatchObject({ start: 0, end: 75, openStart: true, openEnd: false });
  });

  it('is null while the duration is unknown', () => {
    expect(rangeBand({ in: 1, out: 2 }, 0, 0)).toBeNull();
  });
});

describe('clampBubble', () => {
  it('keeps the bubble inside at both edges', () => {
    expect(clampBubble(0, 92, 800)).toBe(46);
    expect(clampBubble(800, 92, 800)).toBe(754);
    expect(clampBubble(400, 92, 800)).toBe(400);
  });

  it('centres a bubble wider than its container', () => {
    expect(clampBubble(10, 92, 80)).toBe(40);
  });
});

describe('formatRangeLength', () => {
  it('reads as plain words', () => {
    expect(formatRangeLength(17)).toBe('17 s');
    expect(formatRangeLength(0.5)).toBe('0.5 s');
    expect(formatRangeLength(65)).toBe('1 min 5 s');
    expect(formatRangeLength(120)).toBe('2 min');
  });
});
