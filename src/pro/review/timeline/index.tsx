/** @jsxImportSource react */

import './timeline.css';
import { Slider as SliderPrimitive, TimeSlider } from '@videojs/react';
import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';

import { useProStore, useProStoreApi } from '../../context';
import { warnOnce } from '../../dev';
import type { Marker } from '../../store';
import { secondsFromFrames } from '../../timecode';
import { useAnnounce } from '../announcer';
import type { ReviewController } from '../controller';
import { JUMP_FRAMES } from '../logic';
import { reviewStrings as t } from '../strings';
import {
  buildLabels,
  buildTicks,
  chooseTicks,
  clampBubble,
  handleKeyTarget,
  handleTimeFromX,
  isSnapped,
  layoutMarkers,
  MARKER_SOFT_LIMIT,
  rangeBand,
  resolveHandleMove,
  snapFrame,
  snapSeekTime,
  timeToPercent,
  timeToX,
  type MarkerItem,
  type RangePoints,
} from './logic';

export interface TimelineProps {
  controller: ReviewController;
  fps: number;
  /** Markers to draw; pass an empty list when the `markers` feature is off. */
  markers: readonly Marker[];
  /** Draw the In/Out band and handles. */
  range: boolean;
  video: HTMLVideoElement | null;
  renderThumbnail?: SliderPrimitive.Thumbnail.ImageProps['render'];
}

/** Width of an element's content box, kept current with a `ResizeObserver`. 0 until measured. */
function useWidth(ref: { current: HTMLElement | null }): number {
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const update = () => setWidth(element.clientWidth);
    update();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);
  return width;
}

/**
 * Frame snapping. In the Review and Studio tiers every seek, whatever started it (the timeline, a slider key, `J`,
 * `L`, a number key), is moved to the middle of the frame it lands in: the same half-frame rule the step buttons
 * use. It runs inside the `seeking` event, so the browser performs one seek, not two.
 */
function useFrameSnap(video: HTMLVideoElement | null, fps: number) {
  useEffect(() => {
    if (!video) return;
    const onSeeking = () => {
      const duration = video.duration;
      if (!(duration > 0) || !Number.isFinite(duration)) return;
      const time = video.currentTime;
      if (isSnapped(time, duration, fps)) return;
      video.currentTime = snapSeekTime(time, duration, fps);
    };
    video.addEventListener('seeking', onSeeking);
    return () => video.removeEventListener('seeking', onSeeking);
  }, [video, fps]);
}

/**
 * The Review and Studio timeline: "a slider that looks like a ruler". It is the Video.js `TimeSlider` (root, track,
 * fill, buffer, thumb, preview, chapters), so slider semantics, pointer capture and media state stay Video.js's job.
 * Around it: a marker lane, a tick ruler, the In/Out band with draggable handles, and a timecode bubble on the
 * playhead. Time always runs left to right, also on right-to-left pages.
 */
