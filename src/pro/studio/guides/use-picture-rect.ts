import { useEffect, useState, type RefObject } from 'react';

import { pictureRect, sameRect, toFitMode, type Rect } from './geometry';

/** The scale of an element's own CSS transform (1 when it has none). */
function transformScale(element: HTMLElement): number {
  const value = getComputedStyle(element).transform;
  if (!value || value === 'none') return 1;
  const scale = new DOMMatrixReadOnly(value).a;
  return scale > 0 ? scale : 1;
}

const VARIABLES = ['--pro-picture-x', '--pro-picture-y', '--pro-picture-w', '--pro-picture-h'] as const;

/**
 * Where the picture is: the rectangle the video's pixels occupy inside the stage, in CSS pixels relative to the
 * overlay layer's parent (the stage in the dock layout, the player otherwise).
 *
 * It is written to the player container as `--pro-picture-x`, `--pro-picture-y`, `--pro-picture-w` and
 * `--pro-picture-h`, which size the overlay layer, so every guide is drawn in the picture's own coordinates and never
 * on the letterbox bars. It is also returned, with the overlay element, for whatever draws there.
 *
 * Recomputed when the video element or the stage changes size (a `ResizeObserver`: this covers window resizes,
 * fullscreen, a density change and the dock changing height), on the media's `loadedmetadata` and `resize` (a new
 * source, or a rendition with another shape), and on `fullscreenchange`. Before metadata there is no rectangle, and
 * nothing is drawn. Edges are rounded to device pixels so 1 px guide lines stay crisp.
 */
export function usePictureRect(video: HTMLVideoElement | null, anchor: RefObject<HTMLElement | null>): { rect: Rect | null; layer: HTMLElement | null } {
  const [rect, setRect] = useState<Rect | null>(null);
  const [layer, setLayer] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const container = anchor.current?.closest<HTMLElement>('.media-container') ?? null;
    const overlay = container?.querySelector<HTMLElement>('.pro-overlay') ?? null;
    const parent = overlay?.parentElement ?? null;
    setLayer(overlay);
    if (!container || !overlay || !parent || !video) {
      setRect(null);
      return;
    }

    let last: Rect | null = null;
    const update = () => {
      const box = video.getBoundingClientRect();
      const origin = parent.getBoundingClientRect();
      // While zoomed the parent (the picture wrapper) is scaled, and both boxes with it. The rectangle describes the
      // unzoomed picture, so the measurements are taken back to the wrapper's own, unscaled pixels.
      const k = 1 / transformScale(parent);
      const fit = toFitMode(getComputedStyle(video).objectFit);
      const inside = pictureRect(box.width * k, box.height * k, video.videoWidth, video.videoHeight, fit);
      let next: Rect | null = null;
      if (inside) {
        const ratio = Math.max(1, window.devicePixelRatio || 1);
        const snap = (value: number) => Math.round(value * ratio) / ratio;
        const x = snap((box.left - origin.left) * k + inside.x);
        const y = snap((box.top - origin.top) * k + inside.y);
        next = { x, y, width: snap(inside.width), height: snap(inside.height) };
      }
      if (sameRect(next, last)) return;
      last = next;
      if (next) {
        container.style.setProperty('--pro-picture-x', `${next.x}px`);
        container.style.setProperty('--pro-picture-y', `${next.y}px`);
        container.style.setProperty('--pro-picture-w', `${next.width}px`);
        container.style.setProperty('--pro-picture-h', `${next.height}px`);
      } else {
        for (const name of VARIABLES) container.style.removeProperty(name);
      }
      setRect(next);
    };

    update();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update);
    observer?.observe(video);
    observer?.observe(parent);
    const mediaEvents = ['loadedmetadata', 'resize', 'emptied'] as const;
    for (const name of mediaEvents) video.addEventListener(name, update);
    document.addEventListener('fullscreenchange', update);
    window.addEventListener('resize', update);

    return () => {
      observer?.disconnect();
      for (const name of mediaEvents) video.removeEventListener(name, update);
      document.removeEventListener('fullscreenchange', update);
      window.removeEventListener('resize', update);
      for (const name of VARIABLES) container.style.removeProperty(name);
    };
  }, [video, anchor]);

  return { rect, layer };
}
