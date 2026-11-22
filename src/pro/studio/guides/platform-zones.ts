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
 * themselves.
 *
 * RULE: a safe-zone guide must never promise space that the platform's UI may cover. Where sources disagree, use the
 * LARGEST unsafe margin, not the smallest. Each number below says which source it comes from (percent of 1080x1920). See docs/history/NOTES-2026-11.md, "Platform zones: numbers and sources". The UI says "Approximate" on every platform.
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
  // Top 380 px = 19.8% (adchecklab.com, measured on organic Shorts; the ad template says 288 px = 15%).
  // Bottom 672 px = 35% (Google's vertical video ad template as quoted by socialync.io and adkit.so; others say 390 to 576 px).
  // Right 201 px = 18% (adchecklab.com; the ad template says 192 px = 17.8%). The rail's vertical extent is our estimate.
  shorts: { id: 'shorts', zones: [band('top', 0, 19.8), band('bottom', 65, 35), rail(18, 36, 65)] },
  // Top 297 px = 15.5% (organic checker tools; Meta's ad guide says 269 px = 14%, others 220 to 250 px).
  // Bottom 672 px = 35% (Meta's ad guide as quoted by lilachbullock.com and socialync.io; organic tools say 420 to 450 px).
  // Right 227 px = 21% (the like/comment/share column, one source; the side margin is only 6%). The rail's vertical extent is our estimate.
  reels: { id: 'reels', zones: [band('top', 0, 15.5), band('bottom', 65, 35), rail(21, 38, 65)] },
  // Top 240 px = 12.5% (the 720x1280 in-feed template scaled to 1080x1920, quoted by yosefk.me and others; other sources say 130 to 160 px).
  // Bottom 660 px = 34.4% (same template; other sources say 422 to 484 px).
  // Right 173 px = 16% (largest of 120 to 173 px). The rail's vertical extent is our estimate.
  tiktok: { id: 'tiktok', zones: [band('top', 0, 12.5), band('bottom', 65.6, 34.4), rail(16, 38, 65.6)] },
};
