// Browser check: row one of the narrow dock, and the playhead's priority over a range handle that overlaps it.
// Body of an async function; `page` on /preview.html?tier=studio (local build or the public URL). Run it in touch
// contexts (hasTouch, isMobile) at windows of 430, 390, 375, 360, 352, 340 and 320 px, where the page's 16px margins
// make the player 398 to 288 px wide, and once with a mouse at 1440x900.
// Row one: the timecode, then previous cut, step back, Play, step forward, next cut, as on the wide dock; the four
// tool buttons are 44px wide where the row has room and shrink to 36px (always 44px tall); under a 324px player the
// cut buttons fold away. Nothing passes the bar's content box, and the page does not scroll sideways.
// Playhead: with In set at the playhead (`I`), a press within 22px of the playhead on touch (10px with a mouse),
// inside the In handle's target, drags the playhead and leaves In alone; a press further out drags the handle; a
// double click on the overlap does not unset In. Returns the measurements; `pass` sums it up.
// Pages, windows and options for the runner (`npm run check:browsers`): manifest.mjs.
await page.waitForFunction(() => document.querySelector('video')?.duration > 0, null, { timeout: 30000 });
await page.waitForSelector('.pro-tl'); await page.waitForTimeout(800);
const out = {};
const shown = (el) => el.getClientRects().length > 0;

out.row = await page.evaluate(() => {
  const r = (el) => { const b = el.getBoundingClientRect(); return { l: +b.left.toFixed(2), r: +b.right.toFixed(2), w: +b.width.toFixed(2), h: +b.height.toFixed(2) }; };
  const shown = (el) => el.getClientRects().length > 0;
  const skin = document.querySelector('.pro-skin');
  const bar = document.querySelector('.pro-bar');
  const cs = getComputedStyle(bar);
  const b = bar.getBoundingClientRect();
  const content = { l: b.left + parseFloat(cs.paddingLeft), r: b.right - parseFloat(cs.paddingRight) };
  const one = [document.querySelector('.pro-timecode'), ...document.querySelectorAll('.pro-transport .pro-tool, .pro-transport > .media-play-button')].filter(Boolean).filter(shown).map((e) => ({ name: e.getAttribute('aria-label')?.split('.')[0] ?? 'timecode', ...r(e) }));
  const two = [...document.querySelectorAll('.pro-main-right .media-button')].filter(shown).map((e) => r(e));
  const all = [...one, ...two];
  return {
    player: +r(skin).w.toFixed(2),
    narrow: skin.dataset.dockSize === 'narrow',
    order: one.map((i) => i.name),
    toolWidths: one.filter((i) => /cut|frame/.test(i.name)).map((i) => i.w),
    heights: [...new Set(all.map((i) => i.h))],
    overflow: +(Math.max(...all.map((i) => i.r)) - content.r).toFixed(2),
    underflow: +(content.l - Math.min(...all.map((i) => i.l))).toFixed(2),
    pageOverflow: document.documentElement.scrollWidth - innerWidth,
  };
});
const full = ['timecode', 'Previous cut', 'Step back one frame', 'Play', 'Step forward one frame', 'Next cut'];
const folded = ['timecode', 'Step back one frame', 'Play', 'Step forward one frame'];
const expectFull = out.row.player >= 324;
out.row.pass = out.row.narrow
  ? JSON.stringify(out.row.order) === JSON.stringify(expectFull ? full : folded) && out.row.toolWidths.every((w) => w >= 36 - 0.01 && w <= 44 + 0.01) && out.row.heights.every((h) => h >= 44) && out.row.overflow <= 0.01 && out.row.underflow <= 0.01 && out.row.pageOverflow === 0
  : JSON.stringify(out.row.order) === JSON.stringify(full) && out.row.overflow <= 0.01;

