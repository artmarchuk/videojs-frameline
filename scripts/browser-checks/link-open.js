// Browser check: a page opened with a link position opens paused on that frame. Body of an async function; `page` on
// any page of the site (local build or the public URL); the check navigates itself. It opens
// /preview.html?tier=studio&media=cosmicDawn (30 fps, over a minute long, so 62 s is inside it) once per link:
// the new format (`#t=62.104&tc=00:01:02:02`), the format before `tc` (`#t=00:01:02:02`) and the video platforms'
// shorthand (`#t=1m2s`), and expects the timecode field to show the frame, the media time to sit inside that frame,
// and the video to be paused. A link with `tc` and a `t` far from it opens on `tc`.
// The same holds when the host autoplays (`autoplay=1&muted=1` in the hash, the monitor page's own option): such a
// player is still paused on the frame 2.5 s later. Autoplay without a link, or with a link that names no frame, must
// play, which also proves that the autoplay cases really autoplay.
// A seek the skin didn't make must not replace the link's frame (`foreign seek: …`): the page seeks to 0.1213 s, as
// the streaming engine does to skip a gap at the start of a stream, while the link's own seek is still running. The
// case opens the page with `&foreignSeek=1`, which the page ignores and the check's init script reads. `out.orders`
// holds the event order of those loads.
// Pages, windows and options for the runner (`npm run check:browsers`): manifest.mjs.
const out = {};
const base = new URL('/preview.html?tier=studio&media=cosmicDawn', page.url()).href;
const cases = [
  { hash: '#t=62.104&tc=00:01:02:02', timecode: '00:01:02:02', frame: 62 * 30 + 2 },
  { hash: '#t=00:01:02:02', timecode: '00:01:02:02', frame: 62 * 30 + 2 },
  { hash: '#t=1m2s', timecode: '00:01:02:00', frame: 62 * 30 },
  { hash: '#t=10&tc=00:00:20:05', timecode: '00:00:20:05', frame: 20 * 30 + 5 },
];
const autoplay = '#autoplay=1&muted=1';
for (const linked of [...cases]) cases.push({ ...linked, hash: `${autoplay}&${linked.hash.slice(1)}`, hold: 2500 });
for (const linked of cases.filter((entry) => entry.hash.endsWith('t=10&tc=00:00:20:05'))) cases.push({ ...linked, foreign: true });
// With `foreignSeek` in the query: one seek to 0.1213 s, inside the first `seeking` that is not at the start. The
// listener is on the document and catches the event on its way down, so it runs before the skin's own.
await page.addInitScript(() => {
  if (!new URLSearchParams(location.search).has('foreignSeek')) return;
  const order = (window.__order = []);
  const note = (text) => order.push(`${Math.round(performance.now())} ms ${text}`);
  let done = false;
  for (const type of ['loadedmetadata', 'seeking', 'seeked']) {
    document.addEventListener(type, (event) => {
      const video = event.target;
      note(`${type} at ${video.currentTime.toFixed(4)}`);
      if (type !== 'seeking' || done || video.currentTime < 1) return;
      done = true;
      video.currentTime = 0.1213;
      note('foreign seek to 0.1213');
    }, true);
  }
});
const checks = {};
out.orders = {};
for (const { hash, timecode, frame, hold = 600, foreign = false } of cases) {
  await page.goto('about:blank');
  await page.goto(base + (foreign ? '&foreignSeek=1' : '') + hash);
  await page.waitForFunction(() => document.querySelector('video')?.duration > 0, null, { timeout: 30000 });
  await page.waitForFunction((tc) => document.querySelector('[data-pro-timecode]')?.textContent.includes(tc), timecode, { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(hold);
  const seen = await page.evaluate(() => {
    const video = document.querySelector('video');
    return { field: document.querySelector('[data-pro-timecode]').textContent.trim().replace(/^≈/, '').slice(0, 11), time: video.currentTime, paused: video.paused, hash: location.hash };
  });
  const inFrame = Math.floor(seen.time * 30 + 0.01) === frame;
  const name = foreign ? `foreign seek: ${hash}` : hash;
  checks[name] = seen.field === timecode && inFrame && seen.paused && seen.hash === hash;
  out[name] = { ...seen, expected: timecode, inFrame };
  if (foreign) {
    out.orders[hash] = await page.evaluate(() => window.__order);
    // The case proves nothing unless the foreign seek really happened.
    checks[`${name} (the foreign seek ran)`] = out.orders[hash].some((line) => line.includes('foreign seek'));
  }
}
for (const hash of [autoplay, `${autoplay}&t=banana`, `${autoplay}&t=9999`]) {
  await page.goto('about:blank');
  await page.goto(base + hash);
  const plays = await page
    .waitForFunction(() => { const video = document.querySelector('video'); return video && !video.paused && video.currentTime > 2; }, null, { timeout: 20000 })
    .then(() => true, () => false);
  checks[hash] = plays;
  out[hash] = { plays };
}
out.checks = checks;
out.pass = Object.values(checks).every(Boolean);
return out;
