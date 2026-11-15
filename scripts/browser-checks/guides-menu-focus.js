// Browser check (F2): opening the Guides menu by keyboard focuses 'Title safe', and Down walks the menu in reading order.
// Run with a Playwright page on http://localhost:4173/preview.html?tier=studio (npm run build; npx vite preview). Body of an async function; `page` is in scope.
const out = {};
await page.focus('[data-pro-menu="guides"]'); await page.keyboard.press('Enter'); await page.waitForTimeout(500);
const cur = () => page.evaluate(() => document.activeElement.textContent.trim().slice(0, 24));
out.first = await cur();
out.order = [out.first];
for (let i = 0; i < 16; i++) { await page.keyboard.press('ArrowDown'); await page.waitForTimeout(60); out.order.push(await cur()); }
await page.keyboard.press('Escape'); await page.waitForTimeout(400);
// via Space too
await page.focus('[data-pro-menu="guides"]'); await page.keyboard.press('Space'); await page.waitForTimeout(500);
out.space = await cur();
await page.keyboard.press('Escape'); await page.waitForTimeout(400);
out.back = await page.evaluate(() => document.activeElement.getAttribute('aria-label'));
return out;
