// Browser check: a page opened with a link position opens paused on that frame. Body of an async function; `page` on
// any page of the site (local build or the public URL); the check navigates itself. It opens
// /preview.html?tier=studio&media=cosmicDawn (30 fps, over a minute long, so 62 s is inside it) once per link:
// the new format (`#t=62.104&tc=00:01:02:02`), the format before `tc` (`#t=00:01:02:02`) and the video platforms'
// shorthand (`#t=1m2s`), and expects the timecode field to show the frame, the media time to sit inside that frame,
// and the video to be paused. A link with `tc` and a `t` far from it opens on `tc`.
const out = {};
const base = new URL('/preview.html?tier=studio&media=cosmicDawn', page.url()).href;
const cases = [
  { hash: '#t=62.104&tc=00:01:02:02', timecode: '00:01:02:02', frame: 62 * 30 + 2 },
  { hash: '#t=00:01:02:02', timecode: '00:01:02:02', frame: 62 * 30 + 2 },
  { hash: '#t=1m2s', timecode: '00:01:02:00', frame: 62 * 30 },
  { hash: '#t=10&tc=00:00:20:05', timecode: '00:00:20:05', frame: 20 * 30 + 5 },
];
const checks = {};
for (const { hash, timecode, frame } of cases) {
  await page.goto('about:blank');
  await page.goto(base + hash);
  await page.waitForFunction(() => document.querySelector('video')?.duration > 0, null, { timeout: 30000 });
  await page.waitForFunction((tc) => document.querySelector('[data-pro-timecode]')?.textContent.includes(tc), timecode, { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(600);
  const seen = await page.evaluate(() => {
    const video = document.querySelector('video');
    return { field: document.querySelector('[data-pro-timecode]').textContent.trim().replace(/^≈/, '').slice(0, 11), time: video.currentTime, paused: video.paused, hash: location.hash };
  });
  const inFrame = Math.floor(seen.time * 30 + 0.01) === frame;
  checks[hash] = seen.field === timecode && inFrame && seen.paused && seen.hash === hash;
  out[hash] = { ...seen, expected: timecode, inFrame };
}
out.checks = checks;
out.pass = Object.values(checks).every(Boolean);
return out;
