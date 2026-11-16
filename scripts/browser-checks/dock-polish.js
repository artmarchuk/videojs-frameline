// Browser check: the link button, `S`, `Shift+G`, the Capture menu, and the narrow dock's row of equal cells.
// Body of an async function; `page` on /preview.html?tier=studio (local build or the public URL). Run it wide
// (1440x900) and narrow (a touch context, or a window that makes the player under 740px; for example 422x800, 392x800
// and 352x800, where the player is 390, 360 and 320px wide). In Chromium, create the context with the
// `clipboard-read` and `clipboard-write` permissions so the copied link and image can be read back.
// Wide: the timecode field and the link button are one pair (2px apart, same height); `S` copies `#t=<timecode>`,
// shows the check for about 1.2s and announces "Link copied, <timecode>"; a refused clipboard shows no check;
// `Shift+G` copies a PNG; the Capture menu holds the two image actions; the help dialog lists both keys.
// Narrow: one row of 44px controls in equal cells, in the order Markers, Loop, Capture, Link, Guides, Zoom, Settings,
// Fullscreen; no In or Out buttons; Zoom folds away under 382px and Link under 340px, where "Copy link at timecode"
// is an item of the settings menu; under 300px the side padding is 12px and under 288px the cells are 40px wide,
// so six fit down to a 264px player; `I`, `O` and `Z` still work.
const out = {};
await page.waitForFunction(() => document.querySelector('video')?.duration > 0, null, { timeout: 30000 });
await page.waitForSelector('.pro-tl'); await page.waitForTimeout(800);
const said = () => page.evaluate(() => [...document.querySelectorAll('.pro-skin [role="status"]')].map((e) => e.textContent).join(' | '));
const seek = async (t) => {
  await page.evaluate((time) => { document.querySelector('video').currentTime = time; }, t);
  await page.waitForFunction((time) => { const v = document.querySelector('video'); return !v.seeking && Math.abs(v.currentTime - time) < 0.1; }, t);
  await page.waitForTimeout(350);
};
const clipboard = (await page.evaluate(() => navigator.permissions?.query({ name: 'clipboard-read' }).then((p) => p.state, () => 'unknown'))) === 'granted';
const focusPlayer = () => page.focus('.pro-skin .pro-transport .media-play-button');
const copied = () => page.evaluate(() => document.querySelector('.pro-tool-link')?.hasAttribute('data-copied') ?? false);
out.player = await page.evaluate(() => document.querySelector('.pro-skin').getBoundingClientRect().width);
out.narrow = (await page.getAttribute('.pro-skin', 'data-dock-size')) === 'narrow';
const checks = {};

