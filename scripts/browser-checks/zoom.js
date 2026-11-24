// Browser check (step 7 and 7b, zoom). Body of an async function; `page` is a Playwright page on
// http://localhost:4173/preview.html?tier=studio (npm run build; npx vite preview) or the public URL, 1440x900.
// Run it at device scale factor 1 and 2: 100% is a different scale on each. Add `&media=cosmicDawn`: on the reel the
// monitor covers the file's black rows (`picture` in media.ts), so the picture is larger than the video element's box
// and (2) and the pan-edge checks, which compare the two, do not apply.
// Checks: (1) a frame grabbed at 200% with a pan is the same image as one grabbed at Fit; (2) the guides overlay's box
// is transformed with the picture at 200%; (3) a 10 px drag on the zoomed picture pans and does not change the paused
// state, while a click still does; (4) Shift+Alt+arrows stop at the picture's edges; plus the Z and Shift+Z cycle over
// five levels, the announcements, the Zoom button and its menu, Alt+arrow on the seek slider (not ours: it seeks as
// before zoom existed), and the Guides menu's reading order.
// Pages, windows and options for the runner (`npm run check:browsers`): manifest.mjs.
const out = {};
await page.evaluate(() => localStorage.setItem('frameline:v1', JSON.stringify({ v: 1, guides: ['title-safe', 'thirds'], crop: null, zones: null, timeDisplay: 'timecode' })));
await page.reload(); await page.waitForTimeout(3000);

// Every PNG the skin makes goes through canvas.toBlob: record its size and a checksum of its pixels.
await page.evaluate(() => {
  window.__grabs = [];
  window.__grabPixels = [];
  const toBlob = HTMLCanvasElement.prototype.toBlob;
  HTMLCanvasElement.prototype.toBlob = function (...args) {
    const data = this.getContext('2d').getImageData(0, 0, this.width, this.height).data;
    let sum = 0;
    for (let i = 0; i < data.length; i += 4) sum = (sum + data[i] * 3 + data[i + 1] * 5 + data[i + 2] * 7 + (i % 8191)) % 2147483647;
    window.__grabs.push({ width: this.width, height: this.height, sum });
    window.__grabPixels.push(data);
    return toBlob.apply(this, args);
  };
  // No file is wanted from the check.
  HTMLAnchorElement.prototype.click = function () {};
});

const state = () => page.evaluate(() => {
  const skin = document.querySelector('.pro-skin'), wrapper = document.querySelector('.pro-picture'), video = document.querySelector('video');
  const box = (element) => { const b = element.getBoundingClientRect(); return { left: +b.left.toFixed(2), top: +b.top.toFixed(2), right: +b.right.toFixed(2), bottom: +b.bottom.toFixed(2), width: +b.width.toFixed(2), height: +b.height.toFixed(2) }; };
  return {
    zoom: skin.dataset.zoom ?? 'fit', transform: wrapper.style.transform, paused: video.paused, time: video.currentTime,
    stage: box(document.querySelector('.pro-stage')), video: box(video), overlay: box(document.querySelector('.pro-overlay')),
    guide: box(document.querySelector('[data-guide="thirds"]')), rendering: getComputedStyle(video).imageRendering,
    said: document.querySelector('.media-status-announcer[role=status]')?.textContent ?? '',
    variables: ['x', 'y', 'w', 'h'].map((name) => skin.style.getPropertyValue('--fl-picture-' + name)).join(' '),
  };
});
const same = (a, b) => Math.abs(a - b) < 0.6;
const stageMid = async () => { const s = (await state()).stage; return { x: s.left + s.width / 2, y: s.top + s.height / 2 }; };

await page.evaluate(() => { const v = document.querySelector('video'); v.pause(); v.currentTime = 20; });
await page.waitForTimeout(1500);
await page.focus('.pro-skin');
const fit = await state();
out.fit = { transform: fit.transform, rendering: fit.rendering, overlayOnPicture: same(fit.overlay.width, fit.video.width) };