// The playhead over the In handle.
const touch = await page.evaluate(() => matchMedia('(pointer: coarse)').matches);
const state = () => page.evaluate(() => {
  const c = (el) => { const b = el.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2, l: b.left, r: b.right }; };
  const v = document.querySelector('video');
  const h = document.querySelector('.pro-tl-handle[data-handle="in"]');
  return { time: +v.currentTime.toFixed(3), in: Number(h.getAttribute('aria-valuenow')), playhead: c(document.querySelector('.pro-tl-playhead')), handle: c(h), track: c(document.querySelector('.pro-tl-track')) };
});
const seek = async (t) => {
  await page.evaluate((time) => { document.querySelector('video').currentTime = time; }, t);
  await page.waitForFunction((time) => { const v = document.querySelector('video'); return !v.seeking && Math.abs(v.currentTime - time) < 0.1; }, t);
  await page.waitForTimeout(350);
};
let drag;
// A touch drag. The playhead (the Video.js slider) and the range handles listen to pointer events only, and both
// capture the pointer on `pointerdown`. Chromium gets a real touch through its DevTools protocol, so the browser makes
// the pointer events itself. Firefox and WebKit have no such call, and Playwright's touchscreen can only tap, so there
// the check dispatches the pointer events of a touch (`pointerType: 'touch'`) at the element under the point. A
// dispatched pointer has no id the browser knows, so `setPointerCapture` would throw: for that one id the check
// stands in for the capture, and sends the rest of the drag to the element that captured it, as a browser does.
const cdp = touch ? await page.context().newCDPSession(page).catch(() => null) : null;
out.touchDrag = !touch ? null : cdp ? 'a real touch (DevTools protocol)' : 'dispatched pointer events';
if (cdp) {
  drag = async (x, y, dx) => {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    for (let i = 1; i <= 8; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + (dx * i) / 8, y }] }); await page.waitForTimeout(30); }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await page.waitForTimeout(400);
  };
} else if (touch) {
  await page.evaluate(() => {
    const ID = 4321;
    let captured = null;
    const { setPointerCapture, releasePointerCapture, hasPointerCapture } = Element.prototype;
    const event = (type, x, y) => new PointerEvent(type, { pointerId: ID, pointerType: 'touch', isPrimary: true, bubbles: true, cancelable: true, composed: true, clientX: x, clientY: y, button: type === 'pointermove' ? -1 : 0, buttons: type === 'pointerup' || type === 'lostpointercapture' ? 0 : 1, width: 23, height: 23, pressure: type === 'pointerup' ? 0 : 0.5 });
    const release = (x, y) => { const element = captured; captured = null; element?.dispatchEvent(event('lostpointercapture', x, y)); };
    Element.prototype.setPointerCapture = function (id) { if (id !== ID) return setPointerCapture.call(this, id); captured = this; };
    Element.prototype.releasePointerCapture = function (id) { if (id !== ID) return releasePointerCapture.call(this, id); if (captured === this) release(0, 0); };
    Element.prototype.hasPointerCapture = function (id) { return id === ID ? captured === this : hasPointerCapture.call(this, id); };
    window.__touch = (type, x, y) => {
      (captured ?? document.elementFromPoint(x, y)).dispatchEvent(event(type, x, y));
      // A browser releases a touch's capture when the finger lifts.
      if (type === 'pointerup') release(x, y);
    };
  });
  const send = (type, x, y) => page.evaluate(([type, x, y]) => window.__touch(type, x, y), [type, x, y]);
  drag = async (x, y, dx) => {
    await send('pointerdown', x, y);
    for (let i = 1; i <= 8; i++) { await send('pointermove', x + (dx * i) / 8, y); await page.waitForTimeout(30); }
    await send('pointerup', x + dx, y);
    await page.waitForTimeout(400);
  };
} else {
  drag = async (x, y, dx) => {
    await page.mouse.move(x, y); await page.mouse.down();
    for (let i = 1; i <= 8; i++) { await page.mouse.move(x + (dx * i) / 8, y); await page.waitForTimeout(20); }
    await page.mouse.up(); await page.waitForTimeout(400);
  };
}
const start = Math.min(10, (await page.evaluate(() => document.querySelector('video').duration)) / 3);
await seek(start);
await page.focus('.pro-skin .pro-transport .media-play-button');
await page.keyboard.press('i');
await page.waitForTimeout(400);
const before = await state();
const near = touch ? 8 : 6; // inside the handle's target, within the playhead's grab width
const far = touch ? 30 : 16; // inside the handle's target, outside the playhead's grab width
await drag(before.playhead.x - near, before.track.y, 60);
const afterPlayhead = await state();
await drag(before.playhead.x - far, before.track.y, -40);
const afterHandle = await state();
let afterDoubleClick = null;
if (!touch) {
  await seek(afterHandle.in);
  const s = await state();
  await page.mouse.dblclick(s.playhead.x - near, s.track.y);
  await page.waitForTimeout(300);
  afterDoubleClick = await state();
}
out.playhead = {
  touch,
  handleCoveredPlayhead: before.handle.l <= before.playhead.x - near && before.playhead.x - near <= before.handle.r,
  before: { time: before.time, in: before.in },
  afterPlayhead: { time: afterPlayhead.time, in: afterPlayhead.in },
  afterHandle: { time: afterHandle.time, in: afterHandle.in },
  afterDoubleClick: afterDoubleClick && { time: afterDoubleClick.time, in: afterDoubleClick.in },
};
out.playhead.pass =
  out.playhead.handleCoveredPlayhead &&
  afterPlayhead.time > before.time + 1 && afterPlayhead.in === before.in &&
  afterHandle.in < before.in && Math.abs(afterHandle.time - afterPlayhead.time) < 0.05 &&
  (afterDoubleClick === null || afterDoubleClick.in === afterHandle.in);
out.pass = out.row.pass && out.playhead.pass;
return out;
