// Browser check: a page of a replaced deploy reloads itself once instead of losing its player (the stale-chunk bug of
// 23 Nov 2026). Body of an async function; `page` on any page, 1440x900. The check navigates itself.
//
// It needs fixtures/deploy-server.mjs running on a production build (`npm run build`, then
// `node scripts/browser-checks/fixtures/deploy-server.mjs`); the check expects it at http://127.0.0.1:4179, or at
// `args.base`, with "another site" on the next port. `args.path` is the page to test: `/?tier=studio` (default),
// `/preview.html?tier=studio` or `/embed.html?tier=studio`.
//
// Part one, a new deploy: load the page from build 1, deploy build 2 (every chunk gets a new name), go to another
// site and come back with Back. A browser that takes the old page from its HTTP cache then asks for a lazy chunk that
// is gone; the page must reload once and show a working Studio player from build 2 (Chromium and WebKit on 23 Nov
// 2026). A browser that restores the page from its back-forward cache, takes the old page with all of its chunks from
// the HTTP cache (Firefox), or fetches the page again never meets the bug: `out.path` says which happened, and the
// player must work in each.
// Part two, chunks that stay missing: the lazy chunks answer 404 whatever the page does. The page must reload once
// and no more.
// Part three: with nothing wrong, the flag in sessionStorage is cleared ten seconds after load.
const out = {};
const base = (typeof args !== 'undefined' && args?.base) || 'http://127.0.0.1:4179';
const elsewhere = base.replace(/:(\d+)$/, (_all, port) => `:${Number(port) + 1}`);
const path = (typeof args !== 'undefined' && args?.path) || '/?tier=studio';
const FLAG = 'frameline:reloaded-for-stale-chunk';
const deploy = (build) => fetch(`${base}/__deploy?build=${build}`).then((response) => response.text());
const documents = [];
page.on('request', (request) => { if (request.isNavigationRequest() && request.frame() === page.mainFrame() && request.url().startsWith(base)) documents.push(request.url()); });
const errors = [];
page.on('pageerror', (error) => errors.push(String(error).slice(0, 160)));
await page.addInitScript(() => {
  window.__shows = [];
  addEventListener('pageshow', (event) => window.__shows.push(event.persisted));
  addEventListener('vite:preloadError', () => sessionStorage.setItem('check:preloadErrors', String(Number(sessionStorage.getItem('check:preloadErrors') ?? 0) + 1)));
});
const state = () => page.evaluate((flag) => ({
  studio: !!document.querySelector('.pro-tl'),
  video: !!document.querySelector('video'),
  build2: [...document.scripts].some((script) => /\.v2\.js$/.test(script.src)),
  flag: sessionStorage.getItem(flag),
  preloadErrors: Number(sessionStorage.getItem('check:preloadErrors') ?? 0),
  restored: window.__shows.includes(true),
}), FLAG);

// Part one.
await deploy('1');
await page.goto(base + path);
await page.waitForSelector('.pro-tl', { timeout: 30000 });
await page.waitForTimeout(1000);
await page.evaluate(() => sessionStorage.clear());
await deploy('2');
await page.goto(elsewhere);
await page.waitForTimeout(500);
documents.length = 0;
await page.goBack({ waitUntil: 'commit', timeout: 10000 }).catch(() => {});
await page.waitForSelector('.pro-tl', { timeout: 20000 }).catch(() => {});
await page.waitForTimeout(1500);
out.back = { ...(await state()), documents: documents.length };
out.path = out.back.restored ? 'back-forward cache'
  : out.back.preloadErrors > 0 ? 'stale page from the HTTP cache, reloaded'
  : out.back.build2 ? 'page fetched again' : 'old page and all its chunks from the HTTP cache';
// A working player whichever way; after a failed import, it has to be the new build's.
out.backOk = out.back.studio && out.back.video && (out.back.preloadErrors === 0 || out.back.build2);
// The video plays after the reload.
out.plays = await page.evaluate(() => { const video = document.querySelector('video'); video.muted = true; return video.play().then(() => true, () => false); });
await page.evaluate(() => document.querySelector('video').pause());

// Part two.
await deploy('1');
await page.goto(elsewhere);
await page.goto(base + path);
await page.waitForSelector('.pro-tl', { timeout: 30000 });
await page.evaluate(() => sessionStorage.clear());
await deploy('gone');
documents.length = 0;
await page.reload().catch(() => {});
await page.waitForTimeout(8000);
const gone = await state().catch(() => ({}));
out.gone = { ...gone, documents: documents.length };
// Our reload, then the page's one reload: two documents, and the flag stays set.
out.noLoop = documents.length === 2 && gone.flag === '1' && gone.preloadErrors === 2;

// Part three.
await deploy('1');
await page.goto(elsewhere);
await page.goto(base + path);
await page.waitForSelector('.pro-tl', { timeout: 30000 });
out.flagBefore = (await state()).flag;
await page.waitForTimeout(11500);
out.flagAfter = (await state()).flag;
out.flagCleared = out.flagBefore === '1' && out.flagAfter === null;

if (errors.length) out.errors = errors;
out.pass = out.backOk && out.plays && out.noLoop && out.flagCleared;
return out;
