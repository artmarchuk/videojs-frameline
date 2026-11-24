// Browser check: the embed page inside a cross-origin iframe (hard rule 8 in CLAUDE.md): playback, fullscreen and
// Copy link. Body of an async function; `page` on any page of a local build (`npm run build`, `npx vite preview`, so
// http://localhost:4173), 1440x900. The check navigates itself.
//
// The host page is fixtures/embed-host.html, which is not in the build. Serve that folder on another origin, for
// example `python3 -m http.server 4174 --bind 127.0.0.1 --directory scripts/browser-checks/fixtures`; the check
// expects it at http://127.0.0.1:4174/embed-host.html, or at `args.hostUrl`. The iframe then holds
// /embed.html of the page's own origin: another host and another port than the page around it.
// `args.playbackId` names the Mux video; without it the check uses the reel's ID from src/frame/media.ts.
// In Chromium, create the context with the `clipboard-read` and `clipboard-write` permissions so the copied link can
// be read back; elsewhere the check records the text the skin hands to the clipboard, and whether the copy worked.
//
// With `allow="fullscreen; clipboard-write"`:
// - the video plays inside the frame;
// - `F` asks for fullscreen on the player container (the Fullscreen API is stubbed, as in fullscreen-focus.js;
//   `fullscreenEnabled` before the stub says whether the iframe was allowed fullscreen);
// - three frame steps, then `S`: the copied URL is the embed's own URL, query unchanged (`mux`, `tier`, `fps`), with
//   the frame in its hash; the link button shows its check and "Link copied, <timecode>" is announced;
// - that URL opened in a new tab shows the same video paused on the same frame.
// With `allow="fullscreen"` (no `clipboard-write`): what `S` does is recorded as `out.withoutPermission`. Where the
// engine refuses, there is no check on the button and "Could not copy" is announced; where the engine still copies
// (the skin falls back to a selection copy, which the permission policy does not cover), the copy is announced as
// usual. Either is consistent: the check fails only if the player says one thing and does another.
// Pages, windows and options for the runner (`npm run check:browsers`): manifest.mjs.
const out = {};
const here = new URL(page.url());
const hostPage = (typeof args !== 'undefined' && args?.hostUrl) || 'http://127.0.0.1:4174/embed-host.html';
const playbackId = (typeof args !== 'undefined' && args?.playbackId) || '9Y7a3hqNCi4u02fmBFbaK5qWoS6A5cPce7P1mA00JA02tY';
const embedUrl = `${here.origin}/embed.html?tier=studio&fps=24&mux=${playbackId}`;
const hostUrl = (allow) => `${hostPage}?allow=${encodeURIComponent(allow)}&embed=${encodeURIComponent(embedUrl)}`;
const canRead = (await page.evaluate(() => navigator.permissions?.query({ name: 'clipboard-read' }).then((p) => p.state, () => 'unknown'))) === 'granted';

const open = async (allow) => {
  await page.goto('about:blank');
  await page.goto(hostUrl(allow));
  const element = await page.waitForSelector('iframe');
  const frame = await element.contentFrame();
  await frame.waitForFunction(() => document.querySelector('video')?.duration > 0, null, { timeout: 30000 });
  await frame.waitForSelector('.pro-tl'); await page.waitForTimeout(800);
  // Record what the skin hands to the clipboard, and whether the browser took it.
  await frame.evaluate(() => {
    window.__copy = { text: null, async: null, exec: null };
    const write = navigator.clipboard?.writeText?.bind(navigator.clipboard);
    if (write) navigator.clipboard.writeText = (text) => { window.__copy.text = text; return write(text).then((v) => { window.__copy.async = 'ok'; return v; }, (e) => { window.__copy.async = e.name; throw e; }); };
    const exec = document.execCommand.bind(document);
    document.execCommand = (command, ...rest) => { const ok = exec(command, ...rest); if (command === 'copy') { window.__copy.exec = ok; window.__copy.text ??= document.activeElement?.value ?? null; } return ok; };
  });
  return frame;
};
const said = (frame) => frame.evaluate(() => [...document.querySelectorAll('.pro-skin [role="status"]')].map((e) => e.textContent).join(' | '));
const field = (frame) => frame.evaluate(() => document.querySelector('[data-pro-timecode]').textContent.trim().replace(/^≈/, '').slice(0, 11));
const stepAndCopy = async (frame) => {
  await frame.evaluate(() => { const v = document.querySelector('video'); v.pause(); v.currentTime = 14; });
  await frame.waitForFunction(() => { const v = document.querySelector('video'); return !v.seeking && Math.abs(v.currentTime - 14) < 0.1; });
  await frame.focus('.pro-skin .pro-transport .media-play-button');
  for (let i = 0; i < 3; i++) { await page.keyboard.press('.'); await page.waitForTimeout(450); }
  const timecode = await field(frame);
  await page.keyboard.press('s'); await page.waitForTimeout(400);
  const seen = await frame.evaluate(() => ({ check: document.querySelector('.pro-tool-link')?.hasAttribute('data-copied') ?? false, toast: document.querySelector('.pro-toast')?.textContent ?? null, ...window.__copy }));
  return { timecode, said: await said(frame), ...seen };
};

/* ---------- With clipboard-write ---------- */
let frame = await open('fullscreen; clipboard-write');
out.origins = { host: new URL(hostPage).origin, embed: await frame.evaluate(() => location.origin) };
const checks = { crossOrigin: out.origins.host !== out.origins.embed };