// (1a) grab at Fit
await page.keyboard.press('g'); await page.waitForTimeout(800);

// Z cycle and announcements
await page.keyboard.press('z'); await page.waitForTimeout(300);
const at100 = await state();
await page.keyboard.press('z'); await page.waitForTimeout(300);
const at150 = await state();
await page.keyboard.press('z'); await page.waitForTimeout(300);
const at200 = await state();
await page.keyboard.press('z'); await page.waitForTimeout(300);
const at400 = await state();
await page.keyboard.press('Shift+z'); await page.waitForTimeout(300);
const backTo200 = await state();
out.cycle = [at100.zoom, at150.zoom, at200.zoom, at400.zoom, backTo200.zoom];
out.cycleOk = out.cycle.join() === '100,150,200,400,200';
out.said = [at100.said, at150.said, at200.said, at400.said];
const ratio = await page.evaluate(() => devicePixelRatio);
const videoWidth = await page.evaluate(() => document.querySelector('video').videoWidth);
// Step 8.0: 100% is one pixel of the source (the best rendition on offer) per device pixel, not of the playing one.
// The rendition list is not on the DOM; the Quality menu's items ("2160p", "1080p"…) are.
await page.click('.media-settings-button'); await page.waitForTimeout(400);
await page.locator('.media-menu-popup:not(.pro-menu-popup) [role^=menuitem]', { hasText: 'Quality' }).first().click(); await page.waitForTimeout(400);
const sourceWidth = await page.evaluate(() => {
  const video = document.querySelector('video');
  const heights = [...document.querySelectorAll('[role=menuitemradio]')].map((item) => Number(/^(\d+)p/.exec(item.textContent.trim())?.[1])).filter(Boolean);
  return heights.length ? Math.round((Math.max(...heights) * video.videoWidth) / video.videoHeight) : video.videoWidth;
});
await page.keyboard.press('Escape'); await page.waitForTimeout(300); await page.keyboard.press('Escape'); await page.waitForTimeout(300);
await page.focus('.pro-skin');
out.scale = { devicePixelRatio: ratio, videoWidth, sourceWidth, at100: +(at100.video.width / fit.video.width).toFixed(4), expected100: +(sourceWidth / fit.video.width / ratio).toFixed(4), at150: +(at150.video.width / fit.video.width).toFixed(4), at200: +(at200.video.width / fit.video.width).toFixed(4), at400: +(at400.video.width / fit.video.width).toFixed(4) };
out.scaleOk = same(at100.video.width * ratio, sourceWidth) && same(at150.video.width * ratio, sourceWidth * 1.5) && same(at200.video.width * ratio, sourceWidth * 2) && same(at400.video.width * ratio, sourceWidth * 4);
out.pixelated = at200.rendering === 'pixelated' && at400.rendering === 'pixelated' && at100.rendering !== 'pixelated' && at150.rendering !== 'pixelated';

// (2) the guides' box transforms with the picture, and the picture rectangle still describes the unzoomed picture
out.guidesFollow = same(at200.guide.left, at200.video.left) && same(at200.guide.top, at200.video.top) && same(at200.guide.width, at200.video.width) && same(at200.guide.height, at200.video.height) && at200.guide.width > fit.guide.width * 1.2; // 200% is 1.5 × Fit for a 1080p source at device scale 2, 3 × for 4K
out.rectUnchanged = at200.variables === fit.variables;
await page.setViewportSize({ width: 1300, height: 900 }); await page.waitForTimeout(500);
const resized = await state();
out.afterResize = { variables: resized.variables, stageWidth: resized.stage.width, rectIsUnzoomed: Math.abs(parseFloat(resized.variables.split(' ')[2]) - resized.stage.width) < 1, stillCovers: resized.video.left <= resized.stage.left + 0.6 && resized.video.right >= resized.stage.right - 0.6 };
await page.setViewportSize({ width: 1440, height: 900 }); await page.waitForTimeout(500);