export function Timeline({ controller, fps, markers, range, video, renderThumbnail }: TimelineProps) {
  const duration = useProStore((state) => state.duration);
  const seconds = useProStore((state) => state.timeDisplay === 'seconds');
  const storeIn = useProStore((state) => state.inPoint);
  const storeOut = useProStore((state) => state.outPoint);

  const root = useRef<HTMLDivElement>(null);
  const thumb = useRef<HTMLDivElement | null>(null);
  const width = useWidth(root);

  useFrameSnap(video, fps);

  // What a position reads as, everywhere on the timeline except the ruler: full timecode, or seconds.
  const format = useCallback(
    (time: number) => {
      const frame = snapFrame(time, duration, fps);
      return seconds ? secondsFromFrames(frame, fps).toFixed(3) : controller.timecode(frame);
    },
    [controller, duration, fps, seconds]
  );

  // While a handle is dragged the range is previewed here; the store (and `onInOutChange`) hears of it on release.
  const [draft, setDraft] = useState<RangePoints | null>(null);
  const points: RangePoints = range ? (draft ?? { in: storeIn, out: storeOut }) : { in: null, out: null };
  const band = rangeBand(points, 0, duration);

  const style = {
    '--pro-band-start': band ? `${band.start}%` : undefined,
    '--pro-band-end': band ? `${band.end}%` : undefined,
  } as CSSProperties;

  const focusThumb = useCallback(() => thumb.current?.focus({ preventScroll: true }), []);

  /**
   * Keys on the focused seek slider. One rule with the global map: `←` `→` step a frame while paused and seek 5 s
   * while playing, `Shift` jumps 10 frames. `↑` `↓` do the same as `→` `←`, as on any slider. `Home`, `End`,
   * `PageUp` and `PageDown` stay with Video.js; the frame snap above rounds where they land.
   */
  const onThumbKey = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>, stock?: (event: ReactKeyboardEvent<HTMLDivElement>) => void) => {
      const forward = event.key === 'ArrowRight' || event.key === 'ArrowUp';
      const back = event.key === 'ArrowLeft' || event.key === 'ArrowDown';
      if ((!forward && !back) || event.altKey || event.ctrlKey || event.metaKey) {
        stock?.(event);
        return;
      }
      // Prevented, so the player's global hotkeys skip this key press: one action per key.
      event.preventDefault();
      const direction = forward ? 1 : -1;
      if (event.shiftKey) controller.step(direction * JUMP_FRAMES);
      else if (!video || video.paused) controller.step(direction);
      else controller.seekBy(direction * 5);
    },
    [controller, video]
  );

  return (
    <div className={'pro-timeline'} dir="ltr" style={style} data-range={band ? (band.openStart ? 'open-start' : band.openEnd ? 'open-end' : 'both') : 'none'} data-display={seconds ? 'seconds' : 'timecode'} data-interactive="">
      <TimeSlider.Root ref={root} className={'pro-tl'} label={t.seek}>
        {markers.length > 0 && <MarkerLane markers={markers} duration={duration} width={width} format={format} controller={controller} />}
        <Ruler duration={duration} width={width} fps={fps} />

        <TimeSlider.Chapters
          className={'pro-tl-chapters'}
          renderChapter={(props) => (
            <div className={'pro-tl-chapter'} {...props}>
              <TimeSlider.Track className={'pro-tl-track'}>
                <TimeSlider.Fill className={'pro-tl-fill'} />
                <span className={'pro-tl-band'} />
                <span className={'pro-tl-band-played'} />
              </TimeSlider.Track>
            </div>
          )}
        />
        <TimeSlider.Buffer className={'pro-tl-buffer'} />

        <TimeSlider.Thumb
          className={'pro-tl-playhead'}
          render={(props, state) => (
            <div
              {...props}
              ref={(node) => {
                thumb.current = node;
                const forwarded = (props as { ref?: unknown }).ref;
                if (typeof forwarded === 'function') forwarded(node);
                else if (forwarded && typeof forwarded === 'object') (forwarded as { current: unknown }).current = node;
              }}
              aria-valuetext={format(state.value)}
              onKeyDownCapture={(event) => onThumbKey(event, props.onKeyDownCapture as never)}
            />
          )}
        />
        <PlayheadBubble format={controller} fps={fps} seconds={seconds} />

        {range && points.in !== null && (
          <RangeHandle which="in" points={points} duration={duration} fps={fps} width={width} root={root} format={format} setDraft={setDraft} onCleared={focusThumb} controller={controller} />
        )}
        {range && points.out !== null && (
          <RangeHandle which="out" points={points} duration={duration} fps={fps} width={width} root={root} format={format} setDraft={setDraft} onCleared={focusThumb} controller={controller} />
        )}

        <TimeSlider.Preview className={'pro-tl-preview'} overflow="clamp">
          <SliderPrimitive.Thumbnail.Root className={'media-slider-thumbnail'}>
            <SliderPrimitive.Thumbnail.Image render={renderThumbnail} className={'media-slider-thumbnail-image'} />
          </SliderPrimitive.Thumbnail.Root>
          <div className={'pro-tl-hover'}>
            <TimeSlider.Value className={'pro-tl-hover-value'} type="pointer" format={format} />
            <TimeSlider.ChapterTitle className={'pro-tl-hover-chapter'} />
          </div>
        </TimeSlider.Preview>
      </TimeSlider.Root>
    </div>
  );
}

