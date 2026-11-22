import { describe, expect, it } from 'vitest';

import type { FramelineMarker } from '../../store';
import { framesFromSeconds } from '../../timecode';
import { seekTimeForFrame } from '../logic';
import {
  buildLabels,
  buildTicks,
  chooseTicks,
  clampBubble,
  formatRulerLabel,
  handleBox,
  handleDragTime,
  handleKeyTarget,
  handleTimeFromX,
  handleValue,
  isAtOwnEnd,
  isSnapped,
  layoutMarkers,
  MIN_LABEL_PX,
  MIN_MINOR_PX,
  pressesPlayhead,
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
  const m = (time: number, extra: Partial<FramelineMarker> = {}): FramelineMarker => ({ time, label: `m${time}`, ...extra });

  it('gives every marker one pin, and a line to the end time when it has one', () => {
    const pins = layoutMarkers([m(10), m(30, { end: 40 })], 60, 600);
    expect(pins).toHaveLength(2);
    expect(pins[0]).toMatchObject({ x: 100, endX: null });
    expect(pins[1]).toMatchObject({ x: 300, endX: 400 });
  });

  it('never clusters: close markers keep their own pins, later ones last (drawn on top)', () => {
    const pins = layoutMarkers([m(20.6), m(20), m(20.3), m(40)], 60, 600);
    expect(pins.map((pin) => pin.marker.time)).toEqual([20, 20.3, 20.6, 40]);
  });

  it('puts pins exactly on 0 and on the duration (the gutter holds them whole)', () => {
    const pins = layoutMarkers([m(0), m(60), m(59, { end: 70 })], 60, 600);
    expect(pins[0]!.x).toBe(0);
    expect(pins[2]!.x).toBe(600);
    expect(pins[1]!.endX).toBe(600);
  });

  it('ignores an end that is not after the start', () => {
    expect(layoutMarkers([m(10, { end: 10 }), m(20, { end: 5 }), m(30, { end: Number.NaN })], 60, 600).map((pin) => pin.endX)).toEqual([null, null, null]);
  });

  it('ignores bad times and sorts by time', () => {
    const pins = layoutMarkers([m(50), m(Number.NaN), m(-1), m(5), m(500)], 60, 600);
    expect(pins.map((pin) => pin.marker.time)).toEqual([5, 50, 500]);
    expect(pins[2]!.x).toBe(600); // past the end: drawn at the end
  });

  it('handles 200 markers, and more: still one pin each, all inside', () => {
    const many = Array.from({ length: 250 }, (_, i) => m((i / 250) * 60));
    const pins = layoutMarkers(many, 60, 320);
    expect(pins).toHaveLength(250);
    expect(pins.every((pin) => pin.x >= 0 && pin.x <= 320)).toBe(true);
    expect(new Set(pins.map((pin) => pin.key)).size).toBe(250);
  });

  it('returns nothing while the duration is unknown', () => {
    expect(layoutMarkers([m(1)], 0, 600)).toEqual([]);
  });
});

