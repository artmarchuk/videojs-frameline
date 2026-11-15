// Browser check (step 7, Z3). Body of an async function; `page` on /preview.html?tier=studio, 1440x900.
// The zoom note follows the rendition that is playing: under Auto a rendition below the best one adds "showing …p" to
// the announcement and to the chosen Zoom item; with the best rendition picked by hand there is no note.
const out = {};
await page.waitForTimeout(2500);
const quality = async (label) => {
  await page.click('.media-settings-button'); await page.waitForTimeout(400);
  await page.locator('.media-menu-popup:not(.pro-menu-popup) [role^=menuitem]', { hasText: 'Quality' }).first().click(); await page.waitForTimeout(400);
  const radios = page.locator('[role=menuitemradio]:visible');
  const texts = await radios.allTextContents();
  if (label) await radios.nth(texts.findIndex((text) => text.trim().startsWith(label))).click();
  else await page.keyboard.press('Escape');
  await page.waitForTimeout(300); await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  return texts.map((text) => text.trim());
};
const said = () => page.evaluate(() => document.querySelector('.media-status-announcer[role=status]')?.textContent ?? '');
const item = () => page.evaluate(() => document.querySelector('[data-zoom-item="100"]').textContent);
const height = () => page.evaluate(() => document.querySelector('video').videoHeight);

out.options = await quality(null);
out.autoShowsPlaying = /^Auto \(\d+p\)/.test(out.options[0]);
const best = Math.max(...out.options.map((text) => parseInt(text, 10)).filter(Number.isFinite));
await page.focus('.pro-skin'); await page.keyboard.press('z'); await page.waitForTimeout(300);
out.auto = { videoHeight: await height(), said: await said(), item: await item() };
out.autoOk = out.auto.videoHeight < best ? out.auto.said === `Zoom 100% · showing ${out.auto.videoHeight}p` && out.auto.item === `100%showing ${out.auto.videoHeight}p` : out.auto.said === 'Zoom 100%';
await page.keyboard.press('z'); await page.keyboard.press('z'); await page.waitForTimeout(200);

// The best rendition by hand: wait until it is the one playing, then zoom.
await quality(`${best}p`);
await page.evaluate(() => document.querySelector('video').play());
await page.waitForFunction((h) => document.querySelector('video').videoHeight === h, best, { timeout: 30000 }).catch(() => {});
await page.evaluate(() => document.querySelector('video').pause());
await page.waitForTimeout(1500);
await page.focus('.pro-skin'); await page.keyboard.press('z');
await page.waitForFunction(() => document.querySelector('.pro-skin').dataset.zoom === '100', null, { timeout: 10000 }).catch(() => {});
await page.waitForTimeout(300);
out.best = { zoom: await page.evaluate(() => document.querySelector('.pro-skin').dataset.zoom ?? 'fit'), videoHeight: await height(), said: await said(), item: await item() };
out.bestOk = out.best.videoHeight === best && out.best.said === 'Zoom 100%' && out.best.item === '100%';
out.pass = out.autoShowsPlaying && out.autoOk && out.bestOk;
return out;
