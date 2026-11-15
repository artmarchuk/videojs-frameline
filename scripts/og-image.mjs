// Generates the social image (og:image, twitter:image): the Studio monitor with a range and guides on, 1200x630.
//
//   npm run build && npm run preview            # serves dist/ on http://localhost:4173
//   node scripts/og-image.mjs [url] [out]       # default url: http://localhost:4173, out: apps/preview/public/og.png
//
// It drives the installed Google Chrome (for H.264) through playwright-core, which is not a dependency of this
// project: install it without saving (`npm i --no-save playwright-core`), or point PLAYWRIGHT at a copy of it.
import { fileURLToPath } from 'node:url';

const { chromium } = await import(process.env.PLAYWRIGHT ?? 'playwright-core');

const base = (process.argv[2] ?? 'http://localhost:4173').replace(/\/$/, '');
const out = process.argv[3] ?? fileURLToPath(new URL('../apps/preview/public/og.png', import.meta.url));

/** The moment shown, and the range marked around it, in seconds of the active demo source. */
const SHOT = { time: 69, in: 62, out: 80 };

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1, colorScheme: 'dark' });
const page = await context.newPage();

// The guides are the end user's remembered choice: set it before the player starts.
await page.addInitScript(() => {
  try {
    localStorage.setItem('frameline:v1', JSON.stringify({ v: 1, guides: ['title-safe', 'thirds'], crop: null, zones: null, timeDisplay: 'timecode' }));
  } catch {
    // Without storage the image has no guides.
  }
});
await page.goto(`${base}/preview.html?tier=studio`, { waitUntil: 'load' });
// The monitor page without its top bar, the player sized so that stage and dock fit the image with an even margin.
await page.addStyleTag({
  content: `
    .monitor-bar { display: none !important; }
    body { background: #151517 !important; }
    .preview-page { display: grid; place-items: center; padding: 0 !important; }
    .preview-player { max-width: 880px !important; }
    .monitor-stage .media-skin[data-layout] { max-height: none !important; }
  `,
});
await page.waitForFunction(() => document.querySelector('video')?.duration > 0, null, { timeout: 30000 });

const seek = async (time) => {
  await page.evaluate((t) => {
    const video = document.querySelector('video');
    video.pause();
    video.currentTime = t;
  }, time);
  await page.waitForFunction(() => !document.querySelector('video').seeking, null, { timeout: 15000 });
  // The skin marks In and Out at the frame its clock reports, which follows the seek by a frame or two.
  await page.waitForFunction((t) => (document.querySelector('.pro-skin [class*="timecode"]')?.textContent ?? '').includes(t), new Date(time * 1000).toISOString().slice(11, 19), { timeout: 15000 });
  await page.waitForTimeout(300);
};

await page.focus('.pro-skin');
await seek(SHOT.in);
await page.keyboard.press('i');
await seek(SHOT.out);
await page.keyboard.press('o');
await seek(SHOT.time);
// Let the best rendition for this size arrive, and the toast of the last key leave.
await page.waitForTimeout(4000);
await page.mouse.move(0, 0);

await page.screenshot({ path: out, type: 'png' });
await browser.close();
console.log(`Wrote ${out}`);
