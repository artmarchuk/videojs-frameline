// Browser check (step 7b, G3). Body of an async function; `page` on /preview.html?tier=studio at 1440x900, device scale
// factor 1 (so the player-size cap holds Auto at 720p on this stream).
// While zoomed with Quality on Auto the rendition cap is lifted (`source.capRenditionToPlayerSize: false`), with no
// reload; at Fit the source is as the host gave it. A rendition picked by hand is not touched.
const out = {};
await page.waitForTimeout(3000);
await page.evaluate(() => {
  window.__events = [];
  const video = document.querySelector('video');
  for (const name of ['loadstart', 'emptied', 'resize']) video.addEventListener(name, () => window.__events.push(`${name}@${video.currentTime.toFixed(1)}:${video.videoHeight}`));
});
// The media handle Video.js gives the skin is not on the DOM; read the cap through what it changes: the engine's
// ceiling shows as the rendition that Auto reaches while playing.
const state = () => page.evaluate(() => { const v = document.querySelector('video'); return { height: v.videoHeight, time: +v.currentTime.toFixed(1), paused: v.paused, zoom: document.querySelector('.pro-skin').dataset.zoom ?? 'fit', auto: [...document.querySelectorAll('[role=menuitemradio]')].find((e) => /^Auto/.test(e.textContent.trim()))?.textContent.trim() ?? null }; });
const settle = async (test, ms = 45000) => { await page.waitForFunction(test, null, { timeout: ms }).catch(() => {}); };

await page.evaluate(() => { const v = document.querySelector('video'); v.muted = true; return v.play(); });
await page.waitForTimeout(6000);
out.fit = await state();

await page.focus('.pro-skin'); await page.keyboard.press('z'); await page.waitForTimeout(500);
await settle(() => document.querySelector('video').videoHeight > 720);
out.zoomed = await state();
out.liftedAboveCap = out.zoomed.height > out.fit.height;

await page.keyboard.press('Shift+z'); await page.waitForTimeout(500);
await settle(() => document.querySelector('video').videoHeight <= 720, 90000);
out.backAtFit = await state();
out.capRestored = out.backAtFit.height <= out.fit.height;
out.events = await page.evaluate(() => window.__events);
out.noReload = !out.events.some((event) => /^(loadstart|emptied)/.test(event));
out.keptPlaying = out.backAtFit.time > out.fit.time && !out.backAtFit.paused;
out.pass = out.liftedAboveCap && out.capRestored && out.noReload && out.keptPlaying;
return out;