/**
 * The bubble that rides the playhead with the current position. It re-renders when the frame changes and at no other
 * time; its position comes from the slider's CSS variables, clamped in CSS so it never leaves the timeline.
 */
function PlayheadBubble({ format, fps, seconds }: { format: ReviewController; fps: number; seconds: boolean }) {
  const frame = useProStore((state) => state.frame);
  return (
    <span className={'pro-tl-bubble'} aria-hidden="true">
      {seconds ? secondsFromFrames(frame, fps).toFixed(3) : format.timecode(frame)}
    </span>
  );
}

/**
 * Ticks and labels. Ticks are drawn on a canvas at device-pixel positions, so they stay crisp on any screen and cost
 * one element however dense they are; only the labels of the major ticks are DOM text. Redrawn when the width, the
 * duration or the frame rate changes, never per frame. Decorative: hidden from assistive technology.
 */
const Ruler = memo(function Ruler({ duration, width, fps }: { duration: number; width: number; fps: number }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const plan = useMemo(() => chooseTicks(duration, width, fps), [duration, width, fps]);
  const labels = useMemo(() => buildLabels(plan, duration, width), [plan, duration, width]);

  useLayoutEffect(() => {
    const element = canvas.current;
    if (!element || !(width > 0)) return;
    const ratio = Math.max(1, window.devicePixelRatio || 1);
    const height = element.clientHeight;
    element.width = Math.round(width * ratio);
    element.height = Math.round(height * ratio);
    const context = element.getContext('2d');
    if (!context) return;
    context.clearRect(0, 0, element.width, element.height);
    if (!(duration > 0)) return;

    const styles = getComputedStyle(element);
    const colour = (name: string, fallback: string) => styles.getPropertyValue(name).trim() || fallback;
    const paint = {
      minor: { colour: colour('--pro-tick-minor', '#55555b'), height: 0.2 },
      mid: { colour: colour('--pro-tick-mid', '#77777e'), height: 0.4 },
      major: { colour: colour('--pro-tick-major', '#8e8e95'), height: 1 },
    };
    // One device pixel wide; two on very dense screens, where one would be too faint.
    const line = ratio >= 3 ? 2 : 1;
    for (const tick of buildTicks(plan, duration, width)) {
      const { colour: fill, height: part } = paint[tick.level];
      const x = Math.min(Math.round(tick.x * ratio), element.width - line);
      const tall = Math.round(height * part * ratio);
      context.fillStyle = fill;
      context.fillRect(x, element.height - tall, line, tall);
    }
  }, [plan, duration, width]);

  return (
    <div className={'pro-tl-ruler'} aria-hidden="true">
      <canvas ref={canvas} className={'pro-tl-ticks'} />
      {labels.map((label) => (
        <span key={label.time} className={'pro-tl-label'} style={{ left: label.x }}>
          {label.text}
        </span>
      ))}
    </div>
  );
});

/**
 * The marker lane. Points are flags, ranges are bars, and points that would overlap collapse into a count badge, so
 * shape tells the kinds apart, not colour. The lane is for the pointer only: no tab stops, hidden from assistive
 * technology. Keyboard and screen-reader users reach the same markers through `[` `]` and the Markers list.
 */
