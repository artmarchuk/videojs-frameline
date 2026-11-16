/** @jsxImportSource react */

import './timeline.css';
import { Slider as SliderPrimitive, Thumbnail, TimeSlider } from '@videojs/react';
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
import { passSpaceToPlayer } from '../../../video/shared/slider-space';
import type { Marker } from '../../store';
import { secondsFromFrames } from '../../timecode';
import { useAnnounce } from '../announcer';
import type { StudioController } from '../controller';
import { JUMP_FRAMES } from '../logic';
import { studioStrings as t } from '../strings';
import {
  buildLabels,
  buildTicks,
  chooseTicks,
  clampBubble,
  handleBox,
  handleDragTime,
  handleKeyTarget,
  handleValue,
  isSnapped,
  layoutMarkers,
  MARKER_SOFT_LIMIT,
  rangeBand,
  resolveHandleMove,
  snapFrame,
  snapSeekTime,
  timeToX,
  type MarkerPin,
  type RangePoints,
} from './logic';

export interface TimelineProps {
  controller: StudioController;
  fps: number;
  /** Markers to draw; pass an empty list when the `markers` feature is off. */
  markers: readonly Marker[];
  /** Draw the In/Out band and the two handles. */
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
 * Frame snapping. In the Studio tier every seek, whatever started it (the timeline, a slider key, `J`,
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
 * The Studio timeline: "a slider that looks like a ruler", about 46 px tall. It is the Video.js `TimeSlider` (root,
 * track, buffer, thumb, preview, chapters), so slider semantics, pointer capture and media state stay Video.js's job.
 * Around it: a tick ruler with the marker pins on it, the In/Out band, and the two range handles, which are always
 * at the ends of the track until they are moved. There is no permanent time bubble: the current timecode is in the
 * main row, and a bubble appears only while the pointer hovers the timeline or drags something. Time always runs
 * left to right, also on right-to-left pages.
 */
export function Timeline({ controller, fps, markers, range, video, renderThumbnail }: TimelineProps) {
  const duration = useProStore((state) => state.duration);
  const seconds = useProStore((state) => state.timeDisplay === 'seconds');
  const storeIn = useProStore((state) => state.inPoint);
  const storeOut = useProStore((state) => state.outPoint);

  const root = useRef<HTMLDivElement>(null);
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
  // A cleared band keeps its last place while it fades out; the styles hide it (`data-range="none"`).
  const lastBand = useRef(band);
  if (band) lastBand.current = band;
  const drawn = band ?? lastBand.current;

  const style = {
    '--fl-band-start': drawn ? `${drawn.start}%` : undefined,
    '--fl-band-end': drawn ? `${drawn.end}%` : undefined,
  } as CSSProperties;

  /**
   * Keys on the focused seek slider. One rule with the global map: `←` `→` step a frame while paused and seek 5 s
   * while playing, `Shift` jumps 10 frames. `↑` `↓` do the same as `→` `←`, as on any slider. `Home`, `End`,
   * `PageUp` and `PageDown` stay with Video.js; the frame snap above rounds where they land.
   */
  const onThumbKey = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>, stock?: (event: ReactKeyboardEvent<HTMLDivElement>) => void) => {
      // `Space` plays and pauses, as everywhere in the player (the hotkeys alone leave it to a focused slider).
      if (passSpaceToPlayer(event)) return;
      const forward = event.key === 'ArrowRight' || event.key === 'ArrowUp';
      const back = event.key === 'ArrowLeft' || event.key === 'ArrowDown';
      // Shift+Alt + an arrow pans the zoomed picture: it is left for the player's hotkeys, and the slider does not move.
      if ((forward || back) && event.altKey && event.shiftKey && !event.ctrlKey && !event.metaKey) return;
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

  const handleProps = { points, duration, fps, width, root, format, setDraft, controller, markers, renderThumbnail };

  return (
    <div className={'pro-timeline'} dir="ltr" style={style} data-range={band ? 'set' : 'none'} data-handles={range ? '' : undefined} data-display={seconds ? 'seconds' : 'timecode'} data-interactive="">
      <TimeSlider.Root ref={root} className={'pro-tl'} label={t.seek}>
        <Ruler duration={duration} width={width} fps={fps} />
        {markers.length > 0 && <MarkerPins markers={markers} duration={duration} width={width} format={format} controller={controller} />}

        <TimeSlider.Chapters
          className={'pro-tl-chapters'}
          renderChapter={(props) => (
            <div className={'pro-tl-chapter'} {...props}>
              <TimeSlider.Track className={'pro-tl-track'}>
                <span className={'pro-tl-band'} />
                <span className={'pro-tl-band-played'} />
              </TimeSlider.Track>
            </div>
          )}
        />
        <TimeSlider.Buffer className={'pro-tl-buffer'} />
        <span className={'pro-tl-hairline'} aria-hidden="true" />

        <TimeSlider.Thumb
          className={'pro-tl-playhead'}
          render={(props, state) => (
            <div {...props} aria-valuetext={format(state.value)} onKeyDownCapture={(event) => onThumbKey(event, props.onKeyDownCapture as never)} />
          )}
        />

        {range && <RangeHandle which="in" {...handleProps} />}
        {range && <RangeHandle which="out" {...handleProps} />}

        <TimeSlider.Preview className={'pro-tl-preview'} overflow="clamp">
          <SliderPrimitive.Thumbnail.Root className={'media-slider-thumbnail'}>
            <SliderPrimitive.Thumbnail.Image render={renderThumbnail} className={'media-slider-thumbnail-image'} />
          </SliderPrimitive.Thumbnail.Root>
          <div className={'pro-tl-bubble'}>
            <TimeSlider.Value className={'pro-tl-bubble-value'} type="pointer" format={format} />
            <TimeSlider.ChapterTitle className={'pro-tl-bubble-chapter'} />
          </div>
        </TimeSlider.Preview>
      </TimeSlider.Root>
    </div>
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
      minor: { colour: colour('--fl-tick-minor', '#565656'), height: 0.2 },
      mid: { colour: colour('--fl-tick-mid', '#787878'), height: 0.4 },
      major: { colour: colour('--fl-tick-major', '#8f8f8f'), height: 1 },
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
 * The marker pins: one small flag per marker on the ruler, with a line to the end time when the marker has one.
 * One visual and no clusters; pins that are close together overlap, later ones on top. The pins are for the pointer
 * only: no tab stops, hidden from assistive technology. Keyboard and screen-reader users reach the same markers
 * through `[` `]` and the Markers menu. The skin only shows the host's markers; it never creates or stores them.
 */
const MarkerPins = memo(function MarkerPins({
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
  controller: StudioController;
}) {
  const selected = useProStore((state) => state.selectedMarker);
  const [hover, setHover] = useState<MarkerPin | null>(null);
  const tip = useRef<HTMLSpanElement>(null);
  // Set when a press landed on the playhead through a pin: that press belongs to the playhead (seek and drag), not the pin.
  const playheadPress = useRef(false);

  if (markers.length > MARKER_SOFT_LIMIT) warnOnce(`${markers.length} markers passed; the timeline is designed for up to ${MARKER_SOFT_LIMIT}.`);

  const pins = useMemo(() => layoutMarkers(markers, duration, width), [markers, duration, width]);

  // Centre the tooltip on its pin, then pull it back inside the timeline.
  useLayoutEffect(() => {
    const element = tip.current;
    if (!element || !hover) return;
    element.style.left = `${clampBubble(hover.x, element.offsetWidth, width)}px`;
  }, [hover, width]);

  return (
    <div className={'pro-tl-pins'} aria-hidden="true">
      {pins.map((pin) => pin.endX !== null && <span key={`e-${pin.key}`} className={'pro-tl-span'} data-selected={pin.marker === selected ? '' : undefined} style={{ left: pin.x, width: pin.endX - pin.x }} />)}
      {pins.map((pin) => (
        <span
          key={pin.key}
          className={'pro-tl-pin'}
          style={{ left: pin.x }}
          data-selected={pin.marker === selected ? '' : undefined}
          // Stopped, so the seek slider under the pin does not also seek to the pointer's own position. Except when
          // the playhead is under the pointer: the playhead has priority, and the press goes on to the slider so it
          // can be grabbed and dragged from a marker.
          onPointerDown={(event: ReactPointerEvent) => {
            const playhead = event.currentTarget.closest('.pro-tl')?.querySelector('.pro-tl-playhead')?.getBoundingClientRect();
            playheadPress.current = playhead !== undefined && Math.abs(event.clientX - (playhead.left + playhead.width / 2)) <= PLAYHEAD_GRAB_PX;
            if (!playheadPress.current) event.stopPropagation();
          }}
          onPointerUp={(event: ReactPointerEvent) => {
            if (!playheadPress.current) event.stopPropagation();
          }}
          onClick={() => {
            if (playheadPress.current) playheadPress.current = false;
            else controller.goToMarker(pin.marker);
          }}
          onPointerEnter={() => setHover(pin)}
          onPointerLeave={() => setHover((current) => (current === pin ? null : current))}
        />
      ))}
      {hover && (
        <span ref={tip} className={'pro-tl-tip'}>
          {hover.marker.label}
          <span className={'pro-tl-tip-time'}>
            {hover.endX !== null ? `${format(hover.marker.time)} – ${format(hover.marker.end ?? hover.marker.time)}` : format(hover.marker.time)}
          </span>
        </span>
      )}
    </div>
  );
});

/** True on touch-first devices, where the handles' targets are 44 px wide instead of 24. */
function useCoarsePointer(): boolean {
  const [coarse, setCoarse] = useState(() => typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches);
  useEffect(() => {
    if (typeof matchMedia !== 'function') return;
    const query = matchMedia('(pointer: coarse)');
    const update = () => setCoarse(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  return coarse;
}

/**
 * How far the player's box reaches past the track on each side: the timeline's gutter plus the dock's side padding.
 * A handle's target may use that room, and not more: past the player's edge the page would get the touch.
 */
function useRoom(track: { current: HTMLElement | null }, width: number): { left: number; right: number } {
  const [room, setRoom] = useState({ left: 0, right: 0 });
  // A passive effect, not a layout effect: the slider's ref is a composed one, which is not attached yet while a
  // child's layout effects run.
  useEffect(() => {
    const element = track.current;
    const player = element?.closest<HTMLElement>('.pro-skin');
    if (!element || !player) return;
    const a = element.getBoundingClientRect();
    const b = player.getBoundingClientRect();
    const next = { left: Math.max(0, Math.round(a.left - b.left)), right: Math.max(0, Math.round(b.right - a.right)) };
    setRoom((current) => (current.left === next.left && current.right === next.right ? current : next));
  }, [track, width]);
  return room;
}

/** How far from the playhead's centre a press still grabs the playhead rather than a marker pin, in pixels. */
const PLAYHEAD_GRAB_PX = 10;

/** How long after the last key press a handle move is announced, so a held key speaks once. */
const HANDLE_ANNOUNCE_MS = 400;

/**
 * An In or Out handle: a tab at its end of the range, and a real slider for the keyboard and assistive technology.
 * It is always there. While its point is not set it rests at its own end of the track, in a neutral colour; moved
 * anywhere else it sets the point and takes the accent. Dragging previews the move and commits on release, so
 * `onInOutChange` fires once; the drag snaps to frames, and magnetically to the playhead and to markers. Dragging it
 * back to its end, a double click, `Delete` or `Backspace` unsets the point. With focus on it: `←` `→` one frame,
 * `Shift` ten, `Home` `End` its limits.
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
  controller,
  markers,
  renderThumbnail,
}: {
  which: 'in' | 'out';
  points: RangePoints;
  duration: number;
  fps: number;
  width: number;
  root: { current: HTMLElement | null };
  format: (time: number) => string;
  setDraft: (draft: RangePoints | null) => void;
  controller: StudioController;
  markers: readonly Marker[];
  renderThumbnail?: TimelineProps['renderThumbnail'];
}) {
  const store = useProStoreApi();
  const announce = useAnnounce();
  const element = useRef<HTMLDivElement>(null);
  const drag = useRef<{ base: RangePoints; left: number; offset: number; time: number; moved: boolean; magnets: number[] } | null>(null);
  const [dragTime, setDragTime] = useState<number | null>(null);
  const timer = useRef(0);

  const set = (which === 'in' ? points.in : points.out) !== null;
  const value = handleValue(which, points, duration);

  const latest = useRef({ duration, fps, format, which });
  latest.current = { duration, fps, format, which };

  const clear = useCallback(() => {
    if (which === 'in') controller.clearIn();
    else controller.clearOut();
  }, [controller, which]);

  // A native listener, so these keys are handled (and marked handled) before the player's hotkeys see them.
  useEffect(() => {
    const node = element.current;
    if (!node) return;
    const onKeyDown = (event: KeyboardEvent) => {
      delete node.dataset.pointer;
      if (passSpaceToPlayer(event)) return;
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      const now = latest.current;
      const state = store.getState();
      const target = handleKeyTarget(event.key, event.shiftKey, now.which, { in: state.inPoint, out: state.outPoint }, now.duration, now.fps);
      if (target === null) return;
      event.preventDefault();
      event.stopPropagation();
      window.clearTimeout(timer.current);
      if (target === 'clear') {
        clear();
        return;
      }
      if (now.which === 'in') store.setIn(target);
      else store.setOut(target);
      timer.current = window.setTimeout(() => announce((now.which === 'in' ? t.inMoved : t.outMoved)(latest.current.format(target))), HANDLE_ANNOUNCE_MS);
    };
    // The pointer mark hides the focus ring after a press; it must not outlive the press: clear it when focus leaves.
    const onBlur = () => {
      delete node.dataset.pointer;
    };
    node.addEventListener('keydown', onKeyDown);
    node.addEventListener('blur', onBlur);
    return () => {
      node.removeEventListener('keydown', onKeyDown);
      node.removeEventListener('blur', onBlur);
    };
  }, [store, announce, clear]);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const end = (commit: boolean) => {
    const current = drag.current;
    drag.current = null;
    setDragTime(null);
    setDraft(null);
    if (!current || !commit || !current.moved) return;

    const move = resolveHandleMove(which, current.time, current.base, duration, fps);
    if (move.rejected) {
      announce(t.sameFrame, { toast: true });
      return;
    }
    if (move.unset) {
      clear();
      return;
    }
    const wasSet = (which === 'in' ? current.base.in : current.base.out) !== null;
    if (which === 'in') store.setIn(current.time);
    else store.setOut(current.time);
    const after = store.getState();
    if (move.swapped && after.inPoint !== null && after.outPoint !== null) announce(t.swapped(format(after.inPoint), format(after.outPoint)), { toast: true });
    else announce((which === 'in' ? (wasSet ? t.inMoved : t.inSet) : wasSet ? t.outMoved : t.outSet)(format(current.time)));
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 && event.pointerType === 'mouse') return;
    // Stopped, so the seek slider under the handle does not start a seek.
    event.stopPropagation();
    event.preventDefault();
    const track = root.current;
    if (!track) return;
    const state = store.getState();
    const left = track.getBoundingClientRect().left;
    drag.current = {
      base: { in: state.inPoint, out: state.outPoint },
      left,
      // Where on the handle it was grabbed: the drag moves the ANCHOR edge, so the handle does not jump to the pointer.
      offset: event.clientX - left - timeToX(value, duration, width),
      time: value,
      moved: false,
      // The handle is pulled onto the playhead and onto markers when it comes within a few pixels of them.
      magnets: [secondsFromFrames(controller.currentFrame(), fps), ...markers.map((marker) => marker.time)],
    };
    // The focus ring is for the keyboard: a press with the pointer does not show it (see `data-pointer`).
    event.currentTarget.dataset.pointer = '';
    event.currentTarget.setPointerCapture(event.pointerId);
    event.currentTarget.focus({ preventScroll: true });
    setDragTime(value);
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const current = drag.current;
    if (!current) return;
    // Not stopped: the slider keeps tracking the pointer for its hover preview (hidden during the drag), so when the
    // handle is released the hover preview is already where the pointer is, not where the drag started.
    const time = handleDragTime(event.clientX - current.left - current.offset, width, duration, fps, current.magnets);
    if (time === current.time) return;
    const move = resolveHandleMove(which, time, current.base, duration, fps);
    current.time = time;
    current.moved = true;
    setDragTime(time);
    if (!move.rejected) setDraft({ in: move.in, out: move.out });
  };

  const coarse = useCoarsePointer();
  const room = useRoom(root, width);
  const otherValue = handleValue(which === 'in' ? 'out' : 'in', points, duration);
  const box = handleBox(which, value, duration, width, {
    hit: coarse ? 44 : 24,
    room,
    otherX: timeToX(otherValue, duration, width),
  });
  // Centre the drag preview on the anchor, then pull it back inside the timeline (its width changes with the image).
  const preview = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const element = preview.current;
    if (!element || dragTime === null) return;
    element.style.left = `${clampBubble(timeToX(dragTime, duration, width), element.offsetWidth, width)}px`;
  });

  return (
    <>
      <div
        ref={element}
        className={'pro-tl-handle'}
        data-handle={which}
        data-set={set ? '' : undefined}
        data-dragging={dragTime !== null ? '' : undefined}
        role="slider"
        tabIndex={0}
        aria-label={which === 'in' ? t.inPoint : t.outPoint}
        aria-orientation="horizontal"
        aria-valuemin={0}
        aria-valuemax={Number(duration.toFixed(3))}
        aria-valuenow={Number(value.toFixed(3))}
        aria-valuetext={set ? format(value) : which === 'in' ? t.startOfVideo : t.endOfVideo}
        style={{ left: box.hitLeft, width: box.hitRight - box.hitLeft, '--tab-left': `${box.tabLeft - box.hitLeft}px` } as CSSProperties}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={(event) => {
          if (!drag.current) return;
          event.stopPropagation();
          end(true);
        }}
        onPointerCancel={() => end(false)}
        onLostPointerCapture={() => end(false)}
        onDoubleClick={clear}
      />
      {dragTime !== null && (
        // The same preview as a playhead drag: the frame at the handle's point and its timecode, over the anchor.
        <div ref={preview} className={'pro-tl-drag-preview'} aria-hidden="true">
          <Thumbnail.Root time={dragTime} className={'media-slider-thumbnail'}>
            <Thumbnail.Image render={renderThumbnail} className={'media-slider-thumbnail-image'} />
          </Thumbnail.Root>
          <span className={'pro-tl-bubble'}>{format(dragTime)}</span>
        </div>
      )}
    </>
  );
}