// (3) a 10 px drag pans and leaves the paused state alone, paused and playing; a click still toggles
const mid = await stageMid();
const drag = async (dx, dy) => { await page.mouse.move(mid.x, mid.y); await page.mouse.down(); await page.mouse.move(mid.x + dx, mid.y + dy, { steps: 4 }); await page.mouse.up(); await page.waitForTimeout(500); };
let before = await state();
await drag(10, 0);
let after = await state();
out.dragPaused = { pausedBefore: before.paused, pausedAfter: after.paused, movedPx: +(after.video.left - before.video.left).toFixed(2) };
await page.keyboard.press('k'); await page.waitForTimeout(700);
before = await state();
await drag(-10, 6);
after = await state();
out.dragPlaying = { pausedBefore: before.paused, pausedAfter: after.paused, movedPx: +(after.video.left - before.video.left).toFixed(2) };
// two quick drags are not a double click (fullscreen)
await page.evaluate(() => { window.__fs = 0; Element.prototype.requestFullscreen = function () { window.__fs += 1; return Promise.resolve(); }; });
await drag(8, 0); await drag(-8, 0); await page.waitForTimeout(400);
out.dragsNoFullscreen = (await page.evaluate(() => window.__fs)) === 0 && !(await state()).paused;
await page.mouse.click(mid.x, mid.y); await page.waitForTimeout(700);
out.clickStillPauses = (await state()).paused;
out.dragOk = out.dragPaused.pausedBefore === out.dragPaused.pausedAfter && same(out.dragPaused.movedPx, 10) && out.dragPlaying.pausedBefore === false && out.dragPlaying.pausedAfter === false && same(out.dragPlaying.movedPx, -10) && out.dragsNoFullscreen && out.clickStillPauses;
out.cursor = await page.evaluate(() => getComputedStyle(document.querySelector('.pro-picture')).cursor);

// (4) Shift+Alt+arrows stop at the edges
await page.evaluate(() => { const v = document.querySelector('video'); v.pause(); v.currentTime = 20; });
await page.waitForTimeout(1200);
await page.focus('.pro-skin');
const press = async (key, times) => { for (let i = 0; i < times; i++) await page.keyboard.press(key); await page.waitForTimeout(250); };
const start = await state();
await press('Shift+Alt+ArrowRight', 1);
const one = await state();
out.oneStepPx = +(start.video.left - one.video.left).toFixed(2);
out.oneStepIsTenth = same(out.oneStepPx, start.stage.width * 0.1);
await press('Shift+Alt+ArrowRight', 130); await press('Shift+Alt+ArrowDown', 130);
const far = await state();
await press('Shift+Alt+ArrowLeft', 130); await press('Shift+Alt+ArrowUp', 130);
const near = await state();
out.edges = { rightBottom: [far.video.right - far.stage.right, far.video.bottom - far.stage.bottom].map((n) => +n.toFixed(2)), leftTop: [near.video.left - near.stage.left, near.video.top - near.stage.top].map((n) => +n.toFixed(2)) };
out.edgesOk = out.edges.rightBottom.concat(out.edges.leftTop).every((n) => Math.abs(n) < 0.6);
out.arrowsDidNotSeek = same(near.time, start.time) || Math.abs(near.time - start.time) < 0.001;

