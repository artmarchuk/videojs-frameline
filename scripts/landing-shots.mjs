// Generates the landing page's screenshots: the figures of "What Studio checks" and the tier pair of "Built to be
// hosted". Every file in apps/preview/public/shots/ comes from this script; running it again regenerates them all.
//
//   npm run build && npm run preview            # serves dist/ on http://localhost:4173
//   node scripts/landing-shots.mjs [url]        # default url: http://localhost:4173
//   node scripts/landing-shots.mjs [url] zoom   # one shot only, by name
//
// Each state is reached the way a user would reach it: a frame link (`#t=…`) on the monitor page (`preview.html`),
// then keys, clicks and hover. Nothing is retouched: a shot is a clip of the player, placed on the player's surround
// colour where the region reaches past it, and encoded. Chrome (for H.264), device scale factor 2, dark.
//
// The script cannot read the picture, so two things are for a person to look at after a run:
//   frame-step  the burned-in timecode and the dock's timecode must read the same frame;
//   zoom        the edges of the burned-in digits must show as square steps, and no lower-rendition note may be in the shot;
//   guides      the peak must sit well against the thirds.
import { mkdir, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from 'playwright-core';
import sharp from 'sharp';

const base = (process.argv[2] ?? 'http://localhost:4173').replace(/\/$/, '');
const only = process.argv[3];
const outDir = fileURLToPath(new URL('../apps/preview/public/shots/', import.meta.url));

/** The player's surround colour (`--fl-surface-0`, the page's `--sunken`): what shows where a region passes the player. */
const SURROUND = '#0f0f0f';
/** A shot's region in CSS px, and the size it is exported at: text in the image is at 80% of its size on screen. */
const REGION = { width: 700, height: 437.5 };
const EXPORT = { width: 1120, height: 700 };
const SCALE = 2;

/** The reel moments the shots use, as the timecodes a frame link carries. */
const AT = {
  staged: '00:00:06:00', // Courier greenscreen comp; the hero's staged frame
  rangeIn: '00:00:04:12',
  beforeFlash: '00:00:27:14', // one frame before the marker `flash`
  flash: '00:00:27:15',
  snowPeak: '00:00:49:12', // Snow peak: the summit sits by the upper right crossing of the thirds
};
/** The burned-in timecode's box in the reel's 1920 × 1080 frame, measured on the frame 00:00:06:00. */
const BURN_IN = { x: 192, y: 108, width: 245, height: 58 };
const SOURCE = { width: 1920, height: 1080 };
const FPS = 24;

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const report = [];
const notes = [];

/* ---------- Helpers ---------- */

const frames = (timecode) => {
  const [hours, minutes, seconds, frame] = timecode.split(':').map(Number);
  return ((hours * 60 + minutes) * 60 + seconds) * FPS + frame;
};

/** Opens the monitor page with the player `width` px wide on the frame `at`, and waits for the Studio tools. */
async function monitor({ width, at, tier = 'studio', viewport = { width: 1500, height: 1100 } }) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: SCALE, colorScheme: 'dark', acceptDownloads: true });
  const page = await context.newPage();
  await page.goto(`${base}/preview.html?tier=${tier}#width=${width}&t=${at}`, { waitUntil: 'load' });
  await page.waitForFunction(() => document.querySelector('video')?.duration > 0, null, { timeout: 30000 });
  if (tier === 'studio') await page.waitForSelector('.pro-timeline', { timeout: 30000 });
  await timecodeIs(page, at);
  return page;
}

const timecode = (page) => page.evaluate(() => (document.querySelector('.pro-timecode-values')?.textContent ?? '').slice(0, 11));

/** Waits until the dock's timecode field reads `expected`. The skin's clock follows a seek by a frame or two. */
async function timecodeIs(page, expected) {
  await page.waitForFunction(() => !document.querySelector('video').seeking, null, { timeout: 15000 });
  await page
    .waitForFunction((value) => (document.querySelector('.pro-timecode-values')?.textContent ?? '').startsWith(value), expected, { timeout: 15000 })
    .catch(async () => {
      throw new Error(`The timecode field reads ${await timecode(page)}, expected ${expected}`);
    });
}

/** A key, pressed on the player, with time for the seek or the menu it starts. */
async function key(page, name, times = 1) {
  for (let i = 0; i < times; i++) {
    await page.keyboard.press(name);
    await page.waitForTimeout(140);
  }
  await page.waitForFunction(() => !document.querySelector('video').seeking, null, { timeout: 15000 });
}

