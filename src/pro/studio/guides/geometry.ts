/**
 * Guide geometry. Pure: no React, no DOM. Everything a guide draws is computed here from the picture's rectangle,
 * so it can be tested without a browser. Rectangles are in CSS pixels unless a name says percent.
 */

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type FitMode = 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';

const FIT_MODES: readonly string[] = ['contain', 'cover', 'fill', 'none', 'scale-down'];

/** A CSS `object-fit` value as a fit mode; anything unknown is `contain`, the skin's default. */
export function toFitMode(value: string | null | undefined): FitMode {
  return value && FIT_MODES.includes(value) ? (value as FitMode) : 'contain';
}

const positive = (value: number) => Number.isFinite(value) && value > 0;

/**
 * The picture's rectangle inside the stage: where the video's pixels actually are.
 *
 * - `contain` (the default): the largest rectangle with the video's aspect ratio that fits the stage, centred, as
 *   `object-fit: contain` draws it. A stage taller than the picture gives bars above and below (letterbox); a wider
 *   one gives bars left and right (pillarbox).
 * - `fill`: the whole stage (the picture is stretched).
 * - `cover`: the picture overflows the stage and is cropped by it; the rectangle returned is the full picture, so it
 *   can be larger than the stage and start at negative coordinates.
 * - `none`: the video's own size, centred. `scale-down`: the smaller of `none` and `contain`.
 *
 * `object-position` is taken as centred, and the pixel aspect ratio as square: `videoWidth / videoHeight` is the
 * display ratio the browser reports. Returns `null` while a size is unknown (before metadata), when no guide is drawn.
 */
export function pictureRect(stageWidth: number, stageHeight: number, videoWidth: number, videoHeight: number, fit: FitMode = 'contain'): Rect | null {
  if (!positive(stageWidth) || !positive(stageHeight) || !positive(videoWidth) || !positive(videoHeight)) return null;

  const centred = (width: number, height: number): Rect => ({ x: (stageWidth - width) / 2, y: (stageHeight - height) / 2, width, height });
  const scaled = (scale: number) => centred(videoWidth * scale, videoHeight * scale);
  const contain = Math.min(stageWidth / videoWidth, stageHeight / videoHeight);

  switch (fit) {
    case 'fill':
      return { x: 0, y: 0, width: stageWidth, height: stageHeight };
    case 'cover':
      return scaled(Math.max(stageWidth / videoWidth, stageHeight / videoHeight));
    case 'none':
      return scaled(1);
    case 'scale-down':
      return scaled(Math.min(1, contain));
    default:
      return scaled(contain);
  }
}

/** True when two rectangles are the same to within a hundredth of a pixel: no need to redraw. */
export function sameRect(a: Rect | null, b: Rect | null): boolean {
  if (a === null || b === null) return a === b;
  return Math.abs(a.x - b.x) < 0.01 && Math.abs(a.y - b.y) < 0.01 && Math.abs(a.width - b.width) < 0.01 && Math.abs(a.height - b.height) < 0.01;
}

/* ---------- Safe areas ---------- */

/**
 * Broadcast safe areas for 16:9 HD, as the central part of the picture in each direction. EBU R95 and ITU-R BT.1848
 * give an action safe margin of 3.5% and a graphics (title) safe margin of 5% on every side: 93% and 90%.
 */
export const SAFE_AREAS = { 'action-safe': 0.93, 'title-safe': 0.9 } as const;

/** The centred rectangle that covers `fraction` of a `width` by `height` picture in each direction. */
export function safeAreaRect(width: number, height: number, fraction: number): Rect {
  const part = Math.min(1, Math.max(0, fraction));
  return { x: (width * (1 - part)) / 2, y: (height * (1 - part)) / 2, width: width * part, height: height * part };
}

/* ---------- Composition ---------- */

