// The consumer check: `npm run check:consumer`. Tests the npm package the way a host uses it.
//
// 1. Builds the package (`npm run build:lib`) and packs it (`npm pack`) into a temp folder outside the repo.
// 2. Copies template/ into a new app in that folder, installs the tarball and the peers at the versions this repo
//    tests (its devDependencies), and type-checks the app's source with `tsc` against the published types.
// 3. Builds the app for production and serves it: `viewer`, `studio` and `stock` (the stock Video.js skin).
// 4. Drives the pages with Playwright in Chromium (the installed Google Chrome, so H.264 plays), Firefox and WebKit,
//    and measures what each page loads before its first frame plays.
//
// Options: `--engines=chromium,firefox` (default all three), `--keep` (leave the temp folder; its path is printed).
// Writes report.json and screenshots into the temp folder. Exits with 1 if a check fails. Needs the network (npm
// registry, the Mux stream) and Playwright's browsers (`npx playwright-core install firefox webkit`).
import { execFileSync, spawn } from 'node:child_process';
import { cpSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

const repo = new URL('../../', import.meta.url).pathname;
const require = createRequire(join(repo, 'package.json'));
const playwright = require('playwright-core');
const repoPackage = JSON.parse(readFileSync(join(repo, 'package.json'), 'utf8'));

const flag = (name) => process.argv.find((arg) => arg.startsWith(`--${name}`));
const engines = (flag('engines')?.split('=')[1] ?? 'chromium,firefox,webkit').split(',');
const keep = Boolean(flag('keep'));
// Not 4190: browsers refuse the ports on the Fetch standard's "bad ports" list, and 4190 (ManageSieve) is one.
const port = 4188;
// An IP address, not `localhost`: Firefox and WebKit may resolve `localhost` to IPv6 where the server listens on IPv4.
const base = `http://127.0.0.1:${port}`;

const run = (command, args, cwd) => execFileSync(command, args, { cwd, stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8' });
const log = (message) => console.log(`[consumer] ${message}`);

/* ---------- 1. Build and pack ---------- */

const work = mkdtempSync(join(tmpdir(), 'frameline-consumer-'));
log(`working in ${work}`);
run('npm', ['run', 'build:lib'], repo);
const packed = JSON.parse(run('npm', ['pack', '--json', '--pack-destination', work], repo))[0];
const tarball = join(work, packed.filename);
log(`packed ${packed.filename}: ${packed.files.length} files, ${packed.size} bytes`);

/* ---------- 2. The host app ---------- */

const app = join(work, 'app');
cpSync(new URL('./template/', import.meta.url).pathname, app, { recursive: true });
const tested = (name) => repoPackage.devDependencies[name];
const appPackage = JSON.parse(readFileSync(join(app, 'package.json'), 'utf8'));
appPackage.dependencies = {
  'videojs-frameline': `file:${tarball}`,
  // The peers, at the versions this repo tests.
  react: tested('react'),
  'react-dom': tested('react-dom'),
  '@videojs/react': tested('@videojs/react'),
  '@videojs/core': tested('@videojs/core'),
  '@videojs/utils': tested('@videojs/utils'),
  // The media element the pages use, as on the site.
  '@videojs/mux-video': tested('@videojs/mux-video'),
};
appPackage.devDependencies = Object.fromEntries(
  ['vite', '@vitejs/plugin-react', 'typescript', '@types/react', '@types/react-dom'].map((name) => [name, tested(name)])
);
writeFileSync(join(app, 'package.json'), `${JSON.stringify(appPackage, null, 2)}\n`);
log('installing the app');
run('npm', ['install', '--no-audit', '--no-fund', '--loglevel=error'], app);

const report = { package: { name: packed.name, version: packed.version, files: packed.files.map((file) => file.path), size: packed.size, unpackedSize: packed.unpackedSize }, checks: {}, weight: {} };
const results = report.checks;
const record = (name, pass, detail) => {
  results[name] = { pass, ...(detail === undefined ? {} : { detail }) };
  log(`${pass ? 'PASS' : 'FAIL'} ${name}${pass || detail === undefined ? '' : `: ${JSON.stringify(detail).slice(0, 400)}`}`);
};

// The app imports nothing but the package name: no source path, no alias.
const appSource = readdirSync(join(app, 'src')).map((file) => readFileSync(join(app, 'src', file), 'utf8')).join('\n');
record('imports only the package name', !/from '[^']*(\/src\/|@\/)/.test(appSource) && appSource.includes("from 'videojs-frameline'"));

try {
  run('npx', ['tsc', '--noEmit'], app);
  record('tsc against the published types', true);
} catch (error) {
  record('tsc against the published types', false, String(error.stdout || error.message).slice(0, 2000));
}

run('npx', ['vite', 'build'], app);
const manifest = JSON.parse(readFileSync(join(app, 'dist/.vite/manifest.json'), 'utf8'));
const chunkReport = JSON.parse(readFileSync(join(app, 'chunk-report.json'), 'utf8'));

// Which output files hold the package's pro code: the chunks built from lib/runtime-*, lib/studio-*, lib/debug-*,
// and their CSS. The Viewer page must request none of them.
const proChunks = chunkReport.filter((chunk) => chunk.modules.some((module) => /videojs-frameline\/lib\/(runtime|studio|debug)-[^/]+\.js$/.test(module.id)));
const proFiles = new Set(proChunks.flatMap((chunk) => [chunk.fileName, ...chunk.css]));
record('the app build has separate pro chunks', proChunks.length >= 3 && proChunks.every((chunk) => !chunk.isEntry), proChunks.map((chunk) => chunk.fileName));

/* ---------- 3. Serve ---------- */

const server = spawn('npx', ['vite', 'preview', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { cwd: app, stdio: 'ignore' });
const stop = () => server.kill();
process.on('exit', stop);
for (let i = 0; i < 50; i++) {
  try {
    await fetch(`${base}/viewer.html`);
    break;
  } catch {
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
}

/* ---------- 4. Playwright ---------- */

const launch = (engine) => playwright[engine].launch(engine === 'chromium' ? { channel: 'chrome', headless: true } : { headless: true });
const ready = (page) => page.waitForFunction(() => document.querySelector('video')?.duration > 0, null, { timeout: 45000 });
const fileOf = (url) => new URL(url).pathname.replace(/^\//, '');
/** Opens a page of the app. `domcontentloaded`: the stream keeps the network busy, and the checks wait for the video. */
const open = (page, path) => page.goto(`${base}/${path}`, { waitUntil: 'domcontentloaded' });

async function viewerChecks(browser, engine) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  const requested = [];
  page.on('request', (request) => requested.push(request.url()));
  await open(page, 'viewer.html');
  await ready(page);
  await page.waitForTimeout(1000);
  // Styled by skin.css: the overlay bar's scrim and the container's query container.
  const style = await page.evaluate(() => {
    const bar = document.querySelector('.pro-bar');
    const skin = document.querySelector('.pro-skin');
    return { barImage: bar ? getComputedStyle(bar).backgroundImage : null, container: skin ? getComputedStyle(skin).containerType : null };
  });
  record(`${engine} viewer: styled`, /linear-gradient/.test(style.barImage ?? '') && style.container === 'inline-size', style);
  // Play, pause, seek with the Viewer's own controls and keys.
  await page.locator('.pro-bar .media-play-button').click();
  const played = await page.waitForFunction(() => document.querySelector('video').currentTime > 0.5, null, { timeout: 20000 }).then(() => true, () => false);
  await page.keyboard.press('k');
  await page.waitForTimeout(400);
  const paused = await page.evaluate(() => document.querySelector('video').paused);
  const before = await page.evaluate(() => document.querySelector('video').currentTime);
  await page.locator('.media-time-slider').focus();
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(800);
  const after = await page.evaluate(() => document.querySelector('video').currentTime);
  record(`${engine} viewer: play, pause, seek`, played && paused && after - before > 3, { played, paused, before, after });
  const proRequested = requested.map(fileOf).filter((file) => proFiles.has(file));
  record(`${engine} viewer: no pro runtime, Studio JS or Studio CSS requested`, proRequested.length === 0, proRequested);
  await page.screenshot({ path: join(work, `viewer-${engine}.png`) });
  await context.close();
}

async function studioChecks(browser, engine) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 860 }, acceptDownloads: true });
  const page = await context.newPage();
  await open(page, 'studio.html');
  await ready(page);
  await page.waitForSelector('.pro-tl');
  await page.waitForTimeout(1000);
  const dock = await page.evaluate(() => getComputedStyle(document.querySelector('.pro-skin[data-layout="dock"] .pro-bar')).backgroundColor);
  record(`${engine} studio: the dock renders`, dock === 'rgb(23, 23, 23)', dock);
  // `.` steps one frame: the timecode moves on by one.
  await page.evaluate(() => { const video = document.querySelector('video'); video.pause(); video.currentTime = 10; });
  await page.waitForFunction(() => { const video = document.querySelector('video'); return !video.seeking && Math.abs(video.currentTime - 10) < 0.1; });
  await page.waitForTimeout(500);
  const timecode = () => page.evaluate(() => document.querySelector('[data-pro-timecode]').textContent.trim().replace(/^≈/, '').slice(0, 11));
  await page.locator('.pro-transport .media-play-button').focus();
  const first = await timecode();
  await page.keyboard.press('.');
  await page.waitForTimeout(600);
  const second = await timecode();
  record(`${engine} studio: . steps a frame`, first === '00:00:10:00' && second === '00:00:10:01', { first, second });
  // `G` grabs the frame as a PNG.
  const download = page.waitForEvent('download', { timeout: 8000 }).then((item) => item.suggestedFilename(), () => null);
  await page.keyboard.press('g');
  const file = await download;
  record(`${engine} studio: G grabs the frame`, /\.png$/.test(file ?? ''), file);
  // The Guides button opens the Guides menu.
  await page.locator('[data-pro-menu="guides"]').click();
  await page.waitForTimeout(600);
  const menu = await page.evaluate(() => ({
    expanded: document.querySelector('[data-pro-menu="guides"]').getAttribute('aria-expanded'),
    // Every menu is in the DOM; only the open one has a box.
    open: [...document.querySelectorAll('[role="menu"]')].filter((element) => element.getClientRects().length).map((element) => element.textContent),
  }));
  record(`${engine} studio: the Guides menu opens`, menu.expanded === 'true' && menu.open.length === 1 && menu.open[0].includes('Title safe'), menu);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  await page.screenshot({ path: join(work, `studio-${engine}.png`) });
  await context.close();
}

