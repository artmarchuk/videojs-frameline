import { describe, expect, it, vi } from 'vitest';

import { createProStore } from '../store';
import {
  buildCutList,
  earlyPositionFrame,
  effectiveRange,
  findCut,
  formatLinkPosition,
  linkFragment,
  grabFileName,
  isNarrowDock,
  narrowDockRows,
  lastFrameOf,
  timecodeLeadLength,
  outsideRange,
  NO_EARLY_POSITION,
  playbackDecision,
  queueEarlyPosition,
  linkSeconds,
  parseLinkSeconds,
  readLinkPosition,
  resolveLinkPosition,
  resolveLinkUrl,
  seekTimeForFrame,
  stepTarget,
  targetStep,
  TARGET_TRIES,
  type EarlyCall,
  type PendingTarget,
  type TargetAction,
  type TargetEvent,
  withLinkPosition,
} from './logic';
import { framesFromSeconds, parseTimecode, type TimecodeOptions } from '../timecode';

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

describe('a requested frame is the target until it lands', () => {
  /** Runs an event order and returns what the skin did at each event, and the target left at the end. */
  const run = (events: TargetEvent[], start: PendingTarget | null = null) => {
    let pending = start;
    const actions: TargetAction[] = [];
    for (const event of events) {
      const step = targetStep(pending, event);
      pending = step.pending;
      actions.push(step.action);
    }
    return { actions, pending };
  };

  it('seeks to a requested frame and forgets it once a seek ends there', () => {
    expect(run([{ type: 'request', frame: 605 }, { type: 'seeking', snapped: true }, { type: 'seeked', frame: 605 }])).toEqual({
      actions: ['seek', 'none', 'none'],
      pending: null,
    });
  });

  it('snaps every seek to its frame while nothing is asked for', () => {
    expect(targetStep(null, { type: 'seeking', snapped: false }).action).toBe('snap');
    expect(targetStep(null, { type: 'seeking', snapped: true }).action).toBe('none');
    expect(targetStep(null, { type: 'seeked', frame: 3 })).toEqual({ pending: null, action: 'none' });
  });

  // WebKit, a frame link with autoplay: the streaming engine seeks to 0.121 s to skip a gap at the start, the link
  // asks for frame 605 while that seek runs, and `seeking` then reports 0.121 s. Snapping it would replace the link.
  it('leaves a seek it did not make alone, and asks for the frame again when that seek ends', () => {
    const { actions, pending } = run([
      { type: 'request', frame: 605 },
      { type: 'seeking', snapped: false },
      { type: 'seeked', frame: 3 },
      { type: 'seeking', snapped: true },
      { type: 'seeked', frame: 605 },
    ]);
    expect(actions).toEqual(['seek', 'none', 'seek', 'none', 'none']);
    expect(pending).toBeNull();
  });

  // The landing page: the staged frame is asked for, and a seek that was already running ends first.
  it('holds the frame through a seek that was running before the request', () => {
    const { actions, pending } = run([{ type: 'request', frame: 92 }, { type: 'seeked', frame: 0 }, { type: 'seeked', frame: 92 }]);
    expect(actions).toEqual(['seek', 'seek', 'none']);
    expect(pending).toBeNull();
  });

  it('gives up after the limit, and snaps seeks again', () => {
    const elsewhere: TargetEvent = { type: 'seeked', frame: 3 };
    const { actions, pending } = run([{ type: 'request', frame: 605 }, ...Array<TargetEvent>(TARGET_TRIES + 1).fill(elsewhere), { type: 'seeking', snapped: false }]);
    expect(actions).toEqual(['seek', ...Array<TargetAction>(TARGET_TRIES).fill('seek'), 'giveUp', 'snap']);
    expect(pending).toBeNull();
  });

  it('drops the target on user input: their seek is snapped and nothing pulls them back', () => {
    const { actions, pending } = run([
      { type: 'request', frame: 605 },
      { type: 'user' },
      { type: 'seeking', snapped: false },
      { type: 'seeked', frame: 40 },
    ]);
    expect(actions).toEqual(['seek', 'none', 'snap', 'none']);
    expect(pending).toBeNull();
  });

  it('takes the newest request as the target', () => {
    const { pending } = run([{ type: 'request', frame: 10 }, { type: 'seeked', frame: 3 }, { type: 'request', frame: 11 }]);
    expect(pending).toEqual({ frame: 11, tries: 0 });
  });

  it('while playing, counts a seek that ended just past the frame as landed', () => {
    const asked = { frame: 100, tries: 0 };
    expect(targetStep(asked, { type: 'seeked', frame: 102, playing: true })).toEqual({ pending: null, action: 'none' });
    expect(targetStep(asked, { type: 'seeked', frame: 102 }).action).toBe('seek');
    expect(targetStep(asked, { type: 'seeked', frame: 99, playing: true }).action).toBe('seek');
  });
});

