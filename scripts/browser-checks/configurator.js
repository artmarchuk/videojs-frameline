// Browser check (step 8.2, updated for the landing page). Body of an async function; `page` on the site root (`/`), 1440x900.
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
// The staged hero: before anything is touched, a range, the playhead inside it, Title safe, paused, an empty log.
out.staged = await page.evaluate(() => ({
  in: document.querySelector('#player [data-handle="in"]')?.getAttribute('aria-valuetext'), out: document.querySelector('#player [data-handle="out"]')?.getAttribute('aria-valuetext'),
  timecode: (document.querySelector('#player .pro-timecode-values')?.textContent ?? '').slice(0, 11), titleSafe: !!document.querySelector('#player [data-guide="title-safe"]'),
  paused: document.querySelector('#player video').paused, log: document.querySelectorAll('#log li').length, focus: document.activeElement?.tagName, scroll: window.scrollY,
}));
out.stagedOk = out.staged.in === '00:00:03:02' && out.staged.out === '00:00:07:10' && out.staged.timecode === '00:00:03:18' && out.staged.titleSafe && out.staged.paused && out.staged.log === 0 && out.staged.focus === 'BODY' && out.staged.scroll === 0;

const check = (name) => page.locator(`#config input[name="${name}"]`);
const radio = (name, value) => page.locator(`#config input[name="${name}"][value="${value}"]`);
const showMe = async (task) => { await page.locator(`[data-task="${task}"] button`).click(); };
// Configure starts closed under the player; its button opens it and says so.
out.configureClosed = await page.locator('#configure-body').isHidden() && (await page.getAttribute('#configure-toggle', 'aria-expanded')) === 'false';
await page.click('#configure-toggle'); await page.waitForTimeout(400); // the body unfolds in 280 ms
out.configureOpens = await page.locator('#configure-body').isVisible() && (await page.getAttribute('#configure-toggle', 'aria-expanded')) === 'true';
out.configureSummary = await page.textContent('#configure-summary');

// WebKit (Safari) does not move focus to a button on a pointer click, so "focus stays on the button" is asserted only where a click focuses.
await page.click('#log-clear'); out.clickFocuses = await page.evaluate(() => document.activeElement?.id === 'log-clear');
const kept = (focus, label) => (out.clickFocuses ? focus === label : true);

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
out.tierOk = viewer.tier === 'viewer' && viewer.layout === 'overlay' && !viewer.timeline && /tier="viewer"/.test(viewer.snippet) && !/features/.test(viewer.snippet) && viewer.query === '?tier=viewer' && out.viewer.showMeDisabled === 6 && await page.locator('[data-cue] button:disabled').count() === 3;

// A pro flag over Viewer adds the feature to Viewer.
await check('timecode').check(); await page.waitForTimeout(1200);
const viewerPlus = await state();
out.viewerPlus = { snippet: viewerPlus.snippet, query: viewerPlus.query, timecode: await page.locator('#player [class*="timecode"]').count() > 0 };
out.viewerPlusOk = viewerPlus.snippet.includes('features={{ timecode: true }}') && viewerPlus.query === '?tier=viewer&timecode=1' && out.viewerPlus.timecode;

// The tier switch over the player is the same switch as the form's, and the line beside it follows.
await page.locator('input[name="hero-tier"][value="studio"]').check({ force: true }); await page.waitForTimeout(600);
const heroStudio = await state();
out.heroTier = { tier: heroStudio.tier, form: await radio('tier', 'studio').isChecked(), hint: await page.textContent('#tier-hint') };
await radio('tier', 'viewer').check({ force: true }); await page.waitForTimeout(400);
out.heroTierOk = out.heroTier.tier === 'studio' && out.heroTier.form && /^Studio: .*dock below/.test(out.heroTier.hint) && await page.locator('input[name="hero-tier"][value="viewer"]').isChecked() && /^Viewer: /.test(await page.textContent('#tier-hint'));

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
out.stepOk = stepped.paused && Math.floor(stepped.time * fps + 0.01) === 3 && kept(stepped.focus, 'Show me: step to the exact frame');

await showMe('range'); await page.waitForTimeout(1500);
const ranged = await state();
out.range = { log: ranged.log[0], playing: !ranged.paused, loop: await page.locator('#player [aria-label^="Loop"]').first().getAttribute('aria-pressed'), focus: ranged.focus };
out.rangeOk = /onInOutChange \| in \d+\.\d{3} · out \d+\.\d{3}/.test(ranged.log[0] ?? '') && !ranged.paused && out.range.loop === 'true' && kept(ranged.focus, 'Show me: set a range and loop it');
await page.evaluate(() => document.querySelector('#player video').pause());

