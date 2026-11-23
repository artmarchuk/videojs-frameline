// Browser check: a pro chunk that fails to load leaves a working Viewer (the skin's error boundaries). Body of an
// async function; `page` on /preview.html?tier=studio or on /?tier=studio of a production build, 1440x900 or a phone
// width. The check opens the page's URL itself, each time in a new browser context, with the chunk's request
// answered 404 through `route`.
//
// For the runtime chunk and for the Studio chunk:
// - the player is the Viewer (tier, overlay bar, no dock, no empty pro slots) and plays;
// - "Studio tools could not load. The player works without them." is announced once, in a polite live region;
// - the settings menu has "Retry loading Studio tools";
// - a retry while the chunk still answers 404 removes the item and announces nothing more; the player stays a Viewer;
// - on a fresh load, a retry once the chunk answers again brings Studio back, and focus is not lost to the page.
// For the debug chunk (`?debug`): Studio is there, the readout is absent, nothing is announced, no retry is offered.
// The site's own answer to a failed chunk is one reload (reload-on-stale-chunk.ts); this check is about the skin, so
// it sets that module's flag on every load and the page stays put.
// Nothing reaches the page as an uncaught error. `out.pass` is the verdict; `out.<chunk>` has what was seen.
const out = {};
const NOTICE = 'Studio tools could not load. The player works without them.';
const RETRY = 'Retry loading Studio tools';
const base = new URL(page.url());
const errors = [];
const blocked = { runtime: false, studio: false, debug: false };
// Every load gets a new browser context, so a chunk that loaded before cannot come from a cache: WebKit serves a
// cached chunk without a request, and `route` never sees it. `view` is the page of the current context.
const browser = page.context().browser();
const size = page.viewportSize();
let view = page;
const fresh = async () => {
  if (view !== page) await view.context().close();
  const context = await browser.newContext({ viewport: size });
  view = await context.newPage();
  view.on('pageerror', (error) => errors.push(String(error).slice(0, 160)));
  // Every text the notice region ever held, kept across the page's life.
  await view.addInitScript(() => {
    try { sessionStorage.setItem('frameline:reloaded-for-stale-chunk', '1'); } catch {}
    window.__notices = [];
    new MutationObserver(() => {
      const text = document.querySelector('[data-pro-notice]')?.textContent ?? '';
      if (text && window.__notices.at(-1) !== text) window.__notices.push(text);
      if (!text && window.__notices.length && window.__notices.at(-1) !== '') window.__notices.push('');
    }).observe(document, { subtree: true, childList: true, characterData: true });
  });
  await view.route(/\/assets\/(runtime|studio|debug)-[^/]+\.js$/, (route) => {
    const chunk = route.request().url().match(/\/assets\/(runtime|studio|debug)-/)[1];
    return blocked[chunk] ? route.fulfill({ status: 404, contentType: 'text/plain', body: 'NOT_FOUND' }) : route.continue();
  });
};
const load = async (debug) => {
  const url = new URL(base);
  if (debug) url.searchParams.set('debug', '');
  await fresh();
  await view.goto(url.href);
  await view.waitForFunction(() => document.querySelector('video')?.duration > 0, null, { timeout: 30000 });
  // The landing page keeps the bar hidden while it waits to stage its opening state, for four seconds at most.
  await view.waitForFunction(() => { const button = document.querySelector('.media-settings-button'); return button && getComputedStyle(button).visibility === 'visible'; }, null, { timeout: 10000 });
  await view.waitForTimeout(1200);
};
const seen = () => view.evaluate(() => {
  const skin = document.querySelector('.media-skin');
  return {
    tier: skin.getAttribute('data-tier'), layout: skin.getAttribute('data-layout'), ready: skin.hasAttribute('data-pro-ready'),
    studio: !!document.querySelector('.pro-tl'), slots: document.querySelectorAll('[data-pro-slot]').length, dock: !!document.querySelector('.pro-stage'),
    debug: !!document.querySelector('.pro-debug'),
    notice: document.querySelector('[data-pro-notice]')?.textContent ?? null,
    region: (() => { const n = document.querySelector('[data-pro-notice]'); return n ? `${n.getAttribute('role')} ${n.getAttribute('aria-live')}` : null; })(),
    notices: window.__notices,
  };
});
const menu = async () => {
  await view.focus('.media-settings-button'); await view.keyboard.press('Enter'); await view.waitForTimeout(500);
  const items = await view.evaluate(() => [...document.querySelectorAll('.media-menu-popup[data-open] [role^="menuitem"]')].filter((e) => e.getClientRects().length).map((e) => e.textContent.replace(/\s+/g, ' ').trim()));
  return items;
};
// Chooses the retry item of the open menu with the keyboard. (A Playwright locator with `hasText` did not resolve
// inside the open popover in WebKit, so the item is found in the view.)
const chooseRetry = async () => {
  const found = await view.evaluate((label) => {
    const item = [...document.querySelectorAll('.media-menu-popup[data-open] [role="menuitem"]')].find((element) => element.textContent.includes(label));
    item?.focus();
    return Boolean(item) && document.activeElement === item;
  }, RETRY);
  if (found) await view.keyboard.press('Enter');
  return found;
};
const plays = async () => {
  await view.evaluate(() => { document.querySelector('video').muted = true; });
  await view.click('.media-play-button:not(.pro-center-play)');
  const moved = await view.waitForFunction(() => document.querySelector('video').currentTime > 0.3 && !document.querySelector('video').paused, null, { timeout: 15000 }).then(() => true, () => false);
  await view.evaluate(() => document.querySelector('video').pause());
  await view.waitForTimeout(300);
  return moved;
};
const isViewer = (s) => s.tier === 'viewer' && s.layout === 'overlay' && !s.studio && !s.dock && s.slots === 0 && !s.ready;