describe('links', () => {
  const link = (frame: number, fps: number, options: TimecodeOptions = {}) => withLinkPosition('', formatLinkPosition(frame, fps, options));
  const open = (hash: string, fps: number, options: TimecodeOptions = {}, lastFrame?: number) =>
    resolveLinkPosition(readLinkPosition(hash), fps, options, lastFrame)?.frame ?? null;
  const ntscStart = parseTimecode('01:00:00;00', 29.97, { dropFrame: true }) ?? 0;

  it('writes the spec examples', () => {
    expect(link(1490, 24)).toBe('#t=62.104&tc=00:01:02:02');
    expect(link(0, 25)).toBe('#t=0.02&tc=00:00:00:00');
    expect(link(1800, 29.97, { dropFrame: true })).toMatch(/&tc=00:01:00;02$/);
    expect(link(17982, 29.97, { dropFrame: true })).toBe('#t=600.016&tc=00:10:00;00');
    expect(link(17982, 30000 / 1001, { dropFrame: true, startFrames: ntscStart })).toBe('#t=600.016&tc=01:10:00;00');
  });

  it('writes the middle of the frame, with no trailing zeros', () => {
    expect(linkSeconds(1490, 24)).toBe('62.104');
    expect(linkSeconds(1489, 24)).toBe('62.063');
    expect(linkSeconds(12, 24)).toBe('0.521');
    expect(linkSeconds(0, 25)).toBe('0.02');
    expect(linkSeconds(2, 2)).toBe('1.25');
  });

  it('keeps the host data in its order, and replaces an old t and tc', () => {
    const value = { t: '12.229', tc: '00:00:12:05' };
    expect(withLinkPosition('', value)).toBe('#t=12.229&tc=00:00:12:05');
    expect(withLinkPosition('#chapter-2', value)).toBe('#chapter-2&t=12.229&tc=00:00:12:05');
    expect(withLinkPosition('#width=320&t=00:00:01:00&dir=rtl&tc=00:00:01:00', value)).toBe('#width=320&dir=rtl&t=12.229&tc=00:00:12:05');
    expect(withLinkPosition('#tcx=1&t&ratio=9:16', value)).toBe('#tcx=1&ratio=9:16&t=12.229&tc=00:00:12:05');
    expect(withLinkPosition('#a=1:~:text=hello', value)).toBe('#a=1&t=12.229&tc=00:00:12:05:~:text=hello');
  });

  it('reads the raw values, the last of each key, up to a text fragment directive', () => {
    expect(readLinkPosition('#t=62.104&tc=00:01:02:02')).toEqual({ t: '62.104', tc: '00:01:02:02' });
    expect(readLinkPosition('#chapter-2&t=00:00:12:05')).toEqual({ t: '00:00:12:05', tc: null });
    expect(readLinkPosition('#chapter-2')).toEqual({ t: null, tc: null });
    expect(readLinkPosition('#t=')).toEqual({ t: null, tc: null });
    expect(readLinkPosition('#t=%E0%A4%A&tc=00%3A00%3A01%3A00')).toEqual({ t: null, tc: '00:00:01:00' });
    expect(readLinkPosition('#t=1&t=2')).toEqual({ t: '2', tc: null });
    expect(readLinkPosition('#a=1:~:text=x&t=5')).toEqual({ t: null, tc: null });
    expect(readLinkPosition('#t=5:~:t=9')).toEqual({ t: '5', tc: null });
  });

  it('round-trips frame to link and back, from either key alone and from both', () => {
    const cases: { fps: number; options: TimecodeOptions }[] = [
      { fps: 23.976, options: {} },
      { fps: 24, options: {} },
      { fps: 25, options: {} },
      { fps: 29.97, options: { dropFrame: true, startFrames: ntscStart } },
      { fps: 59.94, options: { dropFrame: true } },
    ];
    for (const { fps, options } of cases) {
      const last = lastFrameOf(3 * 3600, fps); // the last frame of a three-hour video
      for (const frame of [0, 1, 2, 293, 1799, 1800, 1801, 17982, 54321, 107892, last - 1, last]) {
        const hash = withLinkPosition('#host=1', formatLinkPosition(frame, fps, options));
        const { t, tc } = readLinkPosition(hash);
        expect(resolveLinkPosition({ t, tc }, fps, options, last)).toEqual({ frame, from: 'tc', disagreement: null });
        expect(resolveLinkPosition({ t, tc: null }, fps, options, last)?.frame).toBe(frame);
        expect(resolveLinkPosition({ t: null, tc }, fps, options, last)?.frame).toBe(frame);
      }
    }
  });

  it('reads every form of t', () => {
    // Old links: a timecode in t, with the start offset and drop-frame.
    expect(open('#t=00:01:02:02', 24)).toBe(1490);
    expect(open('#t=00:01:00;02', 29.97)).toBe(1800);
    expect(open('#t=01:10:00;00', 29.97, { dropFrame: true, startFrames: ntscStart })).toBe(17982);
    // Media Fragments seconds.
    expect(open('#t=62.104', 24)).toBe(1490);
    expect(open('#t=62.5', 24)).toBe(1500);
    expect(open('#t=62.', 24)).toBe(1488);
    expect(open('#t=npt:62.5', 24)).toBe(1500);
    expect(open('#t=1:02.5', 24)).toBe(1500);
    expect(open('#t=01:02.5', 24)).toBe(1500);
    expect(open('#t=0:01:02.5', 24)).toBe(1500);
    expect(open('#t=npt:0:01:02.5', 24)).toBe(1500);
    expect(open('#t=00:01:02.02', 24)).toBe(1488); // three fields: seconds, not a timecode
    // Platform shorthand.
    expect(open('#t=90s', 24)).toBe(2160);
    expect(open('#t=1m42s', 24)).toBe(2448);
    expect(open('#t=1h2m3s', 25)).toBe(3723 * 25);
    expect(open('#t=2m', 24)).toBe(2880);
    expect(open('#t=1M2S', 24)).toBe(1488);
    // Seconds land in the frame that contains them, with an allowance for floating point.
    expect(open('#t=0.041', 24)).toBe(0);
    expect(open(`#t=${25 / 24}`, 24)).toBe(25);
  });

  it('reads tc, with a dot or a semicolon for drop-frame', () => {
    expect(open('#tc=00:01:02:02', 24)).toBe(1490);
    expect(open('#tc=00:01:00;02', 29.97)).toBe(1800);
    expect(open('#tc=00:01:00.02', 29.97)).toBe(1800);
    expect(open('#tc=00:01:00:02', 29.97, { dropFrame: true })).toBe(1800);
    expect(open('#tc=01:10:00;00', 29.97, { dropFrame: true, startFrames: ntscStart })).toBe(17982);
    expect(open('#t=00:01:00.02', 29.97)).toBe(1798); // in t, a dot is seconds (60.02 s)
  });

  it('reads the start of a range', () => {
    expect(open('#t=10,20', 24)).toBe(240);
    expect(open('#t=,20', 24)).toBe(0);
    expect(open('#t=npt:10,20', 24)).toBe(240);
    expect(open('#t=00:00:10:00,00:00:20:00', 24)).toBe(240);
    expect(open('#tc=00:00:10:00,00:00:20:00', 24)).toBe(240);
    expect(open('#tc=,00:00:20:00', 24)).toBe(0);
  });

  it('stops at a text fragment directive', () => {
    expect(open('#host=1:~:text=t=10', 24)).toBeNull();
    expect(open('#t=5:~:text=hello', 24)).toBe(120);
  });

  it('prefers tc, and reports a t more than one frame away', () => {
    expect(resolveLinkPosition({ t: '62.104', tc: '00:01:02:02' }, 24)).toEqual({ frame: 1490, from: 'tc', disagreement: null });
    expect(resolveLinkPosition({ t: '62.063', tc: '00:01:02:02' }, 24)).toEqual({ frame: 1490, from: 'tc', disagreement: null });
    expect(resolveLinkPosition({ t: '10', tc: '00:01:02:02' }, 24)).toEqual({ frame: 1490, from: 'tc', disagreement: 240 });
    expect(resolveLinkPosition({ t: 'garbage', tc: '00:01:02:02' }, 24)).toEqual({ frame: 1490, from: 'tc', disagreement: null });
  });

  it('takes the first value inside the media', () => {
    // A tc before the start offset, or past the end, gives way to t.
    expect(resolveLinkPosition({ t: '62.104', tc: '00:01:02:02' }, 24, { startFrames: 86400 })).toEqual({ frame: 1490, from: 't', disagreement: null });
    expect(resolveLinkPosition({ t: '5', tc: '00:10:00:00' }, 24, {}, 1000)).toEqual({ frame: 120, from: 't', disagreement: null });
    expect(open('#t=90', 24, {}, 1000)).toBeNull();
    expect(open('#t=41.666', 24, {}, 1000)).toBe(999);
  });

  it('ignores anything it cannot read', () => {
    const bad = ['', '#', '#t', '#t=abc', '#t=12:5', '#t=00:00:00:99', '#t=-4', '#t=1e3', '#t=1:60', '#t=0:60:00', '#t=00:61:00:00',
      '#t=npt:', '#t=1h2x', '#t=h', '#t=s', '#t=1.5h', '#t=Infinity', '#t=0x10', '#tc=banana', '#tc=00:00:00', '#tc=1:2:3:4',
      '#tc=00:01:00;00', '#t=%E0%A4%A', '#tc=00:00:01:00.5', '#T=10', '#time=10', '#chapter-2'];
    for (const hash of bad) expect(open(hash, 29.97), hash).toBeNull();
    expect(parseLinkSeconds(' 1m ')).toBe(60);
    expect(parseLinkSeconds('m')).toBeNull();
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

describe('timecodeLeadLength', () => {
  const split = (value: string) => [value.slice(0, timecodeLeadLength(value)), value.slice(timecodeLeadLength(value))];

  it('dims the leading zeros and separators up to the first digit that is not zero', () => {
    expect(split('00:00:02:04')).toEqual(['00:00:0', '2:04']);
    expect(split('00:12:02:04')).toEqual(['00:', '12:02:04']);
  });

  it('never dims the frames', () => {
    expect(split('00:00:00:00')).toEqual(['00:00:00:', '00']);
    expect(split('00:00:00:07')).toEqual(['00:00:00:', '07']);
  });

  it('dims nothing when the hours are not zero, and never splits the first field', () => {
    expect(split('01:00:00:00')).toEqual(['', '01:00:00:00']);
    expect(split('10:00:00:00')).toEqual(['', '10:00:00:00']);
    expect(split('100:00:00:00')).toEqual(['', '100:00:00:00']);
    expect(split('001:00:00:00')).toEqual(['', '001:00:00:00']);
  });

  it('dims nothing in seconds mode', () => {
    expect(timecodeLeadLength('0.083', true)).toBe(0);
    expect(timecodeLeadLength('00:00:02:04', true)).toBe(0);
  });

  it('treats the drop-frame separator like a colon', () => {
    expect(split('00:00:00;12')).toEqual(['00:00:00;', '12']);
    expect(split('00:01:00;02')).toEqual(['00:0', '1:00;02']);
  });

  it('leaves a string of two characters or fewer alone', () => {
    expect(timecodeLeadLength('00')).toBe(0);
    expect(timecodeLeadLength('')).toBe(0);
  });
});

describe('linkUrl: what Copy link copies', () => {
  const value = formatLinkPosition(1490, 24);
  const position = { fragment: linkFragment(value), frame: 1490, time: 1490 / 24, timecode: value.tc };
  const page = 'https://app.example/review/42?clip=7';
  const resolve = (linkUrl: unknown, pageUrl = page) => resolveLinkUrl(linkUrl, position, value, pageUrl);

  it('writes the fragment in one place', () => {
    expect(position.fragment).toBe('t=62.104&tc=00:01:02:02');
    expect(withLinkPosition('', value)).toBe(`#${position.fragment}`);
  });

  it('defaults to the page URL plus # plus the fragment', () => {
    expect(resolve(undefined)).toEqual({ action: 'copy', url: `${page}#${position.fragment}` });
  });

  it('keeps the other hash keys of the page and replaces an old position', () => {
    expect(resolve(undefined, `${page}#panel=notes&t=1&tc=00:00:01:00`)).toEqual({ action: 'copy', url: `${page}#panel=notes&${position.fragment}` });
  });

  it('takes a string as the base URL and keeps its own hash keys', () => {
    expect(resolve('https://share.example/v/abc')).toEqual({ action: 'copy', url: `https://share.example/v/abc#${position.fragment}` });
    expect(resolve('https://share.example/v/abc?x=1#tab=cut')).toEqual({ action: 'copy', url: `https://share.example/v/abc?x=1#tab=cut&${position.fragment}` });
    // The page's own hash does not leak into another base.
    expect(resolve('https://share.example/v/abc', `${page}#panel=notes`)).toEqual({ action: 'copy', url: `https://share.example/v/abc#${position.fragment}` });
  });

  it('resolves a relative string against the page', () => {
    expect(resolve('/share/abc')).toEqual({ action: 'copy', url: `https://app.example/share/abc#${position.fragment}` });
    expect(resolve('../watch?v=9')).toEqual({ action: 'copy', url: `https://app.example/watch?v=9#${position.fragment}` });
  });

  it('falls back to the page URL for a string that is not a URL, with a warning', () => {
    const result = resolve('https://');
    expect(result).toMatchObject({ action: 'copy', url: `${page}#${position.fragment}` });
    expect(result).toHaveProperty('warning');
    expect(resolve(42)).toMatchObject({ action: 'copy', url: `${page}#${position.fragment}`, warning: expect.any(String) });
  });

  it('calls a function with the position and copies the string it returns as it is', () => {
    const linkUrl = vi.fn((at: { fragment: string }) => `https://app.example/#/review/42?${at.fragment}`);
    expect(resolve(linkUrl)).toEqual({ action: 'copy', url: 'https://app.example/#/review/42?t=62.104&tc=00:01:02:02' });
    expect(linkUrl).toHaveBeenCalledExactlyOnceWith(position);
  });

  it('copies nothing when the function returns null: the host handled it', () => {
    expect(resolve(() => null)).toEqual({ action: 'handled' });
  });

  it('fails, with a warning, when the function throws', () => {
    const result = resolve(() => {
      throw new Error('no route');
    });
    expect(result).toMatchObject({ action: 'fail' });
    expect((result as { warning: string }).warning).toContain('no route');
  });

  it('fails, with a warning, when the function returns anything but a string or null', () => {
    for (const returned of [undefined, 42, {}, '', Promise.resolve('https://late.example/')]) {
      expect(resolve(() => returned)).toMatchObject({ action: 'fail', warning: expect.any(String) });
    }
    expect((resolve(() => Promise.resolve('x')) as { warning: string }).warning).toContain('synchronous');
  });
});

describe('position calls before the media is ready', () => {
  const FPS = 24;
  const LAST = 1345; // the reel: 56.083 s
  const queue = (...calls: EarlyCall[]) => calls.reduce(queueEarlyPosition, NO_EARLY_POSITION);
  const seek = (time: number): EarlyCall => ({ type: 'seek', time });
  const step = (frames: number): EarlyCall => ({ type: 'step', frames });

  it('has nothing to send when nothing was asked for', () => {
    expect(earlyPositionFrame(NO_EARLY_POSITION, 0, LAST, FPS)).toBeNull();
    expect(earlyPositionFrame(NO_EARLY_POSITION, 73, LAST, FPS)).toBeNull();
  });

  it('keeps a seek and sends the frame that contains its time', () => {
    expect(queue(seek(10.02))).toEqual({ seek: 10.02, steps: 0 });
    expect(earlyPositionFrame(queue(seek(10.02)), 0, LAST, FPS)).toBe(240);
    // The frame the video opened on does not matter to a seek, also when it is the same frame.
    expect(earlyPositionFrame(queue(seek(0)), 0, LAST, FPS)).toBe(0);
    expect(earlyPositionFrame(queue(seek(10.02)), 240, LAST, FPS)).toBe(240);
  });

  it('adds steps up, from the frame the video opens on', () => {
    expect(queue(step(1), step(1))).toEqual({ seek: null, steps: 2 });
    expect(earlyPositionFrame(queue(step(1), step(1)), 0, LAST, FPS)).toBe(2);
    expect(earlyPositionFrame(queue(step(1), step(1)), 73, LAST, FPS)).toBe(75);
    expect(earlyPositionFrame(queue(step(5), step(-2)), 73, LAST, FPS)).toBe(76);
  });

  it('lets a seek replace the steps before it', () => {
    expect(queue(step(5), seek(10.02))).toEqual({ seek: 10.02, steps: 0 });
    expect(earlyPositionFrame(queue(step(5), seek(10.02)), 0, LAST, FPS)).toBe(240);
    expect(earlyPositionFrame(queue(seek(3), step(4), seek(10.02)), 0, LAST, FPS)).toBe(240);
  });

  it('counts steps after a seek from the seek\'s frame', () => {
    expect(earlyPositionFrame(queue(seek(10.02), step(1), step(1)), 0, LAST, FPS)).toBe(242);
    expect(earlyPositionFrame(queue(seek(10.02), step(-3)), 500, LAST, FPS)).toBe(237);
  });

  it('stays inside the media', () => {
    expect(earlyPositionFrame(queue(seek(9999)), 0, LAST, FPS)).toBe(LAST);
    expect(earlyPositionFrame(queue(seek(-4)), 12, LAST, FPS)).toBe(0);
    expect(earlyPositionFrame(queue(seek(56), step(100)), 0, LAST, FPS)).toBe(LAST);
    expect(earlyPositionFrame(queue(seek(1), step(-100)), 0, LAST, FPS)).toBe(0);
  });

  it('sends nothing when the steps end on the frame the video opened on', () => {
    expect(earlyPositionFrame(queue(step(-3)), 0, LAST, FPS)).toBeNull();
    expect(earlyPositionFrame(queue(step(2), step(-2)), 40, LAST, FPS)).toBeNull();
    expect(earlyPositionFrame(queue(step(9)), LAST, LAST, FPS)).toBeNull();
  });

  it('ignores calls that are not numbers, and keeps whole frames only', () => {
    expect(queue(seek(Number.NaN))).toBe(NO_EARLY_POSITION);
    expect(queue(seek(10.02), seek(Number.POSITIVE_INFINITY))).toEqual({ seek: 10.02, steps: 0 });
    expect(queue(step(Number.NaN), step(0), step(0.9))).toBe(NO_EARLY_POSITION);
    expect(queue(step(2.9), step(-1.5))).toEqual({ seek: null, steps: 1 });
  });
});
