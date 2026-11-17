// Browser check: the Viewer gate (step 2, re-run every step; written down in step 9). Body of an async function;
// `page` on /preview.html?tier=viewer or /?tier=viewer, at 1440x900 and at 320 wide. Keyboard only: tab order,
// the YouTube key map (Space also with focus on the seek bar), the free pro keys do nothing, the help dialog, 24px targets, no horizontal overflow, and
// no pro chunk (runtime, studio, debug) requested. Returns the observed values; `out.pass` is the verdict.
const out = {};
await page.waitForFunction(() => document.querySelector('video')?.duration > 0, null, { timeout: 30000 });
await page.waitForTimeout(800);
const V = () => page.evaluate(() => {
  const v = document.querySelector('video');
  const tracks = [...v.textTracks].filter((t) => t.kind === 'subtitles' || t.kind === 'captions');
  return { paused: v.paused, t: +v.currentTime.toFixed(2), muted: v.muted, volume: +v.volume.toFixed(2), captions: tracks.some((t) => t.mode === 'showing'), d: v.duration };
});
const focusLabel = () => page.evaluate(() => { const a = document.activeElement; return a?.getAttribute('aria-label') ?? (a?.closest('.media-skin') ? a.className.toString() : a?.tagName); });
// Tab order: from the body, through the skin, until focus leaves it.
await page.evaluate(() => { document.activeElement?.blur(); window.scrollTo(0, 0); });
out.tabOrder = [];
for (let i = 0; i < 14; i++) {
  await page.keyboard.press('Tab'); await page.waitForTimeout(80);
  const inSkin = await page.evaluate(() => !!document.activeElement?.closest('.media-skin'));
  if (!inSkin) { if (out.tabOrder.length) break; else continue; }
  out.tabOrder.push((await focusLabel()).replace(/,.*$/, ''));
}
// Keys, with focus on the Play button.
await page.focus('.media-control-bar .media-play-button, .media-controls .media-play-button, .media-play-button:not(.pro-center-play)');
const press = async (k, wait = 400) => { await page.keyboard.press(k); await page.waitForTimeout(wait); return V(); };
const start = await V();
out.k = (await press('k', 700)).paused === false; // plays
out.space = (await press('Space')).paused === true; // pauses
await page.evaluate(() => { document.querySelector('video').currentTime = 20; }); await page.waitForTimeout(400);
out.right5 = Math.abs((await press('ArrowRight')).t - 25) < 1.2;
out.left5 = Math.abs((await press('ArrowLeft')).t - 20) < 1.2;
out.l10 = Math.abs((await press('l')).t - 30) < 1.2;
out.j10 = Math.abs((await press('j')).t - 20) < 1.2;
out.five = Math.abs((await press('5')).t - start.d / 2) < 1.2;
out.home = (await press('Home')).t < 1;
out.m = (await press('m')).muted === true; await press('m');
const volBefore = (await V()).volume; out.down = (await press('ArrowDown')).volume < volBefore;
// `C` needs a captions track; a source without one (the reel) reports 'no captions track' and does not fail the gate.
out.c = (await page.evaluate(() => [...document.querySelector('video').textTracks].some((t) => t.kind === 'captions' || t.kind === 'subtitles')))
  ? (await press('c', 600)).captions === true : 'no captions track';
if (out.c === true) await press('c');
// Space plays and pauses with focus on the seek bar too (the hotkeys alone leave Space to a focused slider).
await page.focus('.media-time-slider [role="slider"]');
const seekPlay = (await press('Space', 600)).paused === false;
out.spaceOnSeek = seekPlay && (await press('Space')).paused === true;
// Back to the Play button: on the seek bar, Shift+←/→ are the slider's own keys.
await page.focus('.media-control-bar .media-play-button, .media-controls .media-play-button, .media-play-button:not(.pro-center-play)');
// Free pro keys do nothing in the Viewer.
const before = await V();
for (const k of ['i', 'o', ',', '.', '[', ']', 'r', 'g', 'z', 'Shift+ArrowLeft', 'Shift+ArrowRight', 'Shift+z', 'Shift+v']) await page.keyboard.press(k);
await page.waitForTimeout(400);
const after = await V();
out.freeKeys = Math.abs(after.t - before.t) < 0.05 && after.paused === before.paused && !(await page.$('.pro-picture, .pro-timeline, .pro-tl'));
// Help dialog.
await page.keyboard.press('Shift+?'); await page.waitForTimeout(600);
out.helpRows = await page.evaluate(() => document.querySelectorAll('[role="dialog"] tr, [role="dialog"] li, [role="dialog"] dt, [role="dialog"] .pro-shortcut-row').length);
out.helpFocusIn = await page.evaluate(() => !!document.activeElement?.closest('[role="dialog"]'));
await page.keyboard.press('Escape'); await page.waitForTimeout(500);
out.helpClosed = !(await page.$('[role="dialog"]:not([hidden])'));
out.helpFocusBack = await focusLabel();
// Targets and overflow.
out.smallTargets = await page.evaluate(() => {
  const min = matchMedia('(pointer: coarse)').matches ? 44 : 24;
  return [...document.querySelectorAll('.media-skin button, .media-skin [role="slider"], .media-skin [role="button"]')]
    .filter((e) => e.getClientRects().length && e.offsetParent !== null && !e.closest('[hidden]') && getComputedStyle(e).visibility !== 'hidden')
    .map((e) => ({ l: e.getAttribute('aria-label'), w: e.getBoundingClientRect().width, h: e.getBoundingClientRect().height }))
    .filter((r) => r.w > 0 && r.h > 0 && (r.w < min || r.h < min) && !/remaining|elapsed|duration/i.test(r.l ?? ''));
});
out.overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
out.proChunks = await page.evaluate(() => performance.getEntriesByType('resource').map((e) => e.name.split('/').pop()).filter((n) => /^(runtime|studio|debug)-/.test(n)));
out.pass = out.k && out.space && out.spaceOnSeek && out.right5 && out.left5 && out.l10 && out.j10 && out.five && out.home && out.m && out.down && out.c !== false && out.freeKeys
  && out.helpRows >= 10 && out.helpFocusIn && out.helpClosed && out.smallTargets.length === 0 && !out.overflow && out.proChunks.length === 0;
return out;