/** linkUrl, read back from the clipboard: Chromium only, where Playwright can grant clipboard access. */
async function linkChecks(browser) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 860 }, permissions: ['clipboard-read', 'clipboard-write'] });
  const page = await context.newPage();
  const MARKER = 'consumer check: not a link';
  for (const mode of ['none', 'string', 'function', 'null']) {
    await open(page, `studio.html${mode === 'none' ? '' : `?link=${mode}`}`);
    await ready(page);
    await page.waitForSelector('.pro-tool-link');
    await page.evaluate(() => { const video = document.querySelector('video'); video.pause(); video.currentTime = 14; });
    await page.waitForFunction(() => { const video = document.querySelector('video'); return !video.seeking && Math.abs(video.currentTime - 14) < 0.1; });
    await page.waitForTimeout(500);
    await page.evaluate((text) => navigator.clipboard.writeText(text), MARKER);
    const liveBefore = await page.evaluate(() => [...document.querySelectorAll('.pro-skin [role="status"]')].map((element) => element.textContent).join('|'));
    await page.locator('.pro-transport .media-play-button').focus();
    await page.keyboard.press('s');
    await page.waitForTimeout(600);
    const seen = await page.evaluate(() => ({
      check: document.querySelector('.pro-tool-link').hasAttribute('data-copied'),
      live: [...document.querySelectorAll('.pro-skin [role="status"]')].map((element) => element.textContent).join('|'),
      copied: window.__frameline.copied,
      asked: window.__frameline.asked,
      page: location.origin + location.pathname + location.search,
    }));
    const clipboard = await page.evaluate(() => navigator.clipboard.readText());
    const fragment = /^t=14\.\d{1,3}&tc=00:00:14:00$/;
    const hashOf = (url) => url.slice(url.indexOf('#') + 1);
    let pass;
    if (mode === 'none') pass = clipboard.startsWith(`${seen.page}#`) && fragment.test(hashOf(clipboard)) && seen.copied.length === 1 && seen.copied[0].url === clipboard && seen.check;
    if (mode === 'string') pass = clipboard.startsWith('https://example.com/review/42?cut=3#') && fragment.test(hashOf(clipboard)) && seen.copied.length === 1 && seen.check;
    if (mode === 'function') pass = seen.asked.length === 1 && clipboard === `https://example.com/#/review/42?${seen.asked[0].fragment}` && fragment.test(seen.asked[0].fragment) && seen.asked[0].timecode === '00:00:14:00' && seen.copied.length === 1 && seen.check;
    // Nothing announced: the live regions hold nothing new. (Video.js clears its own "Seeked to …" on a timer, so a
    // region may have gone empty in the meantime; that is not an announcement.)
    const quiet = seen.live.split('|').every((text, index) => text === '' || text === liveBefore.split('|')[index]);
    if (mode === 'null') pass = seen.asked.length === 1 && clipboard === MARKER && !seen.check && quiet && seen.copied.length === 0;
    record(`chromium linkUrl: ${mode}`, pass, { clipboard, ...seen, liveBefore });
  }
  await context.close();
}

