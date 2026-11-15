import { describe, expect, it } from 'vitest';

import { clampCentre, nextZoom, panCentre, PAN_STEP, PICTURE_CENTRE, zoomScale, zoomTransform, type ZoomInput } from './zoom';

describe('zoomScale', () => {
  it('is 1 at Fit and while sizes are unknown', () => {
    expect(zoomScale('fit', 1920, 960, 2)).toBe(1);
    expect(zoomScale('100', 0, 960, 1)).toBe(1);
    expect(zoomScale('100', 1920, 0, 1)).toBe(1);
  });

  it('puts one video pixel on one device pixel at 100%', () => {
    // A 1920 px wide video fitted into 960 CSS px.
    expect(zoomScale('100', 1920, 960, 1)).toBe(2); // 1920 CSS px wide: 1920 device pixels
    expect(zoomScale('100', 1920, 960, 2)).toBe(1); // 960 CSS px wide: 1920 device pixels
    expect(zoomScale('100', 1920, 1280, 2)).toBe(0.75);
  });

  it('doubles that at 200%', () => {
    expect(zoomScale('200', 1920, 960, 1)).toBe(4);
    expect(zoomScale('200', 1920, 960, 2)).toBe(2);
  });

  it('applies 100% exactly when it is smaller than Fit', () => {
    // A 640 px wide video on a 1280 px wide stage: Fit enlarges it, 100% shows it at half the stage.
    expect(zoomScale('100', 640, 1280, 1)).toBe(0.5);
    expect(zoomScale('100', 640, 1280, 2)).toBe(0.25);
  });
});

describe('nextZoom', () => {
  it('cycles Fit, 100%, 200%, Fit', () => {
    expect(nextZoom('fit')).toBe('100');
    expect(nextZoom('100')).toBe('200');
    expect(nextZoom('200')).toBe('fit');
  });
});

describe('clampCentre', () => {
  it('keeps the picture over the whole stage', () => {
    // Picture 2000 wide in a 1000 wide stage: the centre can go from 0.25 to 0.75.
    expect(clampCentre(0.5, 2000, 1000)).toBe(0.5);
    expect(clampCentre(0, 2000, 1000)).toBe(0.25);
    expect(clampCentre(1, 2000, 1000)).toBe(0.75);
    expect(clampCentre(-5, 4000, 1000)).toBe(0.125);
  });

  it('centres a picture that is not larger than the stage', () => {
    expect(clampCentre(0.9, 500, 1000)).toBe(0.5);
    expect(clampCentre(0.1, 1000, 1000)).toBe(0.5);
    expect(clampCentre(Number.NaN, 2000, 1000)).toBe(0.5);
  });
});

describe('zoomTransform', () => {
  const base: ZoomInput = {
    level: '100',
    picture: { x: 0, y: 0, width: 960, height: 540 },
    stage: { width: 960, height: 540 },
    videoWidth: 1920,
    devicePixelRatio: 1,
    centre: PICTURE_CENTRE,
  };

  it('has no transform at Fit or before the sizes are known', () => {
    expect(zoomTransform({ ...base, level: 'fit' }).scale).toBeNull();
    expect(zoomTransform({ ...base, videoWidth: 0 }).scale).toBeNull();
    expect(zoomTransform({ ...base, picture: { x: 0, y: 0, width: 0, height: 0 } }).scale).toBeNull();
  });

  it('centres on the middle of the picture when a level is entered', () => {
    const result = zoomTransform(base);
    expect(result).toMatchObject({ scale: 2, x: -480, y: -270, pannable: true, centre: { u: 0.5, v: 0.5 } });
  });

  it('centres a letterboxed picture, not the stage box', () => {
    // A 16:9 picture letterboxed in a square stage: it starts 210 px down.
    const result = zoomTransform({ ...base, picture: { x: 0, y: 210, width: 960, height: 540 }, stage: { width: 960, height: 960 } });
    // Zoomed it is 1920x1080: wider than the stage and taller, so both axes cover the stage.
    expect(result.scale).toBe(2);
    expect(result.x).toBe(-480);
    expect(result.y).toBe(480 - 2 * (210 + 270));
  });

  it('stops the pan at the picture edges: no empty band on any side', () => {
    const edge = (centre: { u: number; v: number }) => {
      const { scale, x, y } = zoomTransform({ ...base, centre });
      return { left: x, top: y, right: x + 960 * scale!, bottom: y + 540 * scale! };
    };
    expect(edge({ u: -1, v: -1 })).toMatchObject({ left: 0, top: 0 });
    expect(edge({ u: 9, v: 9 })).toMatchObject({ right: 960, bottom: 540 });
    const far = zoomTransform({ ...base, centre: { u: 9, v: -9 } });
    expect(far.centre).toEqual({ u: 0.75, v: 0.25 });
  });

  it('keeps a picture smaller than the stage centred, and says there is nothing to pan', () => {
    const result = zoomTransform({ ...base, videoWidth: 480, centre: { u: 0.9, v: 0.1 } });
    expect(result).toMatchObject({ scale: 0.5, x: 240, y: 135, pannable: false, centre: { u: 0.5, v: 0.5 } });
  });

  it('starts the zoomed picture on a whole device pixel of the screen', () => {
    const result = zoomTransform({ ...base, devicePixelRatio: 2, stage: { width: 961, height: 540 }, origin: { x: 10.25, y: 0 } });
    // scale 1 at 2x: the picture is as wide as the stage (960 of 961), so it stays centred, then snaps.
    expect(result.scale).toBe(1);
    expect(((result.x + 10.25) * 2) % 1).toBe(0);
  });
});

describe('panCentre', () => {
  const picture = { x: 0, y: 0, width: 960, height: 540 };

  it('moves the view by screen pixels', () => {
    expect(panCentre(PICTURE_CENTRE, 96, 0, 2, picture)).toEqual({ u: 0.55, v: 0.5 });
    expect(panCentre(PICTURE_CENTRE, 0, -108, 2, picture)).toEqual({ u: 0.5, v: 0.4 });
  });

  it('one Alt+arrow press is a tenth of the visible area, and repeated presses stop at the edge', () => {
    let centre = { ...PICTURE_CENTRE };
    const input: ZoomInput = { level: '100', picture, stage: { width: 960, height: 540 }, videoWidth: 1920, devicePixelRatio: 1, centre };
    const press = () => {
      centre = zoomTransform({ ...input, centre: panCentre(centre, PAN_STEP * 960, 0, 2, picture) }).centre;
    };
    press();
    expect(centre.u).toBeCloseTo(0.55);
    for (let i = 0; i < 20; i++) press();
    expect(centre.u).toBe(0.75);
    expect(zoomTransform({ ...input, centre }).x).toBe(-960);
  });
});