const MarkerLane = memo(function MarkerLane({
  markers,
  duration,
  width,
  format,
  controller,
}: {
  markers: readonly Marker[];
  duration: number;
  width: number;
  format: (time: number) => string;
  controller: ReviewController;
}) {
  const selected = useProStore((state) => state.selectedMarker);
  const [hover, setHover] = useState<MarkerItem | null>(null);
  const tip = useRef<HTMLSpanElement>(null);

  if (markers.length > MARKER_SOFT_LIMIT)
    warnOnce(`${markers.length} markers passed; the timeline is designed for up to ${MARKER_SOFT_LIMIT}. They are clustered.`);

  const items = useMemo(() => layoutMarkers(markers, duration, width), [markers, duration, width]);

  // Centre the tooltip on its marker, then pull it back inside the lane.
  useLayoutEffect(() => {
    const element = tip.current;
    if (!element || !hover) return;
    const centre = hover.kind === 'range' ? hover.x + hover.width / 2 : hover.x;
    element.style.left = `${clampBubble(centre, element.offsetWidth, width)}px`;
  }, [hover, width]);

  const select = (item: MarkerItem) => controller.goToMarker(item.markers[0]!);

  return (
    <div className={'pro-tl-lane'} aria-hidden="true">
      {items.map((item) => {
        const isSelected = selected !== null && item.markers.includes(selected);
        const common = {
          'data-selected': isSelected ? '' : undefined,
          onPointerDown: (event: ReactPointerEvent) => event.stopPropagation(),
          onPointerUp: (event: ReactPointerEvent) => event.stopPropagation(),
          onClick: () => select(item),
          onPointerEnter: () => setHover(item),
          onPointerLeave: () => setHover((current) => (current === item ? null : current)),
        };
        if (item.kind === 'range')
          return <span key={item.key} className={'pro-tl-marker pro-tl-marker-range'} style={{ left: item.x, width: item.width }} {...common} />;
        if (item.kind === 'cluster')
          return (
            <span key={item.key} className={'pro-tl-marker pro-tl-marker-cluster'} style={{ left: item.x }} {...common}>
              {item.markers.length}
            </span>
          );
        return <span key={item.key} className={'pro-tl-marker pro-tl-marker-point'} style={{ left: item.x }} {...common} />;
      })}
      {hover && (
        <span ref={tip} className={'pro-tl-tip'}>
          {hover.kind === 'cluster' ? t.markerCount(hover.markers.length) : hover.markers[0]!.label}
          <span className={'pro-tl-tip-time'}>
            {hover.kind === 'cluster'
              ? `${format(hover.markers[0]!.time)} – ${format(hover.markers[hover.markers.length - 1]!.time)}`
              : hover.kind === 'range'
                ? `${format(hover.markers[0]!.time)} – ${format(hover.markers[0]!.end ?? hover.markers[0]!.time)}`
                : format(hover.markers[0]!.time)}
          </span>
        </span>
      )}
    </div>
  );
});

/** How long after the last key press a handle move is announced, so a held key speaks once. */
const HANDLE_ANNOUNCE_MS = 400;

/**
 * An In or Out handle: a bracket on the band's outer side, and a real slider for the keyboard and assistive
 * technology. Dragging previews the move and commits on release, so `onInOutChange` fires once. With focus on it:
 * `←` `→` one frame, `Shift` ten, `Home` `End` its limits, `Delete` or `Backspace` clears the point.
 */