// (1b) grab at 200%, panned into a corner: the same image as at Fit
await press('Shift+Alt+ArrowRight', 3);
await page.keyboard.press('g'); await page.waitForTimeout(800);
out.grabs = await page.evaluate(() => window.__grabs);
// The two grabs are only the same image when they come from the same rendition, and under Auto the rendition can
// change between them (seen on a CI runner: 1080p at the first grab, 2160p at the second). Then the zoomed grab is
// compared with a new grab at Fit, taken right after it: 200% -> 400% -> Fit, grab, and back to 200%.
out.grabRenditionChanged = out.grabs.length === 2 && out.grabs[0].width !== out.grabs[1].width;
if (out.grabRenditionChanged) {
  await page.keyboard.press('z'); await page.keyboard.press('z'); await page.waitForTimeout(400);
  await page.keyboard.press('g'); await page.waitForTimeout(800);
  await page.keyboard.press('Shift+z'); await page.keyboard.press('Shift+z'); await page.waitForTimeout(400);
  out.grabs = await page.evaluate(() => window.__grabs);
}
const pair = out.grabs.slice(-2);
const grabbedWidth = out.grabs.length === 2 ? videoWidthOf() : await page.evaluate(() => document.querySelector('video').videoWidth);
// How far the two images are apart: the number of pixels that differ and the largest difference in one channel.
out.grabDifference = await page.evaluate(() => {
  const [a, b] = window.__grabPixels.slice(-2);
  if (!a || !b || a.length !== b.length) return null;
  let pixels = 0, most = 0;
  for (let i = 0; i < a.length; i += 4) {
    const d = Math.max(Math.abs(a[i] - b[i]), Math.abs(a[i + 1] - b[i + 1]), Math.abs(a[i + 2] - b[i + 2]), Math.abs(a[i + 3] - b[i + 3]));
    if (d) { pixels += 1; most = Math.max(most, d); }
  }
  return { pixels, most, of: a.length / 4 };
});
// WebKit only: the two images may differ by one level per channel. The first frame WebKit draws to a canvas after the
// browser starts is converted to RGB a little differently from every later one: on 24 Nov 2026, with nothing between
// two draws of the same paused frame (no seek, no zoom), 10.2% of the pixels, spread over the whole frame, differed by
// exactly 1, and every later draw matched the second. That is the engine's rounding, not the picture: a grab that
// took the wrong frame, crop or scale differs by far more than 1. The other engines must match exactly.
const tolerance = page.context().browser().browserType().name() === 'webkit' ? 1 : 0;
out.grabSame = pair.length === 2 && pair[0].width === grabbedWidth && pair[1].width === pair[0].width && pair[1].height === pair[0].height
  && (pair[0].sum === pair[1].sum || (out.grabDifference !== null && out.grabDifference.most <= tolerance));
function videoWidthOf() { return videoWidth; }

// Alt+arrows are not ours any more: with no focus on the slider nothing moves; on the seek slider Alt+→ is the stock
// slider's key again (it moved the playhead before step 7), and Shift+Alt+→ there pans.
const beforeAlt = await state();
await press('Alt+ArrowLeft', 2);
const afterAlt = await state();
out.altAloneDoesNotPan = same(beforeAlt.video.left, afterAlt.video.left) && Math.abs(beforeAlt.time - afterAlt.time) < 0.001;
await page.focus('[role=slider][aria-label="Seek"]').catch(() => {});
out.sliderFocused = await page.evaluate(() => document.activeElement.getAttribute('role') === 'slider');
await press('Alt+ArrowRight', 1); await page.waitForTimeout(500);
const afterSliderAlt = await state();
out.sliderAlt = { seekedBy: +(afterSliderAlt.time - afterAlt.time).toFixed(3), panned: !same(afterSliderAlt.video.left, afterAlt.video.left) };
await press('Shift+Alt+ArrowLeft', 1);
const afterSliderPan = await state();
out.sliderShiftAlt = { seekedBy: +(afterSliderPan.time - afterSliderAlt.time).toFixed(3), pannedPx: +(afterSliderPan.video.left - afterSliderAlt.video.left).toFixed(1) };
out.sliderOk = out.sliderFocused && out.sliderAlt.seekedBy > 0 && !out.sliderAlt.panned && out.sliderShiftAlt.seekedBy === 0 && out.sliderShiftAlt.pannedPx > 0;
await page.focus('.pro-skin');

// Back to Fit: nothing is left behind (200% -> 400% -> Fit)
await page.keyboard.press('z'); await page.keyboard.press('z'); await page.waitForTimeout(300);
const back = await state();
out.backToFit = back.zoom === 'fit' && back.transform === '' && back.said === 'Zoom fit' && same(back.video.width, fit.video.width);
await page.keyboard.press('Shift+z'); await page.waitForTimeout(200);
out.shiftZFromFit = (await state()).zoom;
await page.keyboard.press('z'); await page.waitForTimeout(200);

