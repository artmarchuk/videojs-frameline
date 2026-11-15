// Browser check (step 8.2). Body of an async function; `page` on the configurator (`/`), 1440x900.
// Tier and flags change the player and the snippet; the query string round-trips with no reload; each "Show me"
// does what it says through the skin's handle and leaves the keyboard on its button; the event log receives a range
// change and a frame grab.
const out = {};
await page.waitForFunction(() => document.querySelector('#player video')?.duration > 0, null, { timeout: 30000 });
await page.waitForTimeout(1500);
await page.evaluate(() => {
  window.__loads = 0;
  window.addEventListener('beforeunload', () => (window.__loads += 1));
  // No file is wanted from the check.
  HTMLAnchorElement.prototype.click = function () { window.__download = this.download; };
  try { localStorage.clear(); } catch {}
});
const state = () => page.evaluate(() => {
  const skin = document.querySelector('#player .pro-skin'), video = document.querySelector('#player video');
  return {
    tier: skin.dataset.tier, layout: skin.dataset.layout, zoom: skin.dataset.zoom ?? 'fit', crop: skin.dataset.crop ?? null, zones: skin.dataset.zones ?? null,
    titleSafe: skin.hasAttribute('data-guide-title-safe'), paused: video.paused, time: +video.currentTime.toFixed(3),
    snippet: document.querySelector('#snippet').textContent, query: location.search,
    zoomButton: !!document.querySelector('[data-pro-menu="zoom"]'), timeline: !!document.querySelector('.pro-timeline'),
    transform: document.querySelector('.pro-picture')?.style.transform ?? '',
    said: document.querySelector('#try-status').textContent,
    focus: document.activeElement?.getAttribute('aria-label') ?? document.activeElement?.tagName,
    log: [...document.querySelectorAll('#log li')].map((li) => [...li.children].map((c) => c.textContent).join(' | ')),
    proChunks: performance.getEntriesByType('resource').map((e) => e.name.split('/').pop()).filter((n) => /^(runtime|studio|debug)-/.test(n)).length,
  };
});
const check = (name) => page.locator(`#config input[name="${name}"]`);
const radio = (name, value) => page.locator(`#config input[name="${name}"][value="${value}"]`);
const showMe = async (task) => { await page.locator(`[data-task="${task}"] button`).click(); };

// Opens on Studio; the snippet names the tier and the source's frame rate.
const start = await state();
out.start = { tier: start.tier, layout: start.layout, snippet: start.snippet, query: start.query };
out.startOk = start.tier === 'studio' && start.layout === 'dock' && /^<FramelineSkin tier="studio" fps=\{\d+(\.\d+)?\} \/>$/.test(start.snippet) && start.query === '?tier=studio';

// A flag checkbox changes the player and the snippet.
await check('zoom').uncheck(); await page.waitForTimeout(400);
const noZoom = await state();
out.flag = { zoomButton: noZoom.zoomButton, snippet: noZoom.snippet, query: noZoom.query };
out.flagOk = start.zoomButton && !noZoom.zoomButton && noZoom.snippet.includes('features={{ zoom: false }}') && noZoom.query === '?tier=studio&zoom=0';

// Switching tier changes both, and the flags go back to that tier's defaults.
await radio('tier', 'viewer').check({ force: true }); await page.waitForTimeout(600);
const viewer = await state();
out.viewer = { tier: viewer.tier, layout: viewer.layout, timeline: viewer.timeline, snippet: viewer.snippet, query: viewer.query, showMeDisabled: await page.locator('[data-task] button:disabled').count(), need: await page.locator('[data-task="zoom"] .need').textContent() };
out.tierOk = viewer.tier === 'viewer' && viewer.layout === 'overlay' && !viewer.timeline && /tier="viewer"/.test(viewer.snippet) && !/features/.test(viewer.snippet) && viewer.query === '?tier=viewer' && out.viewer.showMeDisabled === 6;

// A pro flag over Viewer adds the feature to Viewer.
await check('timecode').check(); await page.waitForTimeout(1200);
const viewerPlus = await state();
out.viewerPlus = { snippet: viewerPlus.snippet, query: viewerPlus.query, timecode: await page.locator('#player [class*="timecode"]').count() > 0 };
out.viewerPlusOk = viewerPlus.snippet.includes('features={{ timecode: true }}') && viewerPlus.query === '?tier=viewer&timecode=1' && out.viewerPlus.timecode;

// Layout.
await radio('tier', 'studio').check({ force: true }); await radio('layout', 'overlay').check({ force: true }); await page.waitForTimeout(600);
const overlay = await state();
out.layoutOk = overlay.layout === 'overlay' && overlay.snippet.includes('layout="overlay"') && overlay.query === '?tier=studio&layout=overlay';
await radio('layout', 'dock').check({ force: true }); await page.waitForTimeout(400);
out.noReload = (await page.evaluate(() => window.__loads)) === 0;

// The segmented controls are radio groups and work from the keyboard.
await radio('tier', 'studio').focus(); await page.keyboard.press('ArrowLeft'); await page.waitForTimeout(400);
out.keyboardTier = (await state()).tier === 'viewer';
await page.keyboard.press('ArrowRight'); await page.waitForTimeout(600);
out.keyboardTier = out.keyboardTier && (await state()).tier === 'studio';