function RangeHandle({
  which,
  points,
  duration,
  fps,
  width,
  root,
  format,
  setDraft,
  onCleared,
  controller,
}: {
  which: 'in' | 'out';
  points: RangePoints;
  duration: number;
  fps: number;
  width: number;
  root: { current: HTMLElement | null };
  format: (time: number) => string;
  setDraft: (draft: RangePoints | null) => void;
  onCleared: () => void;
  controller: ReviewController;
}) {
  const store = useProStoreApi();
  const announce = useAnnounce();
  const element = useRef<HTMLDivElement>(null);
  const drag = useRef<{ base: RangePoints; left: number; time: number; rejected: boolean; swapped: boolean } | null>(null);
  const [dragTime, setDragTime] = useState<number | null>(null);
  const timer = useRef(0);

  const value = (which === 'in' ? points.in : points.out) ?? 0;
  const moved = which === 'in' ? t.inMoved : t.outMoved;

  const latest = useRef({ points, duration, fps, format, which });
  latest.current = { points, duration, fps, format, which };

  // A native listener, so these keys are handled (and marked handled) before the player's hotkeys see them.
  useEffect(() => {
    const node = element.current;
    if (!node) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      const now = latest.current;
      const state = store.getState();
      const range = { in: state.inPoint, out: state.outPoint };
      const target = handleKeyTarget(event.key, event.shiftKey, now.which, range, now.duration, now.fps);
      if (target === null) return;
      event.preventDefault();
      event.stopPropagation();
      if (target === 'clear') {
        onCleared();
        if (now.which === 'in') controller.clearIn();
        else controller.clearOut();
        return;
      }
      if (now.which === 'in') store.setIn(target);
      else store.setOut(target);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => announce((now.which === 'in' ? t.inMoved : t.outMoved)(latest.current.format(target))), HANDLE_ANNOUNCE_MS);
    };
    node.addEventListener('keydown', onKeyDown);
    return () => node.removeEventListener('keydown', onKeyDown);
  }, [store, controller, announce, onCleared]);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const end = (commit: boolean) => {
    const current = drag.current;
    drag.current = null;
    setDragTime(null);
    setDraft(null);
    if (!current || !commit) return;
    if (current.rejected) {
      announce(t.sameFrame, { toast: true });
      return;
    }
    if (which === 'in') store.setIn(current.time);
    else store.setOut(current.time);
    const after = store.getState();
    if (current.swapped && after.inPoint !== null && after.outPoint !== null) announce(t.swapped(format(after.inPoint), format(after.outPoint)), { toast: true });
    else announce(moved(format(current.time)));
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 && event.pointerType === 'mouse') return;
    // Stopped, so the seek slider under the handle does not start a seek.
    event.stopPropagation();
    event.preventDefault();
    const track = root.current;
    if (!track) return;
    const state = store.getState();
    drag.current = { base: { in: state.inPoint, out: state.outPoint }, left: track.getBoundingClientRect().left, time: value, rejected: false, swapped: false };
    event.currentTarget.setPointerCapture(event.pointerId);
    event.currentTarget.focus({ preventScroll: true });
    setDragTime(value);
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const current = drag.current;
    if (!current) return;
    event.stopPropagation();
    const time = handleTimeFromX(event.clientX - current.left, width, duration, fps);
    const move = resolveHandleMove(which, time, current.base, duration, fps);
    current.time = time;
    current.rejected = move.rejected;
    current.swapped = move.swapped;
    setDragTime(time);
    if (!move.rejected) setDraft({ in: move.in, out: move.out });
  };

  const bubbleX = dragTime === null ? 0 : clampBubble(timeToX(dragTime, duration, width), 92, width);

  return (
    <>
      <div
        ref={element}
        className={'pro-tl-handle'}
        data-handle={which}
        data-dragging={dragTime !== null ? '' : undefined}
        role="slider"
        tabIndex={0}
        aria-label={which === 'in' ? t.inPoint : t.outPoint}
        aria-orientation="horizontal"
        aria-valuemin={0}
        aria-valuemax={Number(duration.toFixed(3))}
        aria-valuenow={Number(value.toFixed(3))}
        aria-valuetext={format(value)}
        style={{ left: `${timeToPercent(value, duration)}%` }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={(event) => {
          if (!drag.current) return;
          event.stopPropagation();
          end(true);
        }}
        onPointerCancel={() => end(false)}
        onLostPointerCapture={() => end(false)}
      />
      {dragTime !== null && (
        <span className={'pro-tl-bubble pro-tl-bubble-handle'} style={{ left: bubbleX }} aria-hidden="true">
          {format(dragTime)}
        </span>
      )}
    </>
  );
}
