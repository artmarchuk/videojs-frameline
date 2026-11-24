// Browser check: a set range confines playback in Studio. Body of an async function; `page` on
// /preview.html?tier=studio (local build or the public URL), 1440 wide. Loop is on from the start; a range of 10 to
// 14 s loops; play from outside the range or from the Out frame starts at In; Out set at a playing head sends it to
// In; a `0`–`9` seek to inside the range keeps playing and one to outside pauses there; with Loop off playback stops
// on the Out frame and the next play starts at In; clearing the range frees playback. Then, with the pointer: dragging
// the In handle past a playing head sends it to the new In; dragging the Out handle sets Out where it is dropped, also
// while playing. Returns what was observed; `out.pass` is the verdict.
// Pages, windows and options for the runner (`npm run check:browsers`): manifest.mjs.
const out = {};
await page.waitForFunction(() => document.querySelector('video')?.duration > 0, null, { timeout: 30000 });
await page.waitForTimeout(800);
const V = () => page.evaluate(() => {
  const v = document.querySelector('video'); const s = document.querySelector('.pro-skin');
  return { paused: v.paused, t: +v.currentTime.toFixed(2), loop: document.querySelector('[data-pro-tool="loop"]')?.getAttribute('aria-pressed') ?? null, range: s.querySelector('.pro-timeline')?.dataset.range ?? null };
});
const seek = (t) => page.evaluate((t) => new Promise((res) => { const v = document.querySelector('video'); v.addEventListener('seeked', () => setTimeout(res, 50), { once: true }); v.currentTime = t; }), t);
const play = () => page.evaluate(() => document.querySelector('video').play().catch(() => {}));
const pause = () => page.evaluate(() => document.querySelector('video').pause());
const inside = (s, lo, hi) => !s.paused && s.t >= lo && s.t < hi;
out.duration = await page.evaluate(() => document.querySelector('video').duration);
out.loopOnAtStart = (await V()).loop === 'true';
await page.focus('.media-play-button:not(.pro-center-play)');
// A range of 10 to 14 s, by I and O.
await pause(); await seek(10); await page.keyboard.press('i'); await page.waitForTimeout(200);
await seek(14); await page.keyboard.press('o'); await page.waitForTimeout(200);
out.range = (await V()).range;
// Playing inside the range: it loops at Out.
await seek(12); await play(); await page.waitForTimeout(400);
out.loopSamples = []; for (let i = 0; i < 12; i++) { await page.waitForTimeout(500); out.loopSamples.push((await V()).t); }
out.loops = out.loopSamples.every((t) => t >= 9.5 && t < 14.6) && out.loopSamples.some((t, i) => i > 0 && t < out.loopSamples[i - 1]);
// Play from outside the range, and from the Out frame: it starts at In.
await pause(); await seek(40); await play(); await page.waitForTimeout(800); out.fromOutside = await V();
await pause(); await seek(14); await play(); await page.waitForTimeout(800); out.fromOut = await V();
// Out set at a playing head counts as reaching Out: back to In, still playing.
await pause(); await seek(11); await play(); await page.waitForTimeout(500); await page.keyboard.press('o'); await page.waitForTimeout(800);
out.outAtPlayhead = await V();
await pause(); await seek(14); await page.keyboard.press('o'); await page.waitForTimeout(200); // Out back to 14
// A seek by key: `1` (10%) lands inside the range and keeps playing; `9` (90%) lands outside and pauses there.
// The digit key whose jump (digit × 10% of the duration) lands inside the 10 to 14 s range: 1 on a 111 s source, 2 on 56 s.
const digit = String(Math.min(9, Math.max(1, Math.round(120 / (await page.evaluate(() => document.querySelector('video').duration))))));
await seek(11); await play(); await page.waitForTimeout(400); await page.keyboard.press(digit); await page.waitForTimeout(800); out.seekInside = await V();
await page.keyboard.press('9'); await page.waitForTimeout(1000); out.seekOutside = await V();
// Loop off: playback stops on the Out frame; the next play starts at In.
await pause(); await page.keyboard.press('r'); await page.waitForTimeout(200); out.loopOff = (await V()).loop === 'false';
await seek(13); await play(); await page.waitForTimeout(2500); out.stopAtOut = await V();
await play(); await page.waitForTimeout(800); out.fromOutLoopOff = await V();
// Clearing the range frees playback; Loop stays off.
await pause(); await page.keyboard.press('Shift+i'); await page.keyboard.press('Shift+o'); await page.waitForTimeout(200);
await seek(13); await play(); await page.waitForTimeout(2500); out.cleared = await V();
await pause(); await page.keyboard.press('r'); await page.waitForTimeout(200); out.loopBackOn = (await V()).loop === 'true';
// Handle drags with the pointer, while playing.
const handles = () => page.evaluate(() => [...document.querySelectorAll('.pro-tl-handle')].map((e) => e.getAttribute('aria-valuenow') === null ? null : +(+e.getAttribute('aria-valuenow')).toFixed(1)));
const dragHandle = async (which, toTime) => {
  const handle = await page.locator(`.pro-tl-handle[data-handle="${which}"]`).boundingBox();
  const track = await page.locator('.pro-tl').boundingBox();
  const x0 = handle.x + handle.width / 2, y = handle.y + handle.height / 2;
  const x1 = track.x + (track.width * toTime) / out.duration;
  await page.mouse.move(x0, y); await page.mouse.down();
  for (let i = 1; i <= 12; i++) { await page.mouse.move(x0 + ((x1 - x0) * i) / 12, y); await page.waitForTimeout(20); }
  await page.mouse.up(); await page.waitForTimeout(800);
};
await seek(5); await play(); await page.waitForTimeout(300);
await dragHandle('in', 30); out.dragInPastHead = { ...(await V()), handles: await handles() };
await dragHandle('out', 45); out.dragOut = { ...(await V()), handles: await handles() };
await page.waitForTimeout(500); out.dragOutLater = { ...(await V()), handles: await handles() };
await pause();
const near = (a, b) => a !== null && Math.abs(a - b) < 1.5;
const outFrame = 14 + 0.5 / 30;
out.pass = out.loopOnAtStart && out.range === 'set' && out.loops
  && inside(out.fromOutside, 10, 12) && inside(out.fromOut, 10, 12) && inside(out.outAtPlayhead, 10, 11.6)
  && inside(out.seekInside, 11, 13.5) && out.seekOutside.paused && out.seekOutside.t >= 0.9 * out.duration - 0.2
  && out.loopOff && out.stopAtOut.paused && Math.abs(out.stopAtOut.t - outFrame) < 0.07 && inside(out.fromOutLoopOff, 10, 12)
  && out.cleared.range === 'none' && !out.cleared.paused && out.cleared.t > 14.6 && out.loopBackOn
  && near(out.dragInPastHead.handles[0], 30) && inside(out.dragInPastHead, 29.5, 32)
  && near(out.dragOut.handles[1], 45) && near(out.dragOutLater.handles[1], 45) && inside(out.dragOutLater, 29.5, 45);
return out;