// Review: to the marker `hold`, paused; the status names the marker; nothing is written to the clipboard.
await showMe('review'); await page.waitForTimeout(1500);
const reviewed = await state();
out.review = { time: reviewed.time, paused: reviewed.paused, said: reviewed.said, focus: reviewed.focus };
out.reviewOk = reviewed.paused && Math.floor(reviewed.time * fps + 0.01) === 512 && reviewed.said === 'On the marker "Director: hold the pose two frames longer". Press S to copy a link to this frame.' && kept(reviewed.focus, 'Show me: go to a review marker');

// Guides: 9:16 with the TikTok zones while platform zones are on, Title safe without them.
await showMe('guides'); await page.waitForTimeout(500);
const zones = await state();
out.zonesOk = zones.crop === '9-16' && zones.zones === 'tiktok' && /onGuidesChange \| crop 9:16 · zones tiktok/.test(zones.log[0] ?? '');

await check('platformZones').uncheck(); await page.waitForTimeout(600);
await showMe('guides'); await page.waitForTimeout(500);
const safe = await state();
out.safeOk = safe.titleSafe && safe.crop === null && safe.zones === null && /onGuidesChange \| guides title-safe$/.test(safe.log[0] ?? '');
await check('platformZones').check(); await page.waitForTimeout(600);

await showMe('zoom'); await page.waitForTimeout(1800);
const zoomed = await state();
out.zoom = { zoom: zoomed.zoom, transform: zoomed.transform, log: zoomed.log[0] };
out.zoomOk = zoomed.zoom === '100' && /translate\(/.test(zoomed.transform) && /onZoomChange \| 100%/.test(zoomed.log[0] ?? '') && kept(zoomed.focus, 'Show me: zoom to 100% and pan');

// A Cue row under the player runs the same task.
await page.locator('[data-task="guides"] button').click(); await page.waitForTimeout(300);
await page.locator('[data-cue="zoom"] button').click(); await page.waitForTimeout(500);
out.cueOk = (await state()).zoom === '100';

await showMe('grab'); await page.waitForTimeout(1500);
const grab = await state();
out.grab = { log: grab.log[0], said: grab.said, download: await page.evaluate(() => window.__download) };
out.grabOk = /onFrameGrab \| frame \d+ · \d+×\d+ · .+\.png/.test(grab.log[0] ?? '') && /Saved the frame/.test(grab.said) && /\.png$/.test(out.grab.download ?? '');

// The log: every line starts with the player's timecode; never more than 20; Clear empties it; it is not a live region.
out.logLines = grab.log.length;
out.logOk = grab.log.every((line) => /^\d\d:\d\d:\d\d:\d\d \| on[A-Z]/.test(line)) && grab.log.some((line) => line.includes('onInOutChange')) && grab.log.some((line) => line.includes('onFrameGrab'));
// Guides goes back to Fit and Zoom to 100%: one event a click.
for (let i = 0; i < 14; i++) { await showMe('guides'); await page.waitForTimeout(60); await showMe('zoom'); await page.waitForTimeout(60); }
out.logCapped = (await state()).log.length === 20;
out.logNotLive = await page.evaluate(() => { const log = document.querySelector('#log'); return !log.closest('[aria-live], [role=status], [role=log], [role=alert]'); });
await page.click('#log-clear');
out.logCleared = (await state()).log.length === 0 && await page.locator('#log-empty').isVisible();

// Copy.
await page.click('#copy'); await page.waitForTimeout(300);
out.copied = (await page.evaluate(() => navigator.clipboard.readText().catch(() => null))) === (await state()).snippet && (await page.textContent('#copy-status')) === 'Copied';

// The query wins on load, and round-trips. (Configure is closed again after each load; the query is read all the same.)
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

// Configure still opens and closes after all those configuration changes (its listener is wired once).
const expanded = () => page.getAttribute('#configure-toggle', 'aria-expanded');
const wasOpen = await expanded();
await page.click('#configure-toggle'); const flipped = await expanded();
await page.click('#configure-toggle'); const back = await expanded();
out.configureToggles = flipped !== wasOpen && back === wasOpen;

out.pass = out.stagedOk && out.reviewOk && out.configureToggles && out.configureClosed && out.configureOpens && out.startOk && out.flagOk && out.tierOk && out.viewerPlusOk && out.heroTierOk && out.layoutOk && out.noReload && out.keyboardTier && out.stepOk && out.rangeOk && out.zonesOk && out.safeOk && out.zoomOk && out.cueOk && out.grabOk && out.logOk && out.logCapped && out.logNotLive && out.logCleared && out.copied && out.roundTripOk && out.viewerNoProChunk;
return out;
