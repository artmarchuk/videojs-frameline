/** @jsxImportSource react */

import { Menu } from '@videojs/react';
import { useEffect, useId, useMemo, useRef, type RefObject } from 'react';

import { cn } from '../../lib/resolve-class-name';

import { Button } from '../../video/shared/button';
import { ButtonTooltip } from '../../video/shared/tooltip';

import { useProStore, useProStoreApi } from '../context';
import type { ProStore } from '../store';
import { panCentre, PAN_STEP, PICTURE_CENTRE, sourceWidth, ZOOM_LEVELS, zoomTransform, type Box, type Centre, type RenditionSize, type FramelineZoomLevel } from '../zoom';
import { useAnnounce } from './announcer';
import { studioStrings as t } from './strings';

/** A drag has to pass this many pixels before it pans; below it, the press is still a click on the picture. */
const DRAG_THRESHOLD = 3;

export type PanDirection = 'left' | 'right' | 'up' | 'down';

export interface ZoomController {
  /** `Shift+Alt` + an arrow: move the view by a tenth of what is visible. Does nothing at Fit, and stops at the edges. */
  pan(direction: PanDirection): void;
}

/**
 * Applies the zoom to the picture wrapper (`.pro-picture`, the overlay layer's parent, which holds the media and the
 * guides) as one `translate` + `scale`, so the guides follow the picture with nothing re-measured, and the stage
 * around it clips the rest. `rect` is the unzoomed picture inside the wrapper, from `usePictureRect`.
 *
 * 100% is measured against the source: the largest rendition in `renditions` (Video.js's `videoRenditionList`), or
 * the decoded size when there is no list. A switch of rendition therefore changes neither the scale nor the pan.
 *
 * The transform is recomputed when the level, the picture rectangle or the rendition list changes, when the stage
 * changes size, on the media's `loadedmetadata` and `resize`, on `fullscreenchange` and on a window resize (which is
 * also how a change of the device pixel ratio arrives).
 *
 * While zoomed, a drag on the picture pans it (mouse, pen, or one finger). A drag that passed the threshold is kept
 * away from the player's tap gestures, so it neither plays or pauses nor counts toward a double click.
 */