/** What a page loads before its first frame plays: every script and stylesheet response, from the network log. */
async function weight(browser, name) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  const responses = [];
  page.on('response', (response) => {
    const type = response.request().resourceType();
    if (type === 'script' || type === 'stylesheet') responses.push({ url: response.url(), type, body: response.body().catch(() => null) });
  });
  await open(page, `${name}.html`);
  await ready(page);
  await page.evaluate(() => {
    const video = document.querySelector('video');
    video.muted = true;
    return video.play().catch(() => {});
  });
  // The first frame: requestVideoFrameCallback where it exists, otherwise currentTime moving.
  await page.evaluate(() => new Promise((resolve) => {
    const video = document.querySelector('video');
    if (video.requestVideoFrameCallback) video.requestVideoFrameCallback(() => resolve());
    else video.addEventListener('timeupdate', () => resolve(), { once: true });
  }));
  const settled = [...responses];
  const files = [];
  for (const response of settled) {
    const body = await response.body;
    if (!body) continue;
    files.push({ file: fileOf(response.url), type: response.type, raw: body.length, gzip: gzipSync(body, { level: 9 }).length });
  }
  await context.close();
  const sum = (type, key) => files.filter((file) => file.type === type).reduce((total, file) => total + file[key], 0);
  return {
    js: { requests: files.filter((file) => file.type === 'script').length, raw: sum('script', 'raw'), gzip: sum('script', 'gzip') },
    css: { requests: files.filter((file) => file.type === 'stylesheet').length, raw: sum('stylesheet', 'raw'), gzip: sum('stylesheet', 'gzip') },
    files,
  };
}