// Playback.
await frame.evaluate(() => { const v = document.querySelector('video'); v.muted = true; return v.play().catch(() => {}); });
checks.plays = await frame.waitForFunction(() => { const v = document.querySelector('video'); return !v.paused && v.currentTime > 0.5; }, null, { timeout: 20000 }).then(() => true, () => false);
await frame.evaluate(() => document.querySelector('video').pause());

// Fullscreen: allowed by the iframe, and `F` asks for it on the container.
out.fullscreenEnabled = await frame.evaluate(() => document.fullscreenEnabled ?? document.webkitFullscreenEnabled ?? null);
await frame.evaluate(() => {
  window.__fs = { calls: [], element: null };
  Object.defineProperty(document, 'fullscreenEnabled', { value: true, configurable: true });
  Object.defineProperty(document, 'fullscreenElement', { get: () => window.__fs.element, configurable: true });
  Element.prototype.requestFullscreen = function () { window.__fs.calls.push(this.className.toString().split(' ').includes('pro-skin') ? 'container' : this.tagName); window.__fs.element = this; document.dispatchEvent(new Event('fullscreenchange')); return Promise.resolve(); };
  document.exitFullscreen = () => { window.__fs.element = null; document.dispatchEvent(new Event('fullscreenchange')); return Promise.resolve(); };
});
await frame.focus('.pro-skin .pro-transport .media-play-button');
await page.keyboard.press('f'); await page.waitForTimeout(250);
out.fullscreenCalls = await frame.evaluate(() => [...window.__fs.calls]);
await page.keyboard.press('f'); await page.waitForTimeout(250);
checks.fullscreen = out.fullscreenEnabled !== false && out.fullscreenCalls[0] === 'container';

// Copy link: the embed's own URL, with the frame.
const copy = await stepAndCopy(frame);
const read = canRead ? await page.evaluate(() => navigator.clipboard.readText()).catch((error) => `unreadable: ${error.name}`) : null;
out.copy = { ...copy, clipboard: read, readBack: canRead };
const copiedUrl = canRead && read && !read.startsWith('unreadable') ? read : copy.text;
out.copiedUrl = copiedUrl;
let parsed = null;
try { parsed = new URL(copiedUrl); } catch { /* reported below */ }
const expected = new URL(embedUrl);
checks.embedUrl = !!parsed && parsed.origin === expected.origin && parsed.pathname === expected.pathname;
checks.queryUnchanged = !!parsed && parsed.search === expected.search;
checks.hash = !!parsed && new RegExp(`^#t=\\d+(\\.\\d{1,3})?&tc=${copy.timecode}$`).test(parsed.hash);
// Three steps from 14 s at 24 fps: frame 336 + 3.
checks.frame = copy.timecode === '00:00:14:03';
checks.copied = (copy.async === 'ok' || copy.exec === true) && copy.check && copy.said.includes(`Link copied, ${copy.timecode}`);
if (canRead) checks.clipboardHoldsIt = read === copy.text;

// The copied URL in a new tab: the same video, paused on the same frame.
if (parsed) {
  const tab = await page.context().newPage();
  await tab.goto(copiedUrl);
  await tab.waitForFunction(() => document.querySelector('video')?.duration > 0, null, { timeout: 30000 });
  await tab.waitForFunction((tc) => document.querySelector('[data-pro-timecode]')?.textContent.includes(tc), copy.timecode, { timeout: 15000 }).catch(() => {});
  await tab.waitForTimeout(1200);
  out.opened = await tab.evaluate(() => {
    const video = document.querySelector('video');
    return { field: document.querySelector('[data-pro-timecode]').textContent.trim().replace(/^≈/, '').slice(0, 11), time: video.currentTime, paused: video.paused, duration: video.duration, query: location.search };
  });
  const original = await frame.evaluate(() => document.querySelector('video').duration);
  checks.opensSameFrame = out.opened.field === copy.timecode && out.opened.paused && Math.floor(out.opened.time * 24 + 0.01) === 14 * 24 + 3;
  // The reel's duration shrinks by 40 ms once it has played (NOTES.md, Unverified), so the two are compared loosely.
  checks.opensSameVideo = out.opened.query === expected.search && Math.abs(out.opened.duration - original) < 0.25;
  await tab.close();
}

/* ---------- Without clipboard-write ---------- */
frame = await open('fullscreen');
// Something else on the clipboard first, so a read after the copy shows whether the link really arrived.
const MARKER = 'embed-link check: not a link';
if (canRead) await page.evaluate((text) => navigator.clipboard.writeText(text), MARKER).catch(() => {});
const refused = await stepAndCopy(frame);
const copiedAnyway = refused.async === 'ok' || refused.exec === true;
const readAfter = canRead ? await page.evaluate(() => navigator.clipboard.readText()).catch((error) => `unreadable: ${error.name}`) : null;
out.withoutPermission = {
  ...refused,
  engineRefused: !copiedAnyway,
  clipboard: readAfter,
  how: copiedAnyway ? (refused.async === 'ok' ? 'the async clipboard took it' : 'the async clipboard refused; the selection copy took it') : 'both the async clipboard and the selection copy refused',
};
// The player must say what happened: a failure announced with no check, or a copy announced with the check.
checks.withoutPermissionHonest = copiedAnyway
  ? refused.check && refused.said.includes(`Link copied, ${refused.timecode}`)
  : !refused.check && /Could not copy/.test(`${refused.said} ${refused.toast ?? ''}`);
if (canRead && readAfter !== null && !readAfter.startsWith('unreadable')) checks.withoutPermissionClipboard = copiedAnyway ? readAfter === refused.text : readAfter === MARKER;

out.checks = checks;
out.pass = Object.values(checks).every(Boolean);
return out;
