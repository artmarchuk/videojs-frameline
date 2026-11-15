import { describe, expect, it } from 'vitest';

import { ZONE_IDS } from '../../view';
import { centreCross, crisp, crispRect, cropMask, CROP_RATIOS, percentToRect, pictureRect, SAFE_AREAS, safeAreaRect, sameRect, thirdsLines, toFitMode } from './geometry';
import { PLATFORM_ZONES } from './platform-zones';

describe('pictureRect', () => {
  it('fills a stage of the same ratio', () => {
    expect(pictureRect(1280, 720, 1920, 1080)).toEqual({ x: 0, y: 0, width: 1280, height: 720 });
  });

  it('letterboxes 16:9 in a taller stage', () => {
    expect(pictureRect(1280, 900, 1920, 1080)).toEqual({ x: 0, y: 90, width: 1280, height: 720 });
  });

  it('pillarboxes 16:9 in a wider stage', () => {
    expect(pictureRect(1600, 720, 1920, 1080)).toEqual({ x: 160, y: 0, width: 1280, height: 720 });
  });

  it('pillarboxes 9:16 in a 16:9 stage', () => {
    const rect = pictureRect(1280, 720, 1080, 1920)!;
    expect(rect.height).toBe(720);
    expect(rect.width).toBeCloseTo(405);
    expect(rect.x).toBeCloseTo(437.5);
    expect(rect.y).toBe(0);
  });

  it('centres a square picture', () => {
    expect(pictureRect(1280, 720, 1080, 1080)).toEqual({ x: 280, y: 0, width: 720, height: 720 });
    expect(pictureRect(400, 720, 1080, 1080)).toEqual({ x: 0, y: 160, width: 400, height: 400 });
  });

  it('handles odd sizes without rounding the ratio away', () => {
    const rect = pictureRect(1279, 613, 1998, 1080)!;
    expect(rect.width / rect.height).toBeCloseTo(1998 / 1080, 6);
    expect(rect.width).toBeLessThanOrEqual(1279 + 1e-9);
    expect(rect.height).toBeLessThanOrEqual(613 + 1e-9);
    expect(rect.x + rect.width / 2).toBeCloseTo(1279 / 2);
    expect(rect.y + rect.height / 2).toBeCloseTo(613 / 2);
  });

  it('returns nothing before the sizes are known', () => {
    expect(pictureRect(1280, 720, 0, 0)).toBeNull();
    expect(pictureRect(0, 720, 1920, 1080)).toBeNull();
    expect(pictureRect(1280, 720, Number.NaN, 1080)).toBeNull();
  });

  it('follows the other object-fit modes', () => {
    expect(pictureRect(1280, 900, 1920, 1080, 'fill')).toEqual({ x: 0, y: 0, width: 1280, height: 900 });
    expect(pictureRect(1280, 900, 1920, 1080, 'cover')).toEqual({ x: -160, y: 0, width: 1600, height: 900 });
    expect(pictureRect(1280, 900, 640, 360, 'none')).toEqual({ x: 320, y: 270, width: 640, height: 360 });
    expect(pictureRect(1280, 900, 640, 360, 'scale-down')).toEqual({ x: 320, y: 270, width: 640, height: 360 });
    expect(pictureRect(1280, 900, 1920, 1080, 'scale-down')).toEqual({ x: 0, y: 90, width: 1280, height: 720 });
  });

  it('reads object-fit values, falling back to contain', () => {
    expect(toFitMode('cover')).toBe('cover');
    expect(toFitMode('')).toBe('contain');
    expect(toFitMode('inherit')).toBe('contain');
    expect(toFitMode(undefined)).toBe('contain');
  });

  it('compares rectangles', () => {
    expect(sameRect({ x: 0, y: 0, width: 10, height: 10 }, { x: 0.001, y: 0, width: 10, height: 10 })).toBe(true);
    expect(sameRect({ x: 0, y: 0, width: 10, height: 10 }, { x: 1, y: 0, width: 10, height: 10 })).toBe(false);
    expect(sameRect(null, null)).toBe(true);
    expect(sameRect(null, { x: 0, y: 0, width: 1, height: 1 })).toBe(false);
  });
});

describe('safe areas and composition', () => {
  it('uses the broadcast figures: action 93%, title 90%', () => {
    expect(SAFE_AREAS['action-safe']).toBe(0.93);
    expect(SAFE_AREAS['title-safe']).toBe(0.9);
  });

  it('centres a safe area', () => {
    const title = safeAreaRect(1280, 720, 0.9);
    expect(title.x).toBeCloseTo(64);
    expect(title.y).toBeCloseTo(36);
    expect(title.width).toBeCloseTo(1152);
    expect(title.height).toBeCloseTo(648);
    const action = safeAreaRect(1280, 720, 0.93);
    expect(action.x).toBeCloseTo(44.8);
    expect(action.y).toBeCloseTo(25.2);
  });

  it('puts the thirds at one and two thirds', () => {
    const lines = thirdsLines(1200, 600);
    expect(lines).toHaveLength(4);
    expect(lines[0]).toEqual({ x1: 400, y1: 0, x2: 400, y2: 600 });
    expect(lines[3]).toEqual({ x1: 0, y1: 400, x2: 1200, y2: 400 });
  });

  it('draws a short cross in the centre, about 5% of the height', () => {
    const [horizontal, vertical] = centreCross(1280, 720);
    expect(horizontal).toEqual({ x1: 622, y1: 360, x2: 658, y2: 360 });
    expect(vertical).toEqual({ x1: 640, y1: 342, x2: 640, y2: 378 });
    const small = centreCross(160, 90)[0]!;
    expect(small.x2 - small.x1).toBe(8); // never smaller than 8 px
  });
});

