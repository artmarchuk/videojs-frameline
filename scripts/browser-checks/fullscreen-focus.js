// Browser check (D3): headless Chrome cannot enter real fullscreen, so the Fullscreen API is stubbed to see (a) that
// `F` calls requestFullscreen on the player container from a focused control and after a click on the picture, and
// (b) that when fullscreen ends with focus on the page body, focus returns to the fullscreen button.
// Body of an async function; `page` on http://localhost:4173/preview.html?tier=studio (or ?tier=viewer).
// Pages, windows and options for the runner (`npm run check:browsers`): manifest.mjs.
const out = {};
await page.waitForTimeout(1500);
await page.evaluate(() => {
  window.__fs = { calls: [], element: null };
  Object.defineProperty(document, 'fullscreenEnabled', { value: true, configurable: true });
  Object.defineProperty(document, 'fullscreenElement', { get: () => window.__fs.element, configurable: true });
  Element.prototype.requestFullscreen = function () { window.__fs.calls.push(this.className.toString().split(' ').includes('pro-skin') ? 'container' : this.tagName); window.__fs.element = this; document.dispatchEvent(new Event('fullscreenchange')); return Promise.resolve(); };
  document.exitFullscreen = () => { window.__fs.element = null; document.dispatchEvent(new Event('fullscreenchange')); return Promise.resolve(); };
});
// (a1) F from a focused control (the first Tab stop inside the player)
for (let i = 0; i < 12; i++) { await page.keyboard.press('Tab'); if (await page.evaluate(() => !!document.activeElement.closest('.pro-skin'))) break; }
out.focusedControl = await page.evaluate(() => document.activeElement.getAttribute('aria-label'));
await page.keyboard.press('f'); await page.waitForTimeout(200);
out.afterF = await page.evaluate(() => [...window.__fs.calls]);
await page.keyboard.press('f'); await page.waitForTimeout(300); // leave again
// (a2) F after a click on the picture
const box = await page.locator('video').boundingBox();
await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2); await page.waitForTimeout(300);
out.afterClickFocus = await page.evaluate(() => document.activeElement.className.toString().includes('pro-skin') ? 'container' : document.activeElement.tagName);
await page.keyboard.press('f'); await page.waitForTimeout(200);
out.afterClickF = await page.evaluate(() => [...window.__fs.calls]);
// (b) leaving fullscreen with focus on body: focus returns to the fullscreen button
await page.evaluate(() => { document.activeElement?.blur?.(); });
await page.evaluate(() => { window.__fs.element = null; document.dispatchEvent(new Event('fullscreenchange')); });
await page.waitForTimeout(200);
out.afterExit = await page.evaluate(() => ({ active: document.activeElement.getAttribute('aria-label'), inPlayer: !!document.activeElement.closest('.pro-skin') }));
out.pass = out.afterF[0] === 'container' && out.afterClickF.length === 2 && out.afterClickF[1] === 'container' && out.afterClickFocus === 'container' && out.afterExit.inPlayer;
return out;