export interface Line {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

/** Rule of thirds: two vertical and two horizontal lines at one and two thirds. */
export function thirdsLines(width: number, height: number): Line[] {
  return [
    { x1: width / 3, y1: 0, x2: width / 3, y2: height },
    { x1: (width * 2) / 3, y1: 0, x2: (width * 2) / 3, y2: height },
    { x1: 0, y1: height / 3, x2: width, y2: height / 3 },
    { x1: 0, y1: (height * 2) / 3, x2: width, y2: (height * 2) / 3 },
  ];
}

/** How long the centre cross's arms are, tip to tip, as a part of the picture's height. */
export const CENTRE_CROSS = 0.05;

/** The centre cross: a short horizontal and a short vertical line through the middle of the picture. */
export function centreCross(width: number, height: number): Line[] {
  const half = Math.max(4, (height * CENTRE_CROSS) / 2);
  const cx = width / 2;
  const cy = height / 2;
  return [
    { x1: cx - half, y1: cy, x2: cx + half, y2: cy },
    { x1: cx, y1: cy - half, x2: cx, y2: cy + half },
  ];
}

/* ---------- Crop masks ---------- */

/** Width divided by height for each crop id. */
export const CROP_RATIOS: Readonly<Record<string, number>> = { '2.39': 2.39, '1.85': 1.85, '1:1': 1, '4:5': 4 / 5, '9:16': 9 / 16 };

export interface CropMask {
  /** The crop: a centred rectangle of the chosen ratio, as large as fits the picture. */
  rect: Rect;
  /** The parts of the picture outside the crop, which are dimmed. Empty when the picture already has the ratio. */
  outside: Rect[];
  /** The picture already has this ratio (to within half a pixel): only the outline is drawn. */
  full: boolean;
}

/**
 * The crop mask for a ratio (width / height) on a `width` by `height` picture. A ratio wider than the picture gives
 * bars above and below; a narrower one gives bars left and right.
 */
export function cropMask(width: number, height: number, ratio: number): CropMask | null {
  if (!positive(width) || !positive(height) || !positive(ratio)) return null;
  const pictureRatio = width / height;
  let cropWidth = width;
  let cropHeight = height;
  if (ratio > pictureRatio) cropHeight = width / ratio;
  else cropWidth = height * ratio;

  const rect: Rect = { x: (width - cropWidth) / 2, y: (height - cropHeight) / 2, width: cropWidth, height: cropHeight };
  const full = width - cropWidth < 0.5 && height - cropHeight < 0.5;
  if (full) return { rect: { x: 0, y: 0, width, height }, outside: [], full: true };

  const outside: Rect[] =
    cropHeight < height
      ? [
          { x: 0, y: 0, width, height: rect.y },
          { x: 0, y: rect.y + cropHeight, width, height: height - rect.y - cropHeight },
        ]
      : [
          { x: 0, y: 0, width: rect.x, height },
          { x: rect.x + cropWidth, y: 0, width: width - rect.x - cropWidth, height },
        ];
  return { rect, outside, full: false };
}

/* ---------- Platform zones ---------- */

/** A rectangle in percent of a frame: `x`, `y`, `width`, `height` from 0 to 100. */
export type PercentRect = Rect;

/** A rectangle given in percent of `frame`, as pixels in the frame's own coordinate space. */
export function percentToRect(percent: PercentRect, frame: Rect): Rect {
  return {
    x: frame.x + (frame.width * percent.x) / 100,
    y: frame.y + (frame.height * percent.y) / 100,
    width: (frame.width * percent.width) / 100,
    height: (frame.height * percent.height) / 100,
  };
}

/* ---------- Drawing helpers ---------- */

/** Snaps a coordinate to the middle of a device pixel, so a 1px line is one crisp pixel wide. */
export function crisp(value: number, ratio = 1): number {
  const scale = ratio > 0 ? ratio : 1;
  return (Math.floor(value * scale) + 0.5) / scale;
}

/** A rectangle whose edges sit on pixel centres and stay inside a `width` by `height` picture. */
export function crispRect(rect: Rect, width: number, height: number, ratio = 1): Rect {
  const inset = 0.5 / (ratio > 0 ? ratio : 1);
  const x1 = Math.min(Math.max(crisp(rect.x, ratio), inset), width - inset);
  const y1 = Math.min(Math.max(crisp(rect.y, ratio), inset), height - inset);
  const x2 = Math.min(Math.max(crisp(rect.x + rect.width - inset * 2, ratio), inset), width - inset);
  const y2 = Math.min(Math.max(crisp(rect.y + rect.height - inset * 2, ratio), inset), height - inset);
  return { x: x1, y: y1, width: Math.max(0, x2 - x1), height: Math.max(0, y2 - y1) };
}

/** Labels are hidden on a picture narrower than this, where they would cover what they describe. */
export const LABELS_FROM_WIDTH = 480;