describe('crop masks', () => {
  it('bars a wider ratio above and below', () => {
    const mask = cropMask(1280, 720, 2.39)!;
    expect(mask.rect.width).toBe(1280);
    expect(mask.rect.height).toBeCloseTo(1280 / 2.39);
    expect(mask.rect.y).toBeCloseTo((720 - 1280 / 2.39) / 2);
    expect(mask.outside).toHaveLength(2);
    expect(mask.outside[0]).toMatchObject({ x: 0, y: 0, width: 1280 });
    expect(mask.outside[0]!.height + mask.outside[1]!.height + mask.rect.height).toBeCloseTo(720);
  });

  it('bars a narrower ratio left and right', () => {
    const mask = cropMask(1280, 720, 9 / 16)!;
    expect(mask.rect).toEqual({ x: 437.5, y: 0, width: 405, height: 720 });
    expect(mask.outside).toEqual([
      { x: 0, y: 0, width: 437.5, height: 720 },
      { x: 842.5, y: 0, width: 437.5, height: 720 },
    ]);
    expect(cropMask(1280, 720, 1)!.rect).toEqual({ x: 280, y: 0, width: 720, height: 720 });
    expect(cropMask(1280, 720, 4 / 5)!.rect.width).toBeCloseTo(576);
  });

  it('draws only the outline when the picture already has the ratio', () => {
    const mask = cropMask(405, 720, 9 / 16)!;
    expect(mask.full).toBe(true);
    expect(mask.outside).toEqual([]);
    expect(mask.rect).toEqual({ x: 0, y: 0, width: 405, height: 720 });
    expect(cropMask(1080, 1920, 9 / 16)!.full).toBe(true);
  });

  it('crops a vertical picture too', () => {
    const mask = cropMask(1080, 1920, 1)!;
    expect(mask.rect).toEqual({ x: 0, y: 420, width: 1080, height: 1080 });
    expect(mask.outside).toHaveLength(2);
  });

  it('knows every crop id and rejects bad input', () => {
    expect(Object.keys(CROP_RATIOS).sort()).toEqual(['1.85', '1:1', '2.39', '4:5', '9:16']);
    expect(cropMask(0, 720, 1)).toBeNull();
    expect(cropMask(1280, 720, 0)).toBeNull();
  });
});

describe('platform zones', () => {
  it('has a table for every platform id', () => {
    expect(Object.keys(PLATFORM_ZONES).sort()).toEqual([...ZONE_IDS].sort());
  });

  it('keeps every zone inside the 9:16 frame, with a top band, a bottom band and a right-hand rail', () => {
    for (const platform of Object.values(PLATFORM_ZONES)) {
      expect(platform.zones.map((zone) => zone.part)).toEqual(['top', 'bottom', 'rail']);
      for (const { rect } of platform.zones) {
        expect(rect.x).toBeGreaterThanOrEqual(0);
        expect(rect.y).toBeGreaterThanOrEqual(0);
        expect(rect.x + rect.width).toBeLessThanOrEqual(100);
        expect(rect.y + rect.height).toBeLessThanOrEqual(100);
        expect(rect.width).toBeGreaterThan(0);
        expect(rect.height).toBeGreaterThan(0);
      }
      const [top, bottom, rail] = platform.zones.map((zone) => zone.rect);
      expect(top!.y).toBe(0);
      expect(bottom!.y + bottom!.height).toBe(100);
      expect(rail!.x + rail!.width).toBe(100);
      expect(rail!.y).toBeGreaterThanOrEqual(top!.height);
      expect(rail!.y + rail!.height).toBeLessThanOrEqual(bottom!.y);
    }
  });

  it('places a zone inside the 9:16 frame of a 16:9 picture', () => {
    const frame = cropMask(1280, 720, 9 / 16)!.rect;
    const top = percentToRect(PLATFORM_ZONES.tiktok.zones[0]!.rect, frame);
    expect(top).toEqual({ x: 437.5, y: 0, width: 405, height: 720 * 0.08 });
    const rail = percentToRect({ x: 84, y: 38, width: 16, height: 40 }, frame);
    expect(rail.x + rail.width).toBeCloseTo(842.5);
  });

  it('uses the whole picture as the frame when the video is 9:16', () => {
    const frame = cropMask(405, 720, 9 / 16)!.rect;
    expect(percentToRect({ x: 0, y: 65, width: 100, height: 35 }, frame)).toEqual({ x: 0, y: 468, width: 405, height: 252 });
  });
});

describe('crisp lines', () => {
  it('centres a coordinate on a device pixel', () => {
    expect(crisp(10)).toBe(10.5);
    expect(crisp(10.7)).toBe(10.5);
    expect(crisp(10.3, 2)).toBe(10.25);
  });

  it('keeps an outline inside the picture', () => {
    expect(crispRect({ x: 0, y: 0, width: 1280, height: 720 }, 1280, 720)).toEqual({ x: 0.5, y: 0.5, width: 1279, height: 719 });
    const inner = crispRect({ x: 64, y: 36, width: 1152, height: 648 }, 1280, 720);
    expect(inner.x).toBe(64.5);
    expect(inner.x + inner.width).toBe(1215.5);
  });
});