export function useZoom(
  video: HTMLVideoElement | null,
  rect: Box | null,
  layer: HTMLElement | null,
  enabled: boolean,
  renditions: readonly RenditionSize[] | null = null
): ZoomController {
  const level = useProStore((state) => state.zoom);
  const centre = useRef<Centre>(PICTURE_CENTRE);
  const apply = useRef<() => number | null>(() => null);
  const picture = useRef<Box | null>(rect);
  picture.current = rect;
  // The widest rendition on offer, as one number, so a new list object with the same sizes changes nothing.
  const offered = sourceWidth(renditions, 0);
  const list = useRef(renditions);
  list.current = renditions;

  const parent = layer?.parentElement ?? null;
  const wrapper = enabled && parent?.classList.contains('pro-picture') ? parent : null;

  // Entering a level starts from the middle of the picture.
  useEffect(() => {
    centre.current = PICTURE_CENTRE;
  }, [level]);

  useEffect(() => {
    const stage = wrapper?.parentElement ?? null;
    if (!wrapper || !stage || !video) return;

    const clear = () => {
      wrapper.style.removeProperty('transform');
      wrapper.style.removeProperty('--fl-zoom-scale');
      delete wrapper.dataset.pannable;
    };

    /** Writes the transform; returns the scale, or `null` when there is none. */
    const update = () => {
      const box = picture.current;
      if (level === 'fit' || !box) {
        clear();
        return null;
      }
      const bounds = stage.getBoundingClientRect();
      const next = zoomTransform({
        level,
        picture: box,
        stage: { width: bounds.width, height: bounds.height },
        sourceWidth: sourceWidth(list.current, video.videoWidth, video.videoHeight),
        devicePixelRatio: window.devicePixelRatio || 1,
        centre: centre.current,
        origin: { x: bounds.left, y: bounds.top },
      });
      if (next.scale === null) {
        clear();
        return null;
      }
      centre.current = next.centre;
      wrapper.style.transform = `translate(${next.x}px, ${next.y}px) scale(${next.scale})`;
      // Lets the guides keep their line width and label size while the picture under them is scaled.
      wrapper.style.setProperty('--fl-zoom-scale', String(next.scale));
      if (next.pannable) wrapper.dataset.pannable = '';
      else delete wrapper.dataset.pannable;
      return next.scale;
    };

    apply.current = update;
    update();
    if (level === 'fit') {
      return () => {
        apply.current = () => null;
      };
    }

    const refresh = () => void update();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(refresh);
    observer?.observe(stage);
    const mediaEvents = ['loadedmetadata', 'resize', 'emptied'] as const;
    for (const name of mediaEvents) video.addEventListener(name, refresh);
    document.addEventListener('fullscreenchange', refresh);
    window.addEventListener('resize', refresh);

    // Pan by dragging.
    let drag: { id: number; x: number; y: number; from: Centre; moved: boolean } | null = null;

    const onDown = (event: PointerEvent) => {
      if (!event.isPrimary || event.button !== 0 || !('pannable' in wrapper.dataset)) return;
      drag = { id: event.pointerId, x: event.clientX, y: event.clientY, from: centre.current, moved: false };
    };

    const onMove = (event: PointerEvent) => {
      if (!drag || event.pointerId !== drag.id) return;
      const dx = event.clientX - drag.x;
      const dy = event.clientY - drag.y;
      if (!drag.moved) {
        if (Math.hypot(dx, dy) <= DRAG_THRESHOLD) return;
        drag.moved = true;
        wrapper.dataset.panning = '';
        try {
          wrapper.setPointerCapture(drag.id);
        } catch {
          // The pointer is gone already; the drag ends with the next event.
        }
      }
      const box = picture.current;
      const scale = new DOMMatrixReadOnly(getComputedStyle(wrapper).transform).a;
      if (!box || !(scale > 0)) return;
      // The picture follows the pointer, so the view moves the other way.
      centre.current = panCentre(drag.from, -dx, -dy, scale, box);
      update();
    };

    const swallowClick = (event: Event) => {
      event.stopPropagation();
      event.preventDefault();
    };

    const onEnd = (event: PointerEvent) => {
      if (!drag || event.pointerId !== drag.id) return;
      const moved = drag.moved;
      drag = null;
      delete wrapper.dataset.panning;
      if (!moved) return;
      // A pan is not a tap: the player's gestures (click to play, double click for fullscreen) listen for this event
      // on the container and never see it. The click that follows a drag is dropped the same way.
      event.stopPropagation();
      wrapper.addEventListener('click', swallowClick, { capture: true, once: true });
      window.setTimeout(() => wrapper.removeEventListener('click', swallowClick, { capture: true }), 0);
      // The container did not see the press end, so it did not take focus; the hotkeys need focus inside the player.
      const active = document.activeElement;
      if (!active || active === document.body) wrapper.closest<HTMLElement>('.media-container')?.focus({ preventScroll: true });
    };

    wrapper.addEventListener('pointerdown', onDown);
    wrapper.addEventListener('pointermove', onMove);
    wrapper.addEventListener('pointerup', onEnd);
    wrapper.addEventListener('pointercancel', onEnd);

    return () => {
      observer?.disconnect();
      for (const name of mediaEvents) video.removeEventListener(name, refresh);
      document.removeEventListener('fullscreenchange', refresh);
      window.removeEventListener('resize', refresh);
      wrapper.removeEventListener('pointerdown', onDown);
      wrapper.removeEventListener('pointermove', onMove);
      wrapper.removeEventListener('pointerup', onEnd);
      wrapper.removeEventListener('pointercancel', onEnd);
      delete wrapper.dataset.panning;
      apply.current = () => null;
      clear();
    };
    // `rect` and the rendition list are read through refs but listed, so a change of either recomputes the transform.
  }, [wrapper, video, level, rect, offered]);

  return useMemo(
    () => ({
      pan(direction) {
        const box = picture.current;
        const stage = wrapper?.parentElement;
        const scale = apply.current();
        if (!box || !stage || scale === null) return;
        const bounds = stage.getBoundingClientRect();
        const dx = direction === 'left' ? -1 : direction === 'right' ? 1 : 0;
        const dy = direction === 'up' ? -1 : direction === 'down' ? 1 : 0;
        centre.current = panCentre(centre.current, dx * PAN_STEP * bounds.width, dy * PAN_STEP * bounds.height, scale, box);
        apply.current();
      },
    }),
    [wrapper]
  );
}

