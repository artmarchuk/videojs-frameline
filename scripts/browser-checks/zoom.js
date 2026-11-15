// Browser check (step 7, zoom). Body of an async function; `page` is a Playwright page on
// http://localhost:4173/preview.html?tier=studio (npm run build; npx vite preview) or the public URL, 1440x900.
// Run it at device scale factor 1 and 2: 100% is a different scale on each.
// Checks: (1) a frame grabbed at 200% with a pan is the same image as one grabbed at Fit; (2) the guides overlay's box
// is transformed with the picture at 200%; (3) a 10 px drag on the zoomed picture pans and does not change the paused
// state, while a click still does; (4) Alt+arrows stop at the picture's edges; plus the Z cycle, the announcements and
// the menu's reading order.
const out = {};
await page.evaluate(() => localStorage.setItem('videojs-pro:v1', JSON.stringify({ v: 1, guides: ['title-safe', 'thirds'], crop: null, zones: null, timeDisplay: 'timecode' })));
await page.reload(); await page.waitForTimeout(3000);

// Every PNG the skin makes goes through canvas.toBlob: record its size and a checksum of its pixels.
await page.evaluate(() => {
  window.__grabs = [];
  const toBlob = HTMLCanvasElement.prototype.toBlob;
  HTMLCanvasElement.prototype.toBlob = function (...args) {
    const data = this.getContext('2d').getImageData(0, 0, this.width, this.height).data;
    let sum = 0;
    for (let i = 0; i < data.length; i += 4) sum = (sum + data[i] * 3 + data[i + 1] * 5 + data[i + 2] * 7 + (i % 8191)) % 2147483647;
    window.__grabs.push({ width: this.width, height: this.height, sum });
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
    variables: ['x', 'y', 'w', 'h'].map((name) => skin.style.getPropertyValue('--pro-picture-' + name)).join(' '),
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
const at200 = await state();
out.cycle = [at100.zoom, at200.zoom];
out.said = [at100.said, at200.said];
const ratio = await page.evaluate(() => devicePixelRatio);
const videoWidth = await page.evaluate(() => document.querySelector('video').videoWidth);
out.scale = { devicePixelRatio: ratio, videoWidth, at100: +(at100.video.width / fit.video.width).toFixed(4), expected100: +(videoWidth / fit.video.width / ratio).toFixed(4), at200: +(at200.video.width / fit.video.width).toFixed(4) };
out.scaleOk = same(at100.video.width * ratio, videoWidth) && same(at200.video.width * ratio, videoWidth * 2);
out.pixelated = at200.rendering === 'pixelated' && at100.rendering !== 'pixelated';

// (2) the guides' box transforms with the picture, and the picture rectangle still describes the unzoomed picture
out.guidesFollow = same(at200.guide.left, at200.video.left) && same(at200.guide.top, at200.video.top) && same(at200.guide.width, at200.video.width) && same(at200.guide.height, at200.video.height) && at200.guide.width > fit.guide.width * 1.5;
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

// (4) Alt+arrows stop at the edges
await page.evaluate(() => { const v = document.querySelector('video'); v.pause(); v.currentTime = 20; });
await page.waitForTimeout(1200);
await page.focus('.pro-skin');
const press = async (key, times) => { for (let i = 0; i < times; i++) await page.keyboard.press(key); await page.waitForTimeout(250); };
const start = await state();
await press('Alt+ArrowRight', 1);
const one = await state();
out.oneStepPx = +(start.video.left - one.video.left).toFixed(2);
out.oneStepIsTenth = same(out.oneStepPx, start.stage.width * 0.1);
await press('Alt+ArrowRight', 30); await press('Alt+ArrowDown', 30);
const far = await state();
await press('Alt+ArrowLeft', 30); await press('Alt+ArrowUp', 30);
const near = await state();
out.edges = { rightBottom: [far.video.right - far.stage.right, far.video.bottom - far.stage.bottom].map((n) => +n.toFixed(2)), leftTop: [near.video.left - near.stage.left, near.video.top - near.stage.top].map((n) => +n.toFixed(2)) };
out.edgesOk = out.edges.rightBottom.concat(out.edges.leftTop).every((n) => Math.abs(n) < 0.6);
out.arrowsDidNotSeek = same(near.time, start.time) || Math.abs(near.time - start.time) < 0.001;

// (1b) grab at 200%, panned into a corner: the same image as at Fit
await press('Alt+ArrowRight', 3);
await page.keyboard.press('g'); await page.waitForTimeout(800);
out.grabs = await page.evaluate(() => window.__grabs);
out.grabSame = out.grabs.length === 2 && out.grabs[0].sum === out.grabs[1].sum && out.grabs[0].width === videoWidthOf() && out.grabs[1].width === out.grabs[0].width;
function videoWidthOf() { return videoWidth; }

// Back to Fit: nothing is left behind
await page.keyboard.press('z'); await page.waitForTimeout(300);
const back = await state();
out.backToFit = back.zoom === 'fit' && back.transform === '' && back.said === 'Zoom fit' && same(back.video.width, fit.video.width);

// The menu: opens on the first item, Zoom comes after Platform zones, choosing keeps it open
await page.focus('[data-pro-menu="view"]'); await page.keyboard.press('Enter'); await page.waitForTimeout(500);
const current = () => page.evaluate(() => document.activeElement.textContent.trim().slice(0, 22));
out.menuOrder = [await current()];
for (let i = 0; i < 17; i++) { await page.keyboard.press('ArrowDown'); await page.waitForTimeout(50); out.menuOrder.push(await current()); }
out.menuFirst = out.menuOrder[0].startsWith('Title safe');
await page.focus('[data-zoom-item="100"]'); await page.keyboard.press('Enter'); await page.waitForTimeout(300);
out.menuChoice = await page.evaluate(() => ({ zoom: document.querySelector('.pro-skin').dataset.zoom, checked: document.querySelector('[data-zoom-item="100"]').getAttribute('aria-checked'), role: document.querySelector('[data-zoom-item="100"]').getAttribute('role'), open: document.querySelector('[data-pro-menu="view"]').getAttribute('aria-expanded'), text: document.querySelector('[data-zoom-item="100"]').textContent }));
await page.keyboard.press('Escape'); await page.waitForTimeout(300);
out.notRemembered = !(await page.evaluate(() => localStorage.getItem('videojs-pro:v1'))).includes('zoom');
await page.keyboard.press('z'); await page.keyboard.press('z'); await page.waitForTimeout(200);

out.pass = out.scaleOk && out.pixelated && out.guidesFollow && out.rectUnchanged && out.afterResize.rectIsUnzoomed && out.afterResize.stillCovers && out.dragOk && out.oneStepIsTenth && out.edgesOk && out.arrowsDidNotSeek && out.grabSame && out.backToFit && out.menuFirst && out.menuChoice.zoom === '100' && out.menuChoice.open === 'true' && out.notRemembered;
return out;
