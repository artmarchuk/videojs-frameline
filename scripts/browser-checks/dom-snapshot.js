// Browser check: the skin's markup, to compare two builds. Body of an async function; `page` on
// /preview.html?tier=viewer or /preview.html?tier=studio (also with `&debug`), on `/` or on /embed.html, at any
// window size, with or without touch. It visits the states that viewer-gate.js and dock-polish.js visit (every menu
// open, the help dialog, after playing, muted, and in Studio a set range, zoom, a copied link, Loop off, a guide on)
// and records, for every element of the skin and of its popups, the tag, the classes as written and the role.
//
// There is no verdict: run it on the build before a change and on the build after, with the same URL and window, and
// compare the two results (`out.states`, one list of lines per state). Identical results mean the change did not touch
// the markup. `out.count` is the number of elements per state, for a quick look.
// The runner does the comparison: `npm run check:browsers -- --save <file>` on `main` records every page and window
// in the manifest, and `npm run check:browsers -- --compare <file>` on the branch lists each difference by engine,
// page, window, state and element.
// Pages, windows and options for the runner (`npm run check:browsers`): manifest.mjs.
const out = { states: {}, count: {} };
await page.waitForFunction(() => document.querySelector('video')?.duration > 0, null, { timeout: 30000 });
const studio = /tier=studio/.test(page.url()) || !!(await page.$('.pro-tl'));
if (studio) await page.waitForSelector('.pro-tl', { timeout: 15000 });
await page.waitForTimeout(1000);
const snap = async (name) => {
  const lines = await page.evaluate(() => {
    const skins = [...document.querySelectorAll('.media-skin')];
    const outside = [...document.querySelectorAll('.media-popup, [role="dialog"], [role="menu"], [role="tooltip"]')]
      .filter((e) => !e.closest('.media-skin') && !e.parentElement.closest('.media-popup, [role="dialog"], [role="menu"]'));
    const lines = [];
    const walk = (el, depth) => {
      lines.push(`${'  '.repeat(depth)}${el.tagName.toLowerCase()} | ${el.getAttribute('class') ?? ''} | ${el.getAttribute('role') ?? ''}`);
      for (const child of el.children) walk(child, depth + 1);
    };
    for (const root of [...skins, ...outside]) walk(root, 0);
    return lines;
  });
  out.states[name] = lines; out.count[name] = lines.length;
};
const video = (fn, arg) => page.evaluate(([source, a]) => new Function('v', 'a', source)(document.querySelector('video'), a), [fn, arg]);
const seek = async (t) => {
  await video('v.currentTime = a', t);
  await page.waitForFunction((a) => { const v = document.querySelector('video'); return !v.seeking && Math.abs(v.currentTime - a) < 0.1; }, t, { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(300);
};
const playSelector = studio ? '.pro-transport .media-play-button' : '.media-play-button:not(.pro-center-play)';
const focusPlayer = async () => { await page.focus(playSelector).catch(() => page.focus('.media-skin .media-play-button')); };
const key = async (k, wait = 400) => { await focusPlayer(); await page.keyboard.press(k); await page.waitForTimeout(wait); };

await snap('initial');
// Every menu the skin shows at this size, opened from the keyboard.
const menus = await page.evaluate(() => [...document.querySelectorAll('.media-skin .media-settings-button, .media-skin [data-pro-menu]')]
  .filter((e) => e.getClientRects().length)
  .map((e, i) => { e.setAttribute('data-snapshot-menu', String(i)); return e.getAttribute('data-pro-menu') ?? 'settings'; }));
for (const [i, name] of menus.entries()) {
  await page.focus(`[data-snapshot-menu="${i}"]`); await page.keyboard.press('Enter'); await page.waitForTimeout(500);
  await snap(`menu-${name}`);
  await page.keyboard.press('Escape'); await page.waitForTimeout(400);
}
await page.evaluate(() => document.querySelectorAll('[data-snapshot-menu]').forEach((e) => e.removeAttribute('data-snapshot-menu')));
await key('Shift+?', 600); await snap('help');
await page.keyboard.press('Escape'); await page.waitForTimeout(500);
// Played, then paused again; muted.
await video('v.muted = true; return v.play().catch(() => {})');
await page.waitForFunction(() => document.querySelector('video').currentTime > 0.4, null, { timeout: 15000 }).catch(() => {});
await video('v.pause()'); await page.waitForTimeout(500);
await snap('played');
if (studio) {
  await seek(20); await key('i', 250);
  await seek(40); await key('o', 250);
  await snap('range');
  await seek(30);
  await key('z', 500); await snap('zoom');
  await key('Shift+Z', 600);
  await key('s', 200); await snap('link-copied');
  await page.waitForTimeout(2600);
  await key('r', 300); await snap('loop-off');
  await key('r', 300);
  if (menus.includes('guides')) {
    await page.focus('[data-pro-menu="guides"]'); await page.keyboard.press('Enter'); await page.waitForTimeout(500);
    await page.keyboard.press('Enter'); await page.waitForTimeout(300);
    await page.keyboard.press('Escape'); await page.waitForTimeout(400);
    await snap('guide-on');
  }
}
return out;