/** Moves the playhead from one timecode to another with the keys: `Shift` + arrows jump 10 frames, `,` `.` step one. */
async function walk(page, from, to) {
  const distance = frames(to) - frames(from);
  await key(page, distance > 0 ? 'Shift+ArrowRight' : 'Shift+ArrowLeft', Math.floor(Math.abs(distance) / 10));
  await key(page, distance > 0 ? '.' : ',', Math.abs(distance) % 10);
  await timecodeIs(page, to);
}

/**
 * Picks the best rendition in the settings menu and waits until it is the one on screen. A paused player stays on
 * the rendition it started with, and a shot of a soft picture, or of the skin's lower-rendition note, is no proof.
 */
async function bestRendition(page) {
  await page.click('.media-settings-button');
  await page.waitForTimeout(400);
  await page.locator('.media-menu-popup:not(.pro-menu-popup) [role^=menuitem]', { hasText: 'Quality' }).first().click();
  await page.waitForTimeout(400);
  const radios = page.locator('[role=menuitemradio]:visible');
  const heights = (await radios.allTextContents()).map((text) => Number(/^(\d+)p/.exec(text.trim())?.[1]) || 0);
  const best = Math.max(...heights);
  await radios.nth(heights.indexOf(best)).click();
  await page.waitForTimeout(300);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  await page.keyboard.press('Escape');
  await page.focus('.pro-skin');
  // A paused player keeps the rendition it has; it changes over while playing. Play until the best one is on screen,
  // pause, and walk back to the frame.
  const here = await timecode(page);
  await page.keyboard.press('k');
  await page.waitForFunction((height) => document.querySelector('video').videoHeight === height, best, { timeout: 40000 }).catch(() => {});
  await page.keyboard.press('k');
  await page.waitForFunction(() => document.querySelector('video').paused, null, { timeout: 5000 });
  await page.waitForTimeout(500);
  const height = await page.evaluate(() => document.querySelector('video').videoHeight);
  if (height !== best) throw new Error(`The best rendition (${best}p) is not playing: the video is ${height}p`);
  await walk(page, await timecode(page), here);
  await timecodeIs(page, here);
  return best;
}

/** Leaves nothing in the picture that is not the state itself: no focus ring, no tooltip, no toast. */
async function settle(page, { keepPointer = false } = {}) {
  if (!keepPointer) await page.mouse.move(0, 0);
  await page.evaluate(() => document.activeElement instanceof HTMLElement && document.activeElement.blur());
  await page.waitForFunction(() => !document.querySelector('.pro-toast'), null, { timeout: 10000 });
  await page.waitForFunction(() => !document.querySelector('video').seeking, null, { timeout: 15000 });
  await page.waitForTimeout(600);
}

const box = (page, selector) =>
  page.evaluate((query) => {
    const rect = document.querySelector(query)?.getBoundingClientRect();
    return rect ? { x: rect.x, y: rect.y, width: rect.width, height: rect.height } : null;
  }, selector);

/** The player without its 1 px hairline: the figure on the page draws its own. */
async function playerBox(page) {
  const skin = await box(page, '.pro-skin');
  return { x: skin.x + 1, y: skin.y + 1, width: skin.width - 2, height: skin.height - 2 };
}

/** A region of `size`, placed against an element's box: `x` and `y` are 'start', 'centre' or 'end'. */
function regionAt(anchor, { x = 'start', y = 'end' }, size = REGION) {
  const place = (start, length, own, where) => (where === 'start' ? start : where === 'end' ? start + length - own : start + (length - own) / 2);
  return { x: place(anchor.x, anchor.width, size.width, x), y: place(anchor.y, anchor.height, size.height, y), ...size };
}

function assertInside(region, inner, what) {
  if (!inner) throw new Error(`${what} is not on the page`);
  const pad = 6;
  if (inner.x < region.x + pad || inner.y < region.y + pad || inner.x + inner.width > region.x + region.width - pad || inner.y + inner.height > region.y + region.height - pad)
    throw new Error(`${what} does not fit the region: ${JSON.stringify(inner)} in ${JSON.stringify(region)}`);
}

