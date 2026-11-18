// Generates the social card (og:image, twitter:image), 1200x630: the Video.js • Frameline lockup, the tagline and the
// descriptor from the Brand content doc, over a crop of the real Studio dock as the landing page's hero opens it.
//
//   npm run build && npm run preview            # serves dist/ on http://localhost:4173
//   node scripts/og-image.mjs [url] [out]       # default url: http://localhost:4173, out: apps/preview/public/og.png
//
// Words: the Brand content doc (lockup "Video.js • [icon] Frameline", tagline, descriptor, site). Colours, type,
// radius and the player's rim and shadow: the landing page's tokens (apps/preview/src/page/tokens.css), read here so
// the card follows them. It drives the installed Google Chrome (for H.264) through playwright-core.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const { chromium } = await import(process.env.PLAYWRIGHT ?? 'playwright-core');

const base = (process.argv[2] ?? 'http://localhost:4173').replace(/\/$/, '');
const out = process.argv[3] ?? fileURLToPath(new URL('../apps/preview/public/og.png', import.meta.url));
const tokens = readFileSync(new URL('../apps/preview/src/page/tokens.css', import.meta.url), 'utf8');
const mark = readFileSync(new URL('../apps/preview/src/page/assets/mark.svg', import.meta.url), 'utf8');

/** The card's words, from the Brand content doc. */
const WORDS = {
  tagline: 'A monitor, not just a player.',
  descriptor: 'A Video.js skin that adds a preview monitor to the player in your video tool.',
  site: 'frameline.artmarchuk.me',
};

const CARD = { width: 1200, height: 630 };
/** The crop of the hero player: its left part, the lower edge of the picture and the whole dock, in CSS px. */
const CROP = { width: 1100, picture: 196 };

const browser = await chromium.launch({ channel: 'chrome', headless: true });

// 1. The dock, as the hero opens it: staged range, playhead, guides. Shot at 2x for a sharp card.
const site = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, colorScheme: 'dark' });
const page = await site.newPage();
await page.goto(`${base}/`, { waitUntil: 'load' });
await page.waitForFunction(
  () => document.querySelector('#player [data-dock-size]') && !document.querySelector('#player[data-staging]') && document.querySelector('#player video')?.duration > 0,
  null,
  { timeout: 30000 }
);
// Let the best rendition arrive.
await page.waitForTimeout(4000);
await page.mouse.move(0, 0);
const player = await page.evaluate(() => {
  const box = document.querySelector('#player').getBoundingClientRect();
  return { x: box.x + scrollX, y: box.y + scrollY, width: box.width, height: box.height };
});
const dock = await page.evaluate(() => document.querySelector('#player .pro-bar').getBoundingClientRect().height);
const width = Math.min(CROP.width, player.width);
const height = CROP.picture + dock;
const crop = await page.screenshot({ fullPage: true, clip: { x: player.x, y: player.y + player.height - height, width, height } });
await site.close();

// 2. The card.
const card = await browser.newContext({ viewport: CARD, deviceScaleFactor: 1, colorScheme: 'dark' });
const sheet = await card.newPage();
await sheet.setContent(`<!doctype html>
<html lang="en"><head><meta charset="utf-8" />
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Google+Sans+Flex:wght@400;800&display=block" />
<style>
${tokens}
* { box-sizing: border-box; margin: 0; }
body { width: ${CARD.width}px; height: ${CARD.height}px; overflow: hidden; background: var(--bg); color: var(--text); font: var(--type-body); -webkit-font-smoothing: antialiased; }
.card { position: relative; height: 100%; padding: 48px 50px 0; }
.top { display: flex; align-items: center; justify-content: space-between; }
.lockup { display: flex; align-items: center; gap: 12px; font: 400 24px / 1 var(--family-ui); letter-spacing: -0.01em; }
.lockup .muted { color: var(--dim); }
.lockup svg { width: 30px; height: 30px; }
.site { color: var(--dim); font: 400 20px / 1 var(--family-ui); }
h1 { margin-top: 52px; font: 800 68px / 1.04 var(--family-ui); letter-spacing: var(--type-h1-tracking); }
p.descriptor { margin-top: 18px; color: var(--dim); font: 400 28px / 1.25 var(--family-ui); letter-spacing: var(--type-claim-small-tracking); text-wrap: balance; }
.dock { position: absolute; left: 50px; bottom: 0; width: ${width}px; height: ${height}px; overflow: hidden; border-radius: var(--radius-player) var(--radius-player) 0 0; box-shadow: var(--elevation-player-shadow); }
.dock img { display: block; width: 100%; height: 100%; }
.dock::after { position: absolute; inset: 0 0 -2px; border-radius: inherit; box-shadow: var(--elevation-player-rim); content: ""; }
</style></head>
<body><div class="card">
  <div class="top">
    <div class="lockup"><span class="muted">Video.js</span><span class="muted">•</span>${mark}<span>Frameline</span></div>
    <div class="site">${WORDS.site}</div>
  </div>
  <h1>${WORDS.tagline}</h1>
  <p class="descriptor">${WORDS.descriptor}</p>
  <div class="dock"><img alt="" src="data:image/png;base64,${crop.toString('base64')}" /></div>
</div></body></html>`);
await sheet.evaluate(() => document.fonts.ready);
if (!(await sheet.evaluate(() => document.fonts.check('800 68px "Google Sans Flex"'))))
  throw new Error('Google Sans Flex did not load; the card would fall back to a system font');
// The descriptor keeps its size: one line if it fits, otherwise two balanced lines (text-wrap: balance).
const lines = await sheet.evaluate(() => {
  const p = document.querySelector('p.descriptor');
  return Math.round(p.getBoundingClientRect().height / parseFloat(getComputedStyle(p).lineHeight));
});
const overlap = await sheet.evaluate(() => document.querySelector('p.descriptor').getBoundingClientRect().bottom > document.querySelector('.dock').getBoundingClientRect().top);
if (overlap) throw new Error('The descriptor runs into the dock crop; lower CROP.picture');
await sheet.screenshot({ path: out, type: 'png' });
await browser.close();
console.log(`Wrote ${out} (${CARD.width}x${CARD.height}), the descriptor on ${lines} line${lines > 1 ? 's' : ''}: a ${width}x${height} px crop, the picture's lower ${CROP.picture} px and the ${dock} px dock`);