/** The biggest chunks of the app, by what they hold: which packages, and how much of each. */
function breakdown() {
  const packageOf = (id) => {
    const match = id.match(/node_modules\/((?:@[^/]+\/)?[^/]+)/);
    return match ? match[1] : id.includes('/src/') ? 'app source' : id;
  };
  return chunkReport
    .map((chunk) => {
      const byPackage = {};
      for (const module of chunk.modules) byPackage[packageOf(module.id)] = (byPackage[packageOf(module.id)] ?? 0) + module.size;
      return { fileName: chunk.fileName, total: chunk.modules.reduce((total, module) => total + module.size, 0), packages: Object.entries(byPackage).sort((a, b) => b[1] - a[1]) };
    })
    .sort((a, b) => b.total - a.total);
}

try {
  for (const engine of engines) {
    const browser = await launch(engine);
    try {
      await viewerChecks(browser, engine);
      await studioChecks(browser, engine);
      if (engine === 'chromium') {
        await linkChecks(browser);
        for (const name of ['viewer', 'studio', 'stock']) report.weight[name] = await weight(browser, name);
      }
    } catch (error) {
      record(`${engine}: ran to the end`, false, String(error).slice(0, 600));
    } finally {
      await browser.close();
    }
  }
} finally {
  stop();
}

report.chunks = breakdown();
report.manifestEntries = Object.keys(manifest).length;
writeFileSync(join(work, 'report.json'), JSON.stringify(report, null, 1));

if (report.weight.viewer && report.weight.stock) {
  const row = (name) => {
    const w = report.weight[name];
    return `${name.padEnd(7)} JS ${w.js.requests} req ${w.js.raw} raw ${w.js.gzip} gzip | CSS ${w.css.requests} req ${w.css.raw} raw ${w.css.gzip} gzip`;
  };
  for (const name of ['viewer', 'studio', 'stock']) log(row(name));
  const total = (name) => report.weight[name].js.gzip + report.weight[name].css.gzip;
  log(`Frameline Viewer minus stock, JS and CSS gzip: ${total('viewer') - total('stock')} bytes (${(((total('viewer') - total('stock')) / total('stock')) * 100).toFixed(1)}%)`);
}

const failed = Object.entries(results).filter(([, result]) => !result.pass);
log(`${Object.keys(results).length - failed.length} of ${Object.keys(results).length} checks pass. Report: ${join(work, 'report.json')}`);
if (!keep && failed.length === 0) rmSync(join(work, 'app', 'node_modules'), { recursive: true, force: true });
process.exit(failed.length ? 1 : 0);