describe('handle drag maths', () => {
  const lastFrameTime = (60 * 24 - 1) / 24;

  it('rounds a drag position to the start of a frame', () => {
    const time = handleTimeFromX(123.4, 800, 60, 24);
    expect(time * 24).toBeCloseTo(Math.round(time * 24));
    expect(time).toBeLessThanOrEqual((123.4 / 800) * 60);
  });

  it('clamps to the clip', () => {
    expect(handleTimeFromX(-50, 800, 60, 24)).toBe(0);
    expect(handleTimeFromX(5000, 800, 60, 24)).toBeCloseTo(lastFrameTime);
  });

  it('snaps magnetically to the playhead and to markers within 5 px', () => {
    // 1200 px for 60 s: 20 px per second, so 5 px is a quarter of a second.
    const magnets = [22 + 8 / 24, 30];
    expect(handleDragTime(22.5 * 20, 1200, 60, 24, magnets)).toBeCloseTo(22 + 8 / 24); // 3.3 px away
    expect(handleDragTime(30 * 20 - 5, 1200, 60, 24, magnets)).toBe(30); // exactly 5 px away
    expect(handleDragTime(30 * 20 + 6, 1200, 60, 24, magnets)).toBeCloseTo(handleTimeFromX(606, 1200, 60, 24)); // 6 px: free
    expect(handleDragTime(400, 1200, 60, 24, magnets)).toBe(20);
  });

  it('picks the nearest magnet, and rounds a magnet to its frame', () => {
    expect(handleDragTime(601, 1200, 60, 24, [29.9, 30.1])).toBeCloseTo(framesFromSeconds(30.1, 24) / 24);
    const landed = handleDragTime(200, 1200, 60, 24, [10.03]);
    expect(landed * 24).toBeCloseTo(Math.round(landed * 24));
  });

  it('ignores magnets outside the clip and works without any', () => {
    expect(handleDragTime(100, 1200, 60, 24, [Number.NaN, -1, 90])).toBe(5);
    expect(handleDragTime(100, 1200, 60, 24)).toBe(5);
  });

  it('gives the playhead priority over a pin or a handle: within 10 px of its centre, 22 px on touch', () => {
    expect(pressesPlayhead(110, 100, false)).toBe(true);
    expect(pressesPlayhead(111, 100, false)).toBe(false);
    expect(pressesPlayhead(78, 100, true)).toBe(true);
    expect(pressesPlayhead(77, 100, true)).toBe(false);
    expect(pressesPlayhead(100, 100, false)).toBe(true);
  });

  it('puts an unset handle at its own end of the track', () => {
    expect(handleValue('in', { in: null, out: null }, 60)).toBe(0);
    expect(handleValue('out', { in: null, out: null }, 60)).toBe(60);
    expect(handleValue('in', { in: 3, out: 9 }, 60)).toBe(3);
    expect(handleValue('out', { in: 3, out: 9 }, 60)).toBe(9);
  });

  it('knows when a handle is back at its own end (within one frame)', () => {
    expect(isAtOwnEnd('in', 0, 60, 24)).toBe(true);
    expect(isAtOwnEnd('in', 1 / 24, 60, 24)).toBe(false);
    expect(isAtOwnEnd('out', lastFrameTime, 60, 24)).toBe(true);
    expect(isAtOwnEnd('out', 60, 60, 24)).toBe(true);
    expect(isAtOwnEnd('out', lastFrameTime - 1 / 24, 60, 24)).toBe(false);
    expect(isAtOwnEnd('out', 5, 0, 24)).toBe(false); // duration unknown
  });

  it('moves a point', () => {
    expect(resolveHandleMove('in', 5, { in: 2, out: 10 }, 60, 24)).toEqual({ in: 5, out: 10, swapped: false, rejected: false, unset: false });
    expect(resolveHandleMove('out', 20, { in: null, out: null }, 60, 24)).toMatchObject({ in: null, out: 20, unset: false });
  });

  it('unsets a point dragged back to its end', () => {
    expect(resolveHandleMove('in', 0, { in: 2, out: 10 }, 60, 24)).toEqual({ in: null, out: 10, swapped: false, rejected: false, unset: true });
    expect(resolveHandleMove('in', -3, { in: 2, out: null }, 60, 24)).toMatchObject({ in: null, unset: true });
    expect(resolveHandleMove('out', 500, { in: 2, out: 10 }, 60, 24)).toMatchObject({ in: 2, out: null, unset: true });
    expect(resolveHandleMove('out', lastFrameTime, { in: 2, out: 10 }, 60, 24)).toMatchObject({ out: null, unset: true });
  });

  it('swaps when a handle is dragged past the other', () => {
    expect(resolveHandleMove('in', 12, { in: 2, out: 10 }, 60, 24)).toMatchObject({ in: 10, out: 12, swapped: true, rejected: false });
    expect(resolveHandleMove('out', 1, { in: 2, out: 10 }, 60, 24)).toMatchObject({ in: 1, out: 2, swapped: true, rejected: false });
  });

  it('rejects a move onto the other point', () => {
    expect(resolveHandleMove('in', 10.01, { in: 2, out: 10 }, 60, 24)).toMatchObject({ in: 2, out: 10, rejected: true });
  });

  it('rounds a release to a frame', () => {
    expect(resolveHandleMove('in', 1.03, { in: null, out: null }, 60, 24).in).toBeCloseTo(1);
    const out = resolveHandleMove('out', 33.333, { in: null, out: null }, 60, 24).out!;
    expect(out * 24).toBeCloseTo(Math.round(out * 24));
  });

  it('moves by keys, one or ten frames, within the limits', () => {
    const range = { in: 2, out: 10 };
    expect(handleKeyTarget('ArrowRight', false, 'in', range, 60, 24)).toBeCloseTo(2 + 1 / 24);
    expect(handleKeyTarget('ArrowLeft', true, 'out', range, 60, 24)).toBeCloseTo(10 - 10 / 24);
    expect(handleKeyTarget('End', false, 'in', range, 60, 24)).toBeCloseTo(10 - 1 / 24);
    expect(handleKeyTarget('Home', false, 'out', range, 60, 24)).toBeCloseTo(2 + 1 / 24);
    expect(handleKeyTarget('a', false, 'in', range, 60, 24)).toBeNull();
  });

  it('unsets by Delete, Backspace, and by a key that takes the handle to its own end', () => {
    const range = { in: 2, out: 10 };
    expect(handleKeyTarget('Delete', false, 'out', range, 60, 24)).toBe('clear');
    expect(handleKeyTarget('Backspace', false, 'in', range, 60, 24)).toBe('clear');
    expect(handleKeyTarget('Home', false, 'in', range, 60, 24)).toBe('clear');
    expect(handleKeyTarget('End', false, 'out', range, 60, 24)).toBe('clear');
    expect(handleKeyTarget('ArrowLeft', false, 'in', { in: 1 / 24, out: null }, 60, 24)).toBe('clear');
  });

  it('starts an unset handle from its end of the clip', () => {
    const unset = { in: null, out: null };
    expect(handleKeyTarget('ArrowRight', false, 'in', unset, 60, 24)).toBeCloseTo(1 / 24);
    expect(handleKeyTarget('ArrowRight', true, 'in', unset, 60, 24)).toBeCloseTo(10 / 24);
    expect(handleKeyTarget('ArrowLeft', false, 'out', unset, 60, 24)).toBeCloseTo(lastFrameTime - 1 / 24);
    expect(handleKeyTarget('ArrowLeft', false, 'in', unset, 60, 24)).toBe('clear');
    expect(handleKeyTarget('ArrowRight', false, 'out', unset, 60, 24)).toBe('clear');
  });

  it('a key cannot push a handle past the other point', () => {
    expect(handleKeyTarget('ArrowRight', true, 'in', { in: 9.9, out: 10 }, 60, 24)).toBeCloseTo(10 - 1 / 24);
    expect(handleKeyTarget('ArrowLeft', true, 'out', { in: 9.9, out: 10 }, 60, 24)).toBeCloseTo(framesFromSeconds(9.9, 24) / 24 + 1 / 24);
  });
});