// Show me: each task, through the handle; focus stays on the button.
await showMe('step'); await page.waitForTimeout(1600);
const stepped = await state();
const fps = Number(/fps=\{([\d.]+)\}/.exec(stepped.snippet)[1]);
out.step = { time: stepped.time, frames: +(stepped.time * fps).toFixed(2), paused: stepped.paused, focus: stepped.focus, said: stepped.said };
out.stepOk = stepped.paused && Math.floor(stepped.time * fps + 0.01) === 3 && stepped.focus === 'Show me: step to the exact frame';

await showMe('range'); await page.waitForTimeout(1500);
const ranged = await state();
out.range = { log: ranged.log[0], playing: !ranged.paused, loop: await page.locator('#player [aria-label^="Loop"]').first().getAttribute('aria-pressed'), focus: ranged.focus };
out.rangeOk = /onInOutChange \| in \d+\.\d{3} · out \d+\.\d{3}/.test(ranged.log[0] ?? '') && !ranged.paused && out.range.loop === 'true' && ranged.focus === 'Show me: set a range and loop it';
await page.evaluate(() => document.querySelector('#player video').pause());

await showMe('zones'); await page.waitForTimeout(500);
const zones = await state();
out.zonesOk = zones.crop === '9-16' && zones.zones === 'tiktok' && /onGuidesChange \| crop 9:16 · zones tiktok/.test(zones.log[0] ?? '');

await showMe('safe'); await page.waitForTimeout(500);
const safe = await state();
out.safeOk = safe.titleSafe && safe.crop === null && safe.zones === null && /onGuidesChange \| guides title-safe$/.test(safe.log[0] ?? '');

await showMe('zoom'); await page.waitForTimeout(1800);
const zoomed = await state();
out.zoom = { zoom: zoomed.zoom, transform: zoomed.transform, log: zoomed.log[0] };
out.zoomOk = zoomed.zoom === '200' && /translate\(/.test(zoomed.transform) && /onZoomChange \| 200%/.test(zoomed.log[0] ?? '') && zoomed.focus === 'Show me: zoom to 200% and pan';

await showMe('grab'); await page.waitForTimeout(1500);
const grab = await state();
out.grab = { log: grab.log[0], said: grab.said, download: await page.evaluate(() => window.__download) };
out.grabOk = /onFrameGrab \| frame \d+ · \d+×\d+ · .+\.png/.test(grab.log[0] ?? '') && /Saved the frame/.test(grab.said) && /\.png$/.test(out.grab.download ?? '');

// The log: every line starts with the player's timecode; never more than 20; Clear empties it; it is not a live region.
out.logLines = grab.log.length;
out.logOk = grab.log.every((line) => /^\d\d:\d\d:\d\d:\d\d \| on[A-Z]/.test(line)) && grab.log.some((line) => line.includes('onInOutChange')) && grab.log.some((line) => line.includes('onFrameGrab'));
for (let i = 0; i < 14; i++) { await showMe('zones'); await page.waitForTimeout(60); await showMe('safe'); await page.waitForTimeout(60); }
out.logCapped = (await state()).log.length === 20;
out.logNotLive = await page.evaluate(() => { const log = document.querySelector('#log'); return !log.closest('[aria-live], [role=status], [role=log], [role=alert]'); });
await page.click('#log-clear');
out.logCleared = (await state()).log.length === 0 && await page.locator('#log-empty').isVisible();

// Copy.
await page.click('#copy'); await page.waitForTimeout(300);
out.copied = (await page.evaluate(() => navigator.clipboard.readText().catch(() => null))) === (await state()).snippet && (await page.textContent('#copy-status')) === 'Copied';

// The query wins on load, and round-trips.
const url = new URL(page.url());
for (const query of ['?tier=viewer', '?tier=studio&zoom=0', '?tier=viewer&layout=dock&timecode=1&guides=1', '?tier=studio&layout=overlay&inOut=0&platformZones=0']) {
  await page.goto(`${url.origin}${url.pathname}${query}`, { waitUntil: 'load' }); await page.waitForTimeout(1500);
  const loaded = await state();
  (out.roundTrip ??= []).push({ query, back: loaded.query, tier: loaded.tier, layout: loaded.layout, same: loaded.query === query });
}
out.roundTripOk = out.roundTrip.every((entry) => entry.same);
// Viewer on the page: no pro chunk is requested.
await page.goto(`${url.origin}${url.pathname}?tier=viewer`, { waitUntil: 'load' }); await page.waitForTimeout(2500);
out.viewerNoProChunk = (await state()).proChunks === 0;

out.pass = out.startOk && out.flagOk && out.tierOk && out.viewerPlusOk && out.layoutOk && out.noReload && out.keyboardTier && out.stepOk && out.rangeOk && out.zonesOk && out.safeOk && out.zoomOk && out.grabOk && out.logOk && out.logCapped && out.logNotLive && out.logCleared && out.copied && out.roundTripOk && out.viewerNoProChunk;
return out;
