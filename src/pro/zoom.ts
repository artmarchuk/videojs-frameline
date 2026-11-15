/**
 * Zoom: how closely the picture is looked at. Pure: no React, no DOM.
 *
 * Zoom never changes the picture, only its size on screen: Fit (the whole picture in the stage), 100% (one video
 * pixel on one device pixel) and its multiples 150%, 200% and 400%. While zoomed the picture can be panned; the pan is kept as the point of the
 * picture that sits in the middle of the stage, so it survives a resize or a rendition of another size.
 */

export const ZOOM_LEVELS = ['fit', '100', '150', '200', '400'] as const;

export type ZoomLevel = (typeof ZOOM_LEVELS)[number];

export const isZoomLevel = (value: unknown): value is ZoomLevel => typeof value === 'string' && (ZOOM_LEVELS as readonly string[]).includes(value);

/** `Z` walks Fit, 100%, 150%, 200%, 400% and back to Fit. */
export function nextZoom(level: ZoomLevel): ZoomLevel {
  return ZOOM_LEVELS[(ZOOM_LEVELS.indexOf(level) + 1) % ZOOM_LEVELS.length]!;
}

/** `Shift+Z` walks the other way: from Fit to 400%, then down. */
export function previousZoom(level: ZoomLevel): ZoomLevel {
  return ZOOM_LEVELS[(ZOOM_LEVELS.indexOf(level) + ZOOM_LEVELS.length - 1) % ZOOM_LEVELS.length]!;
}

/** From this multiple of 100% up a video pixel covers four device pixels or more, and is drawn as a square. */
export const PIXELATED_FROM = 2;

export const isPixelated = (level: ZoomLevel): boolean => FACTOR[level] >= PIXELATED_FROM;

/** Device pixels drawn for one video pixel, along one side: every level is a multiple of 100%. Fit has none. */
const FACTOR: Record<ZoomLevel, number> = { fit: 0, '100': 1, '150': 1.5, '200': 2, '400': 4 };

/** One arrow press with Alt moves the view by this share of what is visible. */
export const PAN_STEP = 0.1;

/**
 * The scale to apply to the fitted picture. At 100% one video pixel covers one device pixel:
 * `(videoWidth / picture width in CSS px) / devicePixelRatio`; 150%, 200% and 400% are multiples of that. A small video on a large screen
 * gives a scale below 1, and it is applied as it is, so the label stays true. Fit, or sizes not known yet, is 1.
 */
export function zoomScale(level: ZoomLevel, videoWidth: number, pictureWidth: number, devicePixelRatio: number): number {
  if (level === 'fit') return 1;
  if (!(videoWidth > 0) || !(pictureWidth > 0)) return 1;
  const ratio = devicePixelRatio > 0 ? devicePixelRatio : 1;
  return (FACTOR[level] * videoWidth) / pictureWidth / ratio;
}

/** A point of the picture, as shares of its width and height: `{ u: 0.5, v: 0.5 }` is its centre. */
export interface Centre {
  u: number;
  v: number;
}

export const PICTURE_CENTRE: Readonly<Centre> = Object.freeze({ u: 0.5, v: 0.5 });

/**
 * Keeps the picture over the whole stage on one axis. `scaled` is the zoomed picture's size and `visible` the
 * stage's. A picture larger than the stage can be panned until its edge meets the stage's edge and no further; one
 * that is smaller stays centred.
 */
export function clampCentre(centre: number, scaled: number, visible: number): number {
  if (!(scaled > visible) || !(scaled > 0)) return 0.5;
  const margin = visible / (2 * scaled);
  if (!Number.isFinite(centre)) return 0.5;
  return Math.min(1 - margin, Math.max(margin, centre));
}

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ZoomInput {
  level: ZoomLevel;
  /** The unzoomed picture inside the wrapper, in CSS pixels. */
  picture: Box;
  /** The stage: what clips the picture. The wrapper fills it. */
  stage: { width: number; height: number };
  videoWidth: number;
  devicePixelRatio: number;
  centre: Centre;
  /** Where the stage's corner is in the viewport, so the zoomed picture can start on a whole device pixel. */
  origin?: { x: number; y: number };
}

export interface ZoomTransform {
  /** `null` at Fit: no transform at all. */
  scale: number | null;
  /** The translation, for `translate(x, y) scale(scale)` with the origin in the wrapper's top-left corner. */
  x: number;
  y: number;
  /** The centre after clamping. */
  centre: Centre;
  /** Whether there is anything to pan: the zoomed picture is larger than the stage on some axis. */
  pannable: boolean;
}

/** The transform of the picture wrapper for a zoom level and a pan. */
export function zoomTransform({ level, picture, stage, videoWidth, devicePixelRatio, centre, origin }: ZoomInput): ZoomTransform {
  const none: ZoomTransform = { scale: null, x: 0, y: 0, centre: PICTURE_CENTRE, pannable: false };
  if (level === 'fit' || !(picture.width > 0) || !(picture.height > 0) || !(videoWidth > 0)) return none;

  const ratio = devicePixelRatio > 0 ? devicePixelRatio : 1;
  const scale = zoomScale(level, videoWidth, picture.width, ratio);
  const width = picture.width * scale;
  const height = picture.height * scale;
  const u = clampCentre(centre.u, width, stage.width);
  const v = clampCentre(centre.v, height, stage.height);

  // The zoomed picture's top-left corner in the stage, moved onto a whole device pixel so pixels are not blended.
  const snap = (value: number, offset: number) => Math.round((value + offset) * ratio) / ratio - offset;
  const left = snap(stage.width / 2 - u * width, origin?.x ?? 0);
  const top = snap(stage.height / 2 - v * height, origin?.y ?? 0);

  return {
    scale,
    x: left - picture.x * scale,
    y: top - picture.y * scale,
    centre: { u, v },
    pannable: width > stage.width || height > stage.height,
  };
}

/**
 * Moves the view by `dx`, `dy` CSS pixels of the screen (positive: the view goes right and down, so the picture
 * moves left and up). The result still has to go through `zoomTransform`, which clamps it.
 */
export function panCentre(centre: Centre, dx: number, dy: number, scale: number, picture: Box): Centre {
  const width = picture.width * scale;
  const height = picture.height * scale;
  if (!(width > 0) || !(height > 0)) return centre;
  return { u: centre.u + dx / width, v: centre.v + dy / height };
}
