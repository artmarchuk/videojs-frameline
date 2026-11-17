// Browser check (step 7b, G3). Body of an async function; `page` on /preview.html?tier=studio&cap=1 at 1440x900, device scale
// factor 1 (so the player-size cap holds Auto at 720p on this stream). `?cap=1` puts the cap on: the demo source has it off.
// While zoomed with Quality on Auto the rendition cap is lifted (`source.capRenditionToPlayerSize: false`), with no
// reload; at Fit the source is as the host gave it. A rendition picked by hand is not touched.
// Step 8.0: 100% is measured against the best rendition on offer, so the scale and the pan do not change when the
// playing rendition does. Checked twice: when the lifted cap brings a higher rendition in, and with one forced by hand.
const out = {};
await page.waitForTimeout(3000);
await page.evaluate(() => {
  window.__events = [];
  const video = document.querySelector('video');
  for (const name of ['loadstart', 'emptied', 'resize']) video.addEventListener(name, () => window.__events.push(`${name}@${video.currentTime.toFixed(1)}:${video.videoHeight}`));
});
// The media handle Video.js gives the skin is not on the DOM; read the cap through what it changes: the engine's
// ceiling shows as the rendition that Auto reaches while playing.
const state = () => page.evaluate(() => { const v = document.querySelector('video'); return { transform: document.querySelector('.pro-picture')?.style.transform ?? '', height: v.videoHeight, time: +v.currentTime.toFixed(1), paused: v.paused, zoom: document.querySelector('.pro-skin').dataset.zoom ?? 'fit', auto: [...document.querySelectorAll('[role=menuitemradio]')].find((e) => /^Auto/.test(e.textContent.trim()))?.textContent.trim() ?? null }; });
const settle = async (test, ms = 45000, arg = null) => { await page.waitForFunction(test, arg, { timeout: ms }).catch(() => {}); };

await page.evaluate(() => { const v = document.querySelector('video'); v.muted = true; return v.play(); });
await page.waitForTimeout(6000);
out.fit = await state();

await page.focus('.pro-skin'); await page.keyboard.press('z'); await page.waitForTimeout(300);
// Pan off-centre, so the pan is part of what has to survive the switch.
await page.keyboard.press('Shift+Alt+ArrowRight'); await page.keyboard.press('Shift+Alt+ArrowDown'); await page.waitForTimeout(300);
out.zoomedBefore = await state();
await settle(() => document.querySelector('video').videoHeight > 720);
await page.waitForTimeout(500);
out.zoomed = await state();
out.liftedAboveCap = out.zoomed.height > out.fit.height;
out.sameTransformAfterSwitch = out.zoomedBefore.height < out.zoomed.height && out.zoomedBefore.transform !== '' && out.zoomedBefore.transform === out.zoomed.transform;

// Force a switch by hand (Settings → Quality, the lowest rendition): the scale and the pan stay; then back to Auto.
const pick = async (label) => {
  await page.click('.media-settings-button'); await page.waitForTimeout(400);
  await page.locator('.media-menu-popup:not(.pro-menu-popup) [role^=menuitem]', { hasText: 'Quality' }).first().click(); await page.waitForTimeout(400);
  const radios = page.locator('[role=menuitemradio]:visible');
  const texts = (await radios.allTextContents()).map((text) => text.trim());
  // `lowest`: the smallest rendition on offer (360p on the test stream, 270p on the reel).
  const heights = texts.map((text) => Number(/^(\d+)p/.exec(text)?.[1]) || Infinity);
  const index = label === 'lowest' ? heights.indexOf(Math.min(...heights)) : texts.findIndex((text) => text.startsWith(label));
  if (index >= 0) await radios.nth(index).click(); else await page.keyboard.press('Escape');
  await page.waitForTimeout(300); await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  return texts[index] ?? null;
};
out.picked = await pick('lowest');
const lowest = Number(/^(\d+)p/.exec(out.picked ?? '')?.[1]);
await settle((h) => document.querySelector('video').videoHeight === h, 60000, lowest);
await page.waitForTimeout(500);
out.forced = await state();
out.sameTransformForced = out.forced.height === lowest && out.forced.transform === out.zoomed.transform;
await pick('Auto');
await page.focus('.pro-skin');

await page.keyboard.press('Shift+z'); await page.waitForTimeout(500);
await settle(() => document.querySelector('video').videoHeight <= 720, 90000);
out.backAtFit = await state();
out.capRestored = out.backAtFit.height <= out.fit.height;
out.events = await page.evaluate(() => window.__events);
out.noReload = !out.events.some((event) => /^(loadstart|emptied)/.test(event));
// Still playing. The time is not compared: a short source (the 56 s reel) has looped back by now.
out.keptPlaying = !out.backAtFit.paused;
out.pass = out.liftedAboveCap && out.sameTransformAfterSwitch && out.sameTransformForced && out.capRestored && out.noReload && out.keptPlaying;
return out;