describe('rangeBand', () => {
  it('is null with no points', () => {
    expect(rangeBand({ in: null, out: null }, 5, 60)).toBeNull();
  });

  it('spans In to Out with the played part up to the playhead', () => {
    expect(rangeBand({ in: 15, out: 45 }, 30, 60)).toEqual({ start: 25, end: 75, played: 50 });
  });

  it('keeps the played part inside the band when the playhead is outside it', () => {
    expect(rangeBand({ in: 15, out: 45 }, 5, 60)!.played).toBe(25);
    expect(rangeBand({ in: 15, out: 45 }, 55, 60)!.played).toBe(75);
  });

  it('runs from the start or to the end with one point', () => {
    expect(rangeBand({ in: 15, out: null }, 0, 60)).toMatchObject({ start: 25, end: 100 });
    expect(rangeBand({ in: null, out: 45 }, 0, 60)).toMatchObject({ start: 0, end: 75 });
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

describe('handleBox: anchored on the outer edge', () => {
  it('puts the In tab left of its point and the Out tab right of it', () => {
    const inBox = handleBox('in', 10, 60, 1200);
    const outBox = handleBox('out', 30, 60, 1200);
    expect(inBox.anchor).toBe(200);
    expect(inBox.tabRight).toBe(200);
    expect(inBox.tabLeft).toBe(191);
    expect(outBox.anchor).toBe(600);
    expect(outBox.tabLeft).toBe(600);
    expect(outBox.tabRight).toBe(609);
  });

  it('keeps unset handles at the very ends, outside the track', () => {
    expect(handleBox('in', 0, 60, 1200).tabRight).toBe(0);
    expect(handleBox('in', 0, 60, 1200).tabLeft).toBe(-9);
    expect(handleBox('out', 60, 60, 1200).tabLeft).toBe(1200);
    expect(handleBox('out', 60, 60, 1200).tabRight).toBe(1209);
  });

  it('slides a target back inside the player when it would pass the edge', () => {
    const room = { left: 28, right: 28 };
    const first = handleBox('in', 0, 60, 300, { hit: 44, room });
    expect(first.hitLeft).toBe(-28);
    expect(first.hitRight - first.hitLeft).toBe(44);
    expect(first.hitRight).toBeGreaterThanOrEqual(first.anchor);
    const last = handleBox('out', 60, 60, 300, { hit: 44, room });
    expect(last.hitRight).toBe(328);
    expect(last.hitRight - last.hitLeft).toBe(44);
    expect(last.hitLeft).toBeLessThanOrEqual(last.anchor);
  });

  it('keeps targets outward, 44 wide, away from the edges', () => {
    const inBox = handleBox('in', 30, 60, 300, { hit: 44, room: { left: 28, right: 28 }, otherX: 300 });
    expect(inBox.hitRight).toBe(inBox.anchor);
    expect(inBox.hitRight - inBox.hitLeft).toBe(44);
  });

  it('splits an overlap halfway between the anchors, so the nearer handle gets the press', () => {
    const room = { left: 28, right: 28 };
    // A range of 10 px at the start: In at 0, Out at 10.
    const inBox = handleBox('in', 0, 60, 300, { hit: 44, room, otherX: 10 });
    const outBox = handleBox('out', 2, 60, 300, { hit: 44, room, otherX: 0 });
    expect(inBox.hitRight).toBeLessThanOrEqual(outBox.hitLeft);
    expect(inBox.hitRight).toBe(5); // halfway between 0 and 10
    expect(outBox.hitLeft).toBeGreaterThanOrEqual(5);
    // Away from the edges, a one-frame range never overlaps at all.
    const a = handleBox('in', 10, 60, 1200, { hit: 44, otherX: 200.8 });
    const b = handleBox('out', 10 + 1 / 24, 60, 1200, { hit: 44, otherX: 200 });
    expect(a.hitRight).toBeLessThanOrEqual(b.hitLeft);
  });
});
