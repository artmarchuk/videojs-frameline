/**
 * Platform UI zones: where an app's own interface covers a vertical (9:16) video. THE ONLY FILE TO EDIT to change a
 * platform's numbers or to add a platform (plus its id in `ZONE_IDS` in `src/pro/view.ts` and its name in the
 * strings).
 *
 * Rectangles are in percent of the 9:16 frame: `x`, `y`, `width`, `height` from 0 to 100, with the origin at the top
 * left.
 *
 * These are APPROXIMATE. Apps change their layouts, the layout depends on the caption length and on whether the
 * video is an ad, and none of the platforms publishes one fixed set of pixel margins. The numbers below come from
 * secondary sources that cite the platforms' own safe-zone templates; they were not checked against the templates
 * themselves. See NOTES.md, "Platform zones: numbers and sources". The UI says "Approximate" on every platform.
 */
import type { ZoneId } from '../../view';
import type { PercentRect } from './geometry';

export type ZonePart = 'top' | 'bottom' | 'rail';

export interface Zone {
  part: ZonePart;
  rect: PercentRect;
}

export interface PlatformZones {
  id: ZoneId;
  zones: readonly Zone[];
}

const band = (part: ZonePart, y: number, height: number): Zone => ({ part, rect: { x: 0, y, width: 100, height } });
/** The column of buttons on the right: `width` percent wide, from `from` to `to` percent of the height. */
const rail = (width: number, from: number, to: number): Zone => ({ part: 'rail', rect: { x: 100 - width, y: from, width, height: to - from } });

export const PLATFORM_ZONES: Readonly<Record<ZoneId, PlatformZones>> = {
  // 1080x1920: top 288 px (15%), bottom 672 px (35%), right 192 px (17.8%). The rail's vertical extent is our estimate.
  shorts: { id: 'shorts', zones: [band('top', 0, 15), band('bottom', 65, 35), rail(18, 36, 65)] },
  // Top 14%, bottom 35%, sides 6%. The like/comment/share column is wider than the side margin: 12% is our estimate.
  reels: { id: 'reels', zones: [band('top', 0, 14), band('bottom', 65, 35), rail(12, 38, 65)] },
  // Sources disagree (top 154 to 240 px, bottom 422 to 660 px, right 120 to 173 px). These are the mid-range figures:
  // top 154 px (8%), bottom 422 px (22%), right 173 px (16%).
  tiktok: { id: 'tiktok', zones: [band('top', 0, 8), band('bottom', 78, 22), rail(16, 38, 78)] },
};