for (const chunk of ['runtime', 'studio']) {
  const r = (out[chunk] = {});
  // The chunk stays missing: the fallback, then a retry that fails.
  blocked[chunk] = true;
  await load(false);
  r.fallback = await seen();
  r.viewer = isViewer(r.fallback);
  r.plays = await plays();
  r.announcedOnce = r.fallback.notice === NOTICE && r.fallback.region === 'status polite' && r.fallback.notices.length === 1;
  r.items = await menu();
  r.item = r.items.includes(RETRY);
  r.chosen = await chooseRetry();
  await view.waitForTimeout(1500);
  r.afterFailedRetry = await seen();
  r.itemsAfter = await menu();
  await view.keyboard.press('Escape'); await view.waitForTimeout(300);
  r.failedRetry = isViewer(r.afterFailedRetry) && !r.itemsAfter.includes(RETRY) && r.afterFailedRetry.notices.length === 1 && r.afterFailedRetry.notice === NOTICE;
  // A fresh load, and the chunk answers again before the retry.
  await load(false);
  blocked[chunk] = false;
  await menu();
  r.chosenAgain = await chooseRetry();
  r.back = await view.waitForSelector('.pro-tl', { timeout: 15000 }).then(() => true, () => false);
  await view.waitForTimeout(800);
  r.afterRetry = await seen();
  r.focus = await view.evaluate(() => { const a = document.activeElement; return a === document.body ? 'body' : a?.closest('.media-skin') ? 'player' : a?.tagName; });
  r.retry = r.back && r.afterRetry.tier === 'studio' && r.afterRetry.ready && r.afterRetry.notice === null && r.focus === 'player';
  r.playsAfterRetry = r.back ? await view.evaluate(() => { const v = document.querySelector('video'); v.muted = true; return v.play().then(() => { v.pause(); return true; }, () => false); }) : false;
  r.pass = r.viewer && r.plays && r.announcedOnce && r.item && r.failedRetry && r.retry && r.playsAfterRetry;
}

// The debug readout alone.
blocked.debug = true;
await load(true);
const d = (out.debug = { state: await seen() });
d.items = await menu();
await view.keyboard.press('Escape');
d.pass = d.state.studio && d.state.tier === 'studio' && d.state.ready && !d.state.debug && d.state.notice === null && d.state.notices.length === 0 && !d.items.includes(RETRY);
blocked.debug = false;
// And with nothing blocked, the readout is there (so its absence above means something).
await load(true);
out.readoutNormally = (await seen()).debug;

if (view !== page) await view.context().close();
if (errors.length) out.errors = errors;
out.pass = out.runtime.pass && out.studio.pass && out.debug.pass && out.readoutNormally && errors.length === 0;
return out;