/** Clips `region` out of the page, inside `within` only, and returns it on the surround colour, at capture scale. */
async function clip(page, region, within) {
  const left = Math.max(region.x, within.x);
  const top = Math.max(region.y, within.y);
  const right = Math.min(region.x + region.width, within.x + within.width);
  const bottom = Math.min(region.y + region.height, within.y + within.height);
  const capture = await page.screenshot({ type: 'png', clip: { x: left, y: top, width: right - left, height: bottom - top } });
  const canvas = { width: Math.round(region.width * SCALE), height: Math.round(region.height * SCALE) };
  const piece = await sharp(capture).resize({ width: Math.min(canvas.width, Math.round((right - left) * SCALE)), height: Math.min(canvas.height, Math.round((bottom - top) * SCALE)), fit: 'fill' }).toBuffer();
  return sharp({ create: { ...canvas, channels: 3, background: SURROUND } })
    .composite([{ input: piece, left: Math.round((left - region.x) * SCALE), top: Math.round((top - region.y) * SCALE) }])
    .png()
    .toBuffer();
}

/** A whole image fitted into the export size, centred on the surround colour. */
function fitted(image) {
  return sharp(image).resize({ ...EXPORT, fit: 'contain', background: SURROUND, kernel: 'lanczos3' }).png().toBuffer();
}

/** Writes one shot as AVIF and WebP, resized to `size` when given, and notes its size for the report. */
async function save(name, image, size, quality = {}) {
  const source = size ? await sharp(image).resize({ ...size, fit: 'fill', kernel: 'lanczos3' }).png().toBuffer() : image;
  const meta = await sharp(source).metadata();
  for (const [format, encode] of [
    ['avif', (input) => input.avif({ quality: quality.avif ?? 60, effort: 7, chromaSubsampling: '4:4:4' })],
    ['webp', (input) => input.webp({ quality: quality.webp ?? 82, effort: 6, smartSubsample: true })],
  ]) {
    const file = join(outDir, `${name}.${format}`);
    await encode(sharp(source)).toFile(file);
    report.push({ file: `${name}.${format}`, width: meta.width, height: meta.height, bytes: (await stat(file)).size });
  }
}

/**
 * Switches guides on in the Guides menu, by the names the menu shows, and closes the menu. `expected` is the
 * `data-guide-*` attributes the player must then carry, and no others.
 */
async function guidesOn(page, labels, expected) {
  for (const label of labels) {
    if (!(await page.locator('.pro-menu-popup:visible').count())) {
      await page.click('[data-pro-menu="guides"]');
      await page.waitForTimeout(400);
    }
    await page.locator('.pro-menu-popup [role^=menuitem]', { hasText: label }).first().click();
    await page.waitForTimeout(300);
  }
  for (let i = 0; i < 3 && (await page.locator('.pro-menu-popup:visible').count()); i++) {
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
  }
  const drawn = await page.evaluate(() => {
    const skin = document.querySelector('.pro-skin');
    return { guides: skin.getAttributeNames().filter((name) => name.startsWith('data-guide-')).map((name) => name.slice(11)).sort(), zones: skin.dataset.zones ?? null };
  });
  if (drawn.zones || drawn.guides.join() !== [...expected].sort().join()) throw new Error(`The guides are not as wanted: ${JSON.stringify(drawn)}, wanted ${expected.join()}`);
}

/* ---------- The shots ---------- */

