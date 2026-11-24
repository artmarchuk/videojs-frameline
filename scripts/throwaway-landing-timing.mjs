// Throwaway diagnostic: media events and currentTime writes while the landing page stages its player.
import playwright from 'playwright-core';
const baseUrl = process.argv[2];
const browser = await playwright.chromium.launch({ channel: 'chrome' });
for (let i = 0; i < 5; i++) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await page.addInitScript(() => {
    const log = (window.__log = []);
    const t0 = performance.now();
    const note = (what, video) => log.push(`${(performance.now() - t0).toFixed(0).padStart(5)} ms  ${what}  [t=${video.currentTime.toFixed(3)} rs=${video.readyState} seeking=${video.seeking} paused=${video.paused} dur=${Number.isFinite(video.duration) ? video.duration.toFixed(1) : video.duration} buf=${[...Array(video.buffered.length)].map((_, k) => video.buffered.start(k).toFixed(1) + '-' + video.buffered.end(k).toFixed(1)).join(',')}]`);
    const d = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'currentTime');
    Object.defineProperty(HTMLMediaElement.prototype, 'currentTime', { get() { return d.get.call(this); }, set(v) { note(`SET currentTime=${v}  (${new Error().stack.split('\n').slice(2, 6).map((s) => s.trim().replace(/https?:\/\/[^/]+\/assets\//, '').slice(0, 44)).join(' < ')})`, this); d.set.call(this, v); } });
    for (const name of ['play', 'pause', 'load']) { const f = HTMLMediaElement.prototype[name]; HTMLMediaElement.prototype[name] = function () { note(`CALL ${name}()`, this); return f.apply(this, arguments); }; }
    const seen = new WeakSet();
    const hook = () => { for (const v of document.querySelectorAll('video')) { if (seen.has(v)) continue; seen.add(v); note('video found', v); for (const e of ['loadstart', 'durationchange', 'loadedmetadata', 'loadeddata', 'canplay', 'seeking', 'seeked', 'play', 'playing', 'pause', 'waiting', 'emptied', 'ended', 'error']) v.addEventListener(e, () => note(e, v), true); } };
    new MutationObserver(hook).observe(document, { subtree: true, childList: true });
  });
  await page.goto(`${baseUrl}/`);
  await page.waitForFunction(() => document.querySelector('#player video')?.duration > 0, null, { timeout: 30000 });
  await page.waitForTimeout(6000);
  const seen = await page.evaluate(() => ({ field: (document.querySelector('#player .pro-timecode-values')?.textContent ?? '').slice(0, 11), time: document.querySelector('#player video').currentTime, log: window.__log }));
  console.log(`===== load ${i}: field ${seen.field}, currentTime ${seen.time}`);
  for (const line of seen.log.slice(0, 45)) console.log(line.slice(0, 330));
  await context.close();
}
await browser.close();