// The Guides menu: opens on the first item, reading order, no Zoom group in it
await page.focus('[data-pro-menu="guides"]'); await page.keyboard.press('Enter'); await page.waitForTimeout(500);
const current = () => page.evaluate(() => document.activeElement.textContent.trim().slice(0, 22));
out.guidesOrder = [await current()];
for (let i = 0; i < 14; i++) { await page.keyboard.press('ArrowDown'); await page.waitForTimeout(50); out.guidesOrder.push(await current()); }
out.guidesOk = out.guidesOrder[0].startsWith('Title safe') && out.guidesOrder[14].startsWith('Hide guides') && !out.guidesOrder.some((text) => /^(Fit|\d+%)/.test(text));
await page.keyboard.press('Escape'); await page.waitForTimeout(300);

// The Zoom button and its menu
const button = () => page.evaluate(() => { const b = document.querySelector('[data-pro-menu="zoom"]'); const r = b.getBoundingClientRect(); return { text: b.textContent, name: b.getAttribute('aria-label'), on: b.hasAttribute('data-pressed'), width: +r.width.toFixed(1), height: +r.height.toFixed(1), left: +r.left.toFixed(1), numerals: getComputedStyle(b).fontVariantNumeric, expanded: b.getAttribute('aria-expanded') }; });
out.buttonFit = await button();
await page.focus('[data-pro-menu="zoom"]'); await page.keyboard.press('Enter'); await page.waitForTimeout(500);
out.zoomMenu = await page.evaluate(() => ({ items: [...document.querySelectorAll('.pro-zoom-popup [role=menuitemradio]')].map((e) => e.textContent + (e.getAttribute('aria-checked') === 'true' ? '*' : '')), help: document.querySelector('.pro-zoom-popup .pro-menu-note').textContent, focus: document.activeElement.textContent }));
await page.focus('[data-zoom-item="400"]'); await page.keyboard.press('Enter'); await page.waitForTimeout(500);
out.button400 = await button();
out.focusBack = await page.evaluate(() => document.activeElement.getAttribute('data-pro-menu'));
const neighbour = () => page.evaluate(() => +document.querySelector('.media-settings-button').getBoundingClientRect().left.toFixed(1));
const settingsAt400 = await neighbour();
await page.focus('.pro-skin'); await page.keyboard.press('z'); await page.waitForTimeout(300);
out.rowDoesNotShift = out.buttonFit.width === out.button400.width && out.buttonFit.left === out.button400.left && settingsAt400 === (await neighbour());
out.buttonOk = out.buttonFit.text === 'Fit' && out.buttonFit.name === 'Zoom, Fit' && !out.buttonFit.on && out.button400.text === '400%' && out.button400.name === 'Zoom, 400%' && out.button400.on && out.focusBack === 'zoom' && out.zoomMenu.items.map((text) => text.replace(/showing.*/, '').replace('*', '')).join() === 'Fit,100%,150%,200%,400%' && out.zoomMenu.help.includes('Shift+Alt') && out.buttonFit.numerals.includes('tabular-nums') && out.rowDoesNotShift;
out.notRemembered = !(await page.evaluate(() => localStorage.getItem('frameline:v1'))).includes('zoom');

out.pass = out.cycleOk && out.scaleOk && out.pixelated && out.guidesFollow && out.rectUnchanged && out.afterResize.rectIsUnzoomed && out.afterResize.stillCovers && out.dragOk && out.oneStepIsTenth && out.edgesOk && out.arrowsDidNotSeek && out.grabSame && out.altAloneDoesNotPan && out.sliderOk && out.backToFit && out.shiftZFromFit === '400' && out.guidesOk && out.buttonOk && out.notRemembered;
return out;