const SHOTS = {
  /**
   * 1. The staged range: both handles, the band, the playhead inside it, Loop on. An 1100 px player, not 1280: at
   * 1280 a 700 px region that holds the In handle and the Loop button cuts the timecode field in two.
   */
  async range() {
    const page = await monitor({ width: 1100, at: AT.rangeIn });
    await page.focus('.pro-skin');
    await key(page, 'i');
    await walk(page, AT.rangeIn, '00:00:10:02');
    await key(page, 'o');
    await walk(page, '00:00:10:02', AT.staged);
    // Title safe, as on the staged hero.
    await page.click('[data-pro-menu="guides"]');
    await page.waitForTimeout(400);
    await page.locator('.pro-menu-popup [role^=menuitem]', { hasText: 'Title safe' }).first().click();
    await page.keyboard.press('Escape');
    await bestRendition(page);
    await settle(page);

    const state = await page.evaluate(() => ({
      in: document.querySelector('[data-handle="in"]').getAttribute('aria-valuetext'),
      out: document.querySelector('[data-handle="out"]').getAttribute('aria-valuetext'),
      loop: document.querySelector('.pro-range button').getAttribute('aria-pressed'),
    }));
    if (state.in !== AT.rangeIn || state.out !== '00:00:10:02' || state.loop !== 'true') throw new Error(`The range shot is not in its state: ${JSON.stringify(state)}`);
    notes.push(`range: In ${state.in}, Out ${state.out}, playhead ${await timecode(page)}, Loop on`);

    const player = await playerBox(page);
    const region = regionAt(player, { x: 'start', y: 'end' });
    assertInside({ ...region, x: region.x - 6, y: region.y, height: region.height + 6 }, await box(page, '.pro-timecode-pair'), 'The timecode field');
    assertInside(region, await box(page, '.pro-range'), 'The Loop button');
    assertInside({ ...region, x: region.x - 6 }, await box(page, '[data-handle="in"]'), 'The In handle');
    await save('range', await clip(page, region, player), EXPORT);
    await page.context().close();
  },

  /**
   * 2. The burned-in timecode and the dock's timecode field in one region. At Fit on a 1280 px player they are 755 px
   * apart, so the window is short (the monitor letterboxes the stage) and the picture is at 150%, on its top left corner.
   */
  async 'frame-step'() {
    // The shortest window the monitor page still fits the player into (under 560 px it lets the page scroll): the
    // player is 498 px tall, and the region is its lower 437.5 px.
    const page = await monitor({ width: 1280, at: AT.beforeFlash, viewport: { width: 1500, height: 560 } });
    if ((await box(page, '.pro-skin')).height > 500) throw new Error('The monitor page did not fit the player into the short window');
    await bestRendition(page);
    await page.focus('.pro-skin');
    await key(page, '.'); // the step the row is about
    await timecodeIs(page, AT.flash);
    await key(page, 'z', 2); // Fit, 100%, 150%
    await page.waitForTimeout(600);
    await key(page, 'Shift+Alt+ArrowLeft', 14);
    await key(page, 'Shift+Alt+ArrowUp', 14);
    await settle(page);

    // The picture's top left corner is in the stage's top left corner. The video element is letterboxed in a short stage.
    const corner = await page.evaluate(() => {
      const video = document.querySelector('video').getBoundingClientRect();
      const stage = document.querySelector('.pro-stage').getBoundingClientRect();
      return { x: Math.round(video.x + (video.width - (video.height * 16) / 9) / 2 - stage.x), y: Math.round(video.y - stage.y) };
    });
    if (Math.abs(corner.x) > 1 || Math.abs(corner.y) > 1) throw new Error(`The picture is not on its top left corner: ${JSON.stringify(corner)}`);

    const state = { field: await timecode(page), zoom: await page.evaluate(() => document.querySelector('.pro-skin').dataset.zoom) };
    if (state.field !== AT.flash || state.zoom !== '150') throw new Error(`The frame-step shot is not in its state: ${JSON.stringify(state)}`);
    notes.push(`frame-step: the timecode field reads ${state.field}; compare it with the burned-in timecode in the image`);

    const player = await playerBox(page);
    const region = regionAt(player, { x: 'start', y: 'end' });
    assertInside({ ...region, x: region.x - 6, height: region.height + 6 }, await box(page, '.pro-timecode-pair'), 'The timecode field');
    await save('frame-step', await clip(page, region, player), EXPORT);
    await page.context().close();
  },

  /** 3. The ruler's marker pins, the pin of `hold` hovered, and the link button beside the timecode. */
  async markers() {
    const markers = await (await fetch(`${base}/demo/reel/markers.json`)).json();
    const hold = markers.find((marker) => marker.id === 'hold');
    if (!hold) throw new Error('The markers file has no marker `hold`');
    const at = `00:00:${String(Math.floor(hold.time)).padStart(2, '0')}:${String(Math.round((hold.time % 1) * FPS)).padStart(2, '0')}`;
    const page = await monitor({ width: 1280, at });
    await bestRendition(page);
    await settle(page);

    const pins = await box(page, '.pro-tl-pins');
    const duration = await page.evaluate(() => document.querySelector('video').duration);
    await page.mouse.move(pins.x + (pins.width * hold.time) / duration, pins.y + pins.height / 2, { steps: 8 });
    await page.waitForTimeout(900);
    const label = await page.evaluate(() => [...document.querySelectorAll('.pro-skin [role=tooltip], .pro-tl-preview, .pro-tl-tip')].map((element) => element.textContent.trim()).filter(Boolean));
    if (!label.some((text) => text.includes(hold.label))) throw new Error(`The marker's label is not showing: ${JSON.stringify(label)}`);
    notes.push(`markers: hovering the pin of "${hold.label}" at ${at}`);
    await settle(page, { keepPointer: true });

    const player = await playerBox(page);
    const region = regionAt(player, { x: 'start', y: 'end' });
    assertInside({ ...region, x: region.x - 6, height: region.height + 6 }, await box(page, '.pro-tool-link'), 'The link button');
    await save('markers', await clip(page, region, player), EXPORT);
    await page.context().close();
  },

  /**
   * 4. The 2.39:1 crop and the rule of thirds on the Snow peak, on a 760 px player. A different moment and guide set
   * from the frame grab's row.
   */
  async guides() {
    const page = await monitor({ width: 760, at: AT.snowPeak, viewport: { width: 1100, height: 1000 } });
    await bestRendition(page);
    await guidesOn(page, ['2.39:1', 'Rule of thirds'], ['2-39', 'thirds']);
    await page.focus('.pro-skin');
    await settle(page);
    notes.push(`guides: the 2.39:1 crop and the rule of thirds on ${await timecode(page)}`);
    const picture = await box(page, '.pro-picture');
    await save('guides', await clip(page, regionAt(picture, { x: 'centre', y: 'centre' }), picture), EXPORT);
    await page.context().close();
  },

  /**
   * 6. The Dancer with Title safe, the thirds and the centre cross, whole, beside the PNG that `G` saves from it. One
   * session, so the pair is one frame in one state.
   */
  async grab() {
    const markers = await (await fetch(`${base}/demo/reel/markers.json`)).json();
    const hold = markers.find((marker) => marker.id === 'hold');
    const at = `00:00:${String(Math.floor(hold.time)).padStart(2, '0')}:${String(Math.round((hold.time % 1) * FPS)).padStart(2, '0')}`;
    const page = await monitor({ width: 760, at, viewport: { width: 1100, height: 1000 } });
    await bestRendition(page);
    await guidesOn(page, ['Title safe', 'Rule of thirds', 'Centre cross'], ['title-safe', 'thirds', 'centre']);
    await page.focus('.pro-skin');
    await settle(page);
    const picture = await box(page, '.pro-picture');

    // 6a. On screen: the whole picture, guides on.
    const screen = await page.screenshot({ type: 'png', clip: picture });
    await save('grab-screen', await fitted(screen));

    // 6b. The file `G` saves, as it was downloaded.
    const folder = join(tmpdir(), `frameline-grab-${Date.now()}`);
    await mkdir(folder, { recursive: true });
    await page.focus('.pro-skin');
    const [download] = await Promise.all([page.waitForEvent('download', { timeout: 20000 }), page.keyboard.press('g')]);
    const file = join(folder, download.suggestedFilename());
    await download.saveAs(file);
    const grabbed = await readFile(file);
    const meta = await sharp(grabbed).metadata();
    notes.push(`grab-file: ${download.suggestedFilename()}, ${meta.width} × ${meta.height} px, ${grabbed.length} bytes, frame ${at}`);
    await save('grab-file', await fitted(grabbed));
    await rm(folder, { recursive: true, force: true });
    await page.context().close();

    // The size the skin reports for that grab, from `onFrameGrab` in the landing page's event log.
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, colorScheme: 'dark', acceptDownloads: true });
    const landing = await context.newPage();
    await landing.goto(`${base}/#t=${at}`, { waitUntil: 'load' });
    await landing.waitForFunction(() => document.querySelector('#player video')?.duration > 0, null, { timeout: 30000 });
    await landing.waitForSelector('#player .pro-timeline', { timeout: 30000 });
    await landing.waitForTimeout(1500);
    await landing.focus('#player .pro-skin');
    await Promise.all([landing.waitForEvent('download', { timeout: 20000 }), landing.keyboard.press('g')]);
    await landing.waitForFunction(() => /onFrameGrab/.test(document.querySelector('#log')?.textContent ?? ''), null, { timeout: 10000 });
    const line = await landing.evaluate(() => [...document.querySelectorAll('#log li')].map((item) => item.textContent).find((text) => text.includes('onFrameGrab')));
    const reported = /(\d+)×(\d+)/.exec(line);
    notes.push(`grab-file: onFrameGrab reports ${reported?.[1]} × ${reported?.[2]} ("${line}")`);
    if (Number(reported?.[1]) !== meta.width || Number(reported?.[2]) !== meta.height) throw new Error(`onFrameGrab (${reported?.[0]}) and the file (${meta.width}×${meta.height}) disagree`);
    await context.close();
  },

  /**
   * 5. 400% on the burned-in timecode of the staged frame, the Zoom button reading 400%. A 560 × 350 region exported
   * one to one, not 700 px scaled to 80%: a source pixel is four device pixels here, and scaling would turn exact
   * squares into uneven ones.
   *
   * The timecode is in the picture's top left corner and the Zoom button in the dock's right half, and a pan stops
   * at the picture's edge. So the player is sized to bring them together: with the picture panned to its top left
   * corner, the timecode's centre is a fixed distance from the stage's corner (two CSS px per source pixel), and the
   * player's width and the window's height put the middle of the region's picture area on that point.
   */
  async zoom() {
    const size = { width: EXPORT.width / SCALE, height: EXPORT.height / SCALE };
    const perPixel = 4 / SCALE; // CSS px per source pixel at 400%
    const centre = { x: (BURN_IN.x + BURN_IN.width / 2) * perPixel, y: (BURN_IN.y + BURN_IN.height / 2) * perPixel };
    const DOCK = 117; // the one-row dock; checked below
    const BARS = 62; // the monitor page's own bars above and below the player
    const pictureArea = size.height - DOCK; // the part of the region above the dock
    const width = Math.round(centre.x + size.width / 2);
    const stageHeight = Math.round(centre.y + pictureArea / 2);
    const page = await monitor({ width, at: AT.staged, viewport: { width: 1500, height: stageHeight + DOCK + BARS } });
    const best = await bestRendition(page);
    await page.focus('.pro-skin');
    await key(page, 'z', 4); // 100%, 150%, 200%, 400%
    await page.waitForTimeout(600);
    // A pan key moves the picture a tenth of the stage; 30 presses reach the corner from anywhere, and the pan stops there.
    await key(page, 'Shift+Alt+ArrowLeft', 30);
    await key(page, 'Shift+Alt+ArrowUp', 30);
    await page.waitForTimeout(2500); // a rendition note, if one is coming, has arrived by now
    await settle(page);

    const state = await page.evaluate(() => ({
      zoom: document.querySelector('.pro-skin').dataset.zoom,
      button: document.querySelector('[data-pro-menu="zoom"]').textContent.trim(),
      label: document.querySelector('[data-pro-menu="zoom"]').getAttribute('aria-label'),
      height: document.querySelector('video').videoHeight,
      rendering: getComputedStyle(document.querySelector('video')).imageRendering,
    }));
    if (state.zoom !== '400' || state.height !== best || !state.button.startsWith('400%') || /showing|\dp/.test(state.button + state.label))
      throw new Error(`The zoom shot is not in its state, or a lower rendition is playing: ${JSON.stringify(state)}`);

    const player = await playerBox(page);
    const region = regionAt(player, { x: 'end', y: 'end' }, size);
    // Where the burned-in timecode is on screen: the frame's box, scaled, from the frame's top left corner.
    const stage = await box(page, '.pro-stage');
    const frame = await page.evaluate((source) => {
      const video = document.querySelector('video').getBoundingClientRect();
      const scale = Math.min(video.width / source.width, video.height / source.height);
      return { x: video.x + (video.width - source.width * scale) / 2, y: video.y + (video.height - source.height * scale) / 2, scale };
    }, SOURCE);
    if (Math.abs(frame.scale - perPixel) > 0.01) throw new Error(`A source pixel is ${frame.scale} CSS px, not ${perPixel}`);
    const burnIn = { x: frame.x + BURN_IN.x * frame.scale, y: frame.y + BURN_IN.y * frame.scale, width: BURN_IN.width * frame.scale, height: BURN_IN.height * frame.scale };
    assertInside({ ...region, height: stage.y + stage.height - region.y }, burnIn, 'The burned-in timecode');
    assertInside({ ...region, height: region.height + 6 }, await box(page, '[data-pro-menu="zoom"]'), 'The Zoom button');
    notes.push(`zoom: ${state.button}, ${state.height}p playing, image-rendering ${state.rendering}, a ${width} px player with a ${Math.round(stage.height)} px stage, on ${await timecode(page)}`);
    await save('zoom', await clip(page, region, player));
    await page.context().close();
  },

  /**
   * 7. The whole player in each tier, 760 px wide, on one frame: 00:00:05:00. Studio opens on it from a frame link.
   * Viewer has no frame link and no frame step, and the monitor's tier switch starts the video again, so Viewer
   * gets there with its own key: Right, 5 s from the start.
   */
  async tiers() {
    const at = '00:00:05:00';
    const sizes = {};

    const studio = await monitor({ width: 760, at, viewport: { width: 1100, height: 1000 } });
    await bestRendition(studio);
    await settle(studio);
    const studioBox = await box(studio, '.media-skin');
    sizes.studio = `${Math.round(studioBox.width * SCALE)} × ${Math.round(studioBox.height * SCALE)} on ${await timecode(studio)}`;
    await save('tier-studio', await studio.screenshot({ type: 'png', clip: studioBox }));
    await studio.context().close();

    const context = await browser.newContext({ viewport: { width: 1100, height: 1000 }, deviceScaleFactor: SCALE, colorScheme: 'dark' });
    const page = await context.newPage();
    await page.goto(`${base}/preview.html?tier=viewer#width=760`, { waitUntil: 'load' });
    await page.waitForFunction(() => document.querySelector('video')?.duration > 0, null, { timeout: 30000 });
    await page.waitForTimeout(1000);
    // The best rendition: pick it, play until it is on screen, pause.
    await page.click('.media-settings-button');
    await page.waitForTimeout(400);
    await page.locator('.media-menu-popup [role^=menuitem]', { hasText: 'Quality' }).first().click();
    await page.waitForTimeout(400);
    const radios = page.locator('[role=menuitemradio]:visible');
    const heights = (await radios.allTextContents()).map((text) => Number(/^(\d+)p/.exec(text.trim())?.[1]) || 0);
    const best = Math.max(...heights);
    await radios.nth(heights.indexOf(best)).click();
    await page.waitForTimeout(300);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    await page.keyboard.press('Escape');
    await page.focus('.media-skin');
    await page.keyboard.press('k');
    await page.waitForFunction((height) => document.querySelector('video').videoHeight === height, best, { timeout: 40000 });
    await page.keyboard.press('k');
    await page.waitForFunction(() => document.querySelector('video').paused, null, { timeout: 5000 });
    await page.keyboard.press('Home');
    await page.waitForFunction(() => !document.querySelector('video').seeking && document.querySelector('video').currentTime < 0.05, null, { timeout: 15000 });
    await page.waitForTimeout(400);
    await page.keyboard.press('ArrowRight');
    await page.waitForFunction(() => !document.querySelector('video').seeking && Math.abs(document.querySelector('video').currentTime - 5) < 0.05, null, { timeout: 15000 });
    await page.mouse.move(0, 0);
    await page.evaluate(() => document.activeElement instanceof HTMLElement && document.activeElement.blur());
    // Viewer's own seek indicator and status line leave on their own.
    await page.waitForTimeout(2500);
    const viewerBox = await box(page, '.media-skin');
    sizes.viewer = `${Math.round(viewerBox.width * SCALE)} × ${Math.round(viewerBox.height * SCALE)} at ${(await page.evaluate(() => document.querySelector('video').currentTime)).toFixed(3)} s`;
    await save('tier-viewer', await page.screenshot({ type: 'png', clip: viewerBox }));
    await context.close();
    notes.push(`tiers: Studio ${sizes.studio}; Viewer ${sizes.viewer}; compare the burned-in timecodes in the two images`);
  },
};

/* ---------- Run ---------- */

await mkdir(outDir, { recursive: true });
let failed = false;
for (const [name, shot] of Object.entries(SHOTS)) {
  if (only && only !== name) continue;
  try {
    await shot();
    console.log(`ok    ${name}`);
  } catch (error) {
    failed = true;
    console.log(`FAIL  ${name}: ${error.message}`);
  }
}
await browser.close();

console.log('\nFiles (apps/preview/public/shots/):');
for (const row of report) console.log(`  ${row.file.padEnd(20)} ${String(row.width).padStart(5)} × ${String(row.height).padEnd(5)} ${String(row.bytes).padStart(7)} bytes${row.bytes > 120_000 ? '   over 120 KB' : ''}`);
console.log('\nStates:');
for (const note of notes) console.log(`  ${note}`);
process.exitCode = failed ? 1 : 0;