/* ---------- Actions and the menu group ---------- */

type Announce = ReturnType<typeof useAnnounce>;

/** "Zoom 100%", "Zoom fit"; with the rendition note while a lower rendition than the best one is playing. */
export function zoomMessage(level: FramelineZoomLevel, note: string | null): string {
  const message = t.zoomSet(t.zoomNames[level]);
  return level !== 'fit' && note ? `${message} · ${note}` : message;
}

export function createZoomActions(store: ProStore, announce: Announce, note: RefObject<string | null>) {
  const say = () => {
    const level = store.getState().zoom;
    // Also shown for a moment: with `Z` there is no menu on screen to show the level.
    announce(zoomMessage(level, note.current), { toast: true });
  };
  return {
    set(level: FramelineZoomLevel) {
      if (store.getState().zoom === level) return;
      store.setZoom(level);
      say();
    },
    cycle(direction: 1 | -1 = 1) {
      store.cycleZoom(direction);
      say();
    },
  };
}

export type ZoomActions = ReturnType<typeof createZoomActions>;

/** `note`: what to add while zoomed, for example "showing 540p", or `null`. */
export function useZoomActions(note: string | null): ZoomActions {
  const store = useProStoreApi();
  const announce = useAnnounce();
  const latest = useRef(note);
  latest.current = note;
  return useMemo(() => createZoomActions(store, announce, latest), [store, announce]);
}

/**
 * The Zoom button and its menu. The button shows the level as text ("Fit", "150%") at a fixed width; zoomed, it takes
 * the "on" fill. The menu is a radio group, one level at a time, with one line of help under it. While zoomed, the
 * chosen item also says when a lower rendition than the best one is playing, because a 100% check of a 540p rendition
 * is not a check of the source.
 */
export function ZoomMenu({ actions, note }: { actions: ZoomActions; note: string | null }) {
  const level = useProStore((state) => state.zoom);
  const name = t.zoomNames[level] ?? level;
  const noteId = useId();

  return (
    <Menu.Root side="top" align="end">
      <ButtonTooltip
        label={
          <>
            <span>{t.zoom}</span>
            <kbd className={'pro-kbd'}>Z</kbd>
          </>
        }
      >
        <Menu.Trigger
          render={<Button />}
          className={'pro-tool pro-tool-zoom'}
          aria-label={t.zoomLabel(name)}
          aria-keyshortcuts="Z"
          data-pressed={level === 'fit' ? undefined : ''}
          data-pro-menu="zoom"
        >
          <span className={'pro-tool-label'}>{name}</span>
        </Menu.Trigger>
      </ButtonTooltip>
      <Menu.Popup keepMounted className={cn('media-popup', 'media-menu-popup', 'pro-menu-popup', 'pro-zoom-popup')}>
        <Menu.Content className={'media-menu-content'} aria-describedby={noteId}>
          {/* The note goes above the options, so the pointer never crosses it on the way from the button (the menu
              opens above it). Same place when a menu opens downwards. */}
          <div className={'pro-menu-head'}>
            <p id={noteId} className={'pro-menu-note'}>
              {t.zoomNote}
            </p>
            <Menu.Separator className={'pro-menu-separator'} />
          </div>
          <Menu.RadioGroup className={'pro-menu-group'} aria-label={t.zoom} value={level} onValueChange={(value) => actions.set(value as FramelineZoomLevel)}>
            {ZOOM_LEVELS.map((value) => (
              <Menu.RadioItem key={value} className={'media-menu-item'} value={value} data-zoom-item={value}>
                <span className={'pro-menu-mark'} aria-hidden="true">
                  {value === level && <span className={'pro-menu-dot'} />}
                </span>
                <span>{t.zoomNames[value]}</span>
                {value === level && value !== 'fit' && note && <span className={'pro-menu-sub'}>{note}</span>}
              </Menu.RadioItem>
            ))}
          </Menu.RadioGroup>
        </Menu.Content>
      </Menu.Popup>
    </Menu.Root>
  );
}