if (!out.narrow) {
  await focusPlayer(); await seek(14);
  const timecode = (await page.textContent('[data-pro-timecode]')).trim().slice(0, 11);
  out.pair = await page.evaluate(() => {
    const f = document.querySelector('.pro-timecode').getBoundingClientRect(), l = document.querySelector('.pro-tool-link').getBoundingClientRect();
    return { gap: +(l.left - f.right).toFixed(2), sameHeight: f.height === l.height, name: document.querySelector('.pro-tool-link').getAttribute('aria-label') };
  });
  checks.pair = out.pair.gap === 2 && out.pair.sameHeight && out.pair.name === 'Copy link at timecode';
  await page.keyboard.press('s'); await page.waitForTimeout(200);
  out.said = await said();
  checks.announced = out.said.includes(`Link copied, ${timecode}`);
  checks.check = await copied();
  checks.noToast = !(await page.$('.pro-toast'));
  if (clipboard) { out.link = await page.evaluate(() => navigator.clipboard.readText()); checks.link = out.link.endsWith(`#t=${timecode}`); }
  await page.waitForTimeout(1300);
  checks.checkGone = !(await copied());
  // Shift+G copies the image; G still downloads it.
  await page.keyboard.press('Shift+G'); await page.waitForTimeout(900);
  out.imageSaid = await said();
  if (clipboard) { out.image = await page.evaluate(() => navigator.clipboard.read().then((items) => items.flatMap((i) => i.types), (e) => [String(e)])); checks.image = out.image.includes('image/png') && out.imageSaid.includes('Frame copied'); }
  // The Capture menu, and its trigger while open.
  await page.focus('[data-pro-menu="capture"]'); await page.keyboard.press('Enter'); await page.waitForTimeout(400);
  out.capture = await page.evaluate(() => [...document.querySelectorAll('.pro-menu-popup[data-open] [role^="menuitem"]')].map((e) => e.textContent.replace(/\s+/g, ' ').trim()));
  checks.capture = out.capture.length === 2 && out.capture[0] === 'Grab frameG' && out.capture[1].startsWith('Copy frame image');
  checks.triggerPressed = (await page.getAttribute('[data-pro-menu="capture"]', 'aria-expanded')) === 'true';
  await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  // Help dialog.
  await page.keyboard.press('Shift+?'); await page.waitForTimeout(500);
  out.help = await page.evaluate(() => [...document.querySelectorAll('.pro-shortcuts-row')].map((r) => `${[...r.querySelectorAll('kbd')].map((k) => k.textContent).join('+')}: ${r.querySelector('dd').textContent}`).filter((r) => /^(S|G|Shift\+G):/.test(r)));
  checks.help = out.help.join(' | ') === 'S: Copy link at timecode | G: Grab frame | Shift+G: Copy frame image';
  await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  // A refused clipboard: the error message, and no check. Last, because it breaks the clipboard for this page.
  await page.evaluate(() => { navigator.clipboard.writeText = () => Promise.reject(new Error('refused')); document.execCommand = () => false; });
  await focusPlayer(); await page.keyboard.press('s'); await page.waitForTimeout(250);
  out.refused = await said();
  checks.refused = out.refused.includes('Could not copy') && !(await copied());
} else {
  out.row = await page.evaluate(() => {
    const row = document.querySelector('.pro-main-right');
    const buttons = [...row.querySelectorAll('button')].filter((e) => e.getClientRects().length);
    const centres = buttons.map((e) => { const r = e.getBoundingClientRect(); return r.left + r.width / 2; });
    return {
      order: buttons.map((e) => (e.getAttribute('aria-label') || 'Settings').replace(/,.*$/, '')),
      sizes: [...new Set(buttons.map((e) => { const r = e.getBoundingClientRect(); return `${r.width}x${r.height}`; }))],
      steps: [...new Set(centres.slice(1).map((c, i) => Math.round(c - centres[i])))],
      over: row.scrollWidth - row.clientWidth,
      inside: [...document.querySelectorAll('.pro-main-row button')].filter((e) => e.getClientRects().length).every((e) => { const r = e.getBoundingClientRect(), s = document.querySelector('.pro-skin').getBoundingClientRect(); return r.left >= s.left && r.right <= s.right; }),
    };
  });
  const expected = ['Markers', 'Loop', 'Capture', ...(out.player >= 340 ? ['Copy link at timecode'] : []), 'Guides', ...(out.player >= 382 ? ['Zoom'] : []), 'Settings', 'Enter fullscreen'];
  checks.order = out.row.order.join() === expected.join();
  const cell = out.player < 288 ? 40 : 44;
  checks.targets = out.row.sizes.join() === `${cell}x44`;
  checks.equalCells = out.row.steps.length === 1 && out.row.steps[0] >= cell;
  checks.fits = out.row.over === 0 && out.row.inside;
  checks.noInOutButtons = (await page.evaluate(() => [...document.querySelectorAll('.pro-skin button')].filter((e) => /^Set (In|Out)/.test(e.getAttribute('aria-label') ?? '')).length)) === 0;
  // I and O from a keyboard; Z where the Zoom button is folded away.
  await focusPlayer();
  await seek(20); await page.keyboard.press('i'); await page.waitForTimeout(150); const inSaid = await said();
  await seek(40); await page.keyboard.press('o'); await page.waitForTimeout(150); const outSaid = await said();
  checks.keys = inSaid.includes('In point set') && outSaid.includes('Out point set');
  await page.keyboard.press('z'); await page.waitForTimeout(200);
  checks.z = (await page.getAttribute('.pro-skin', 'data-zoom')) === '100';
  await page.keyboard.press('Shift+Z'); await page.waitForTimeout(2600);
  // The settings menu: no markers page; the link item only where the button is folded away.
  await page.focus('.media-settings-button'); await page.keyboard.press('Enter'); await page.waitForTimeout(400);
  out.settings = await page.evaluate(() => [...document.querySelectorAll('.media-menu-popup[data-open] [role^="menuitem"]')].filter((e) => e.getClientRects().length).map((e) => e.textContent.replace(/\s+/g, ' ').trim()));
  checks.noMarkersPage = !out.settings.some((item) => /^(Markers|Chapters)/.test(item));
  const item = await page.$('.pro-menu-item-link');
  const itemShown = item ? await item.isVisible() : false;
  checks.linkItem = itemShown === out.player < 340;
  if (itemShown) {
    await item.click(); await page.waitForTimeout(300);
    checks.linkItemCopies = (await said()).includes('Link copied, ') && !!(await page.$('.pro-toast'));
  } else {
    await page.keyboard.press('Escape'); await page.waitForTimeout(250);
    await focusPlayer(); await page.keyboard.press('s'); await page.waitForTimeout(200);
    checks.check = await copied();
  }
  // Markers has its own button.
  await page.focus('[data-pro-menu="markers"]'); await page.keyboard.press('Enter'); await page.waitForTimeout(400);
  checks.markersMenu = (await page.evaluate(() => document.querySelectorAll('.pro-menu-popup[data-open] [role="menuitem"]').length)) > 0;
  await page.keyboard.press('Escape');
}
out.checks = checks;
out.pass = Object.values(checks).every(Boolean);
return out;
