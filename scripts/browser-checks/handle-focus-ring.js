// Browser check (D2): the pointer mark on a range handle hides its focus ring after a mouse press, and must clear on
// the next key press and on blur. Body of an async function; `page` is a Playwright page on
// http://localhost:4173/preview.html?tier=studio (npm run build; npx vite preview) or the public URL, 1440 wide.
// Pages, windows and options for the runner (`npm run check:browsers`): manifest.mjs.
const out = {};
await page.waitForTimeout(1500);
const state = () => page.evaluate(() => {
  const h = document.querySelector('[data-handle=in]');
  return { focused: document.activeElement === h, pointer: h.hasAttribute('data-pointer'), ring: getComputedStyle(h, '::after').outlineStyle, value: h.getAttribute('aria-valuenow') };
});
const box = async () => page.locator('[data-handle=in]').boundingBox();

// Sequence 1: drag the In handle with the mouse (no ring), then press an arrow key: the ring appears, one frame moves.
let b = await box();
await page.mouse.move(b.x + 12, b.y + 12); await page.mouse.down(); await page.mouse.move(b.x + 112, b.y + 12, { steps: 6 }); await page.mouse.up();
await page.waitForTimeout(300);
out.afterDrag = await state();
const before = Number(out.afterDrag.value);
await page.keyboard.press('ArrowRight'); await page.waitForTimeout(150);
out.afterArrow = await state();
out.movedFrames = Math.round((Number(out.afterArrow.value) - before) * 30);
out.seq1 = out.afterDrag.ring === 'none' && out.afterArrow.ring === 'solid' && out.movedFrames === 1;

// Sequence 2: click a handle, Tab away, Shift+Tab back: the ring shows.
b = await box();
await page.mouse.click(b.x + 12, b.y + 12); await page.waitForTimeout(200);
out.afterClick = await state();
await page.keyboard.press('Tab'); await page.waitForTimeout(150);
await page.keyboard.press('Shift+Tab'); await page.waitForTimeout(150);
out.afterTabBack = await state();
out.seq2 = out.afterClick.ring === 'none' && out.afterTabBack.focused && out.afterTabBack.ring === 'solid';
out.pass = out.seq1 && out.seq2;
return out;
