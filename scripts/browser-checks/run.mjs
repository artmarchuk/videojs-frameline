// The browser checks' runner: `npm run check:browsers`. It runs every check in manifest.mjs, in every engine, at every
// page and window the manifest names, against the production build, and prints one line per check, engine and window.
//
//   npm run check:browsers                                   build, serve dist/, run everything in three engines
//   npm run check:browsers -- --engine chromium              one engine: chromium (Google Chrome), firefox, webkit, all
//   npm run check:browsers -- --only dock-polish,zoom        some checks
//   npm run check:browsers -- --base-url https://frameline.artmarchuk.me     a deployed site instead of the build
//   npm run check:browsers -- --repeat 10                    every run ten times, to hunt a flaky check
//   npm run check:browsers -- --no-build                     use dist/ as it is
//   npm run check:browsers -- --workers 3                    runs side by side (default 1: the checks play real media
//                                                            and read timings, and some fail under load)
//   npm run check:browsers -- --out <folder>                 where summary.json and failure screenshots go
//                                                            (default: frameline-browser-checks in the temp folder)
//
// The markup snapshot (dom-snapshot.js) has no verdict of its own. To compare two builds, save on `main` and compare
// on the branch:
//
//   git switch main && npm run check:browsers -- --save /tmp/markup.json
//   git switch my-branch && npm run check:browsers -- --compare /tmp/markup.json
//
// `--save` and `--compare` run only dom-snapshot. A difference is listed by engine, page, window, state and element,
// and fails the run.
//
// Outcomes: `pass`; `known` (every failed assertion is a known failure in the manifest); `flaky` (the check is marked
// flaky in the manifest and failed); `FAIL`; `skip` (the check needs the local build and `--base-url` was given).
// Only `FAIL` makes the exit code 1. Chromium is the installed Google Chrome (`channel: 'chrome'`): the demo media is
// H.264, which Playwright's own Chromium does not play. Firefox and WebKit are Playwright's
// (`npx playwright-core install firefox webkit`). The checks need the network: the demo media is on Mux.
import { execFileSync, spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import playwright from 'playwright-core';

import manifest from './manifest.mjs';

const here = fileURLToPath(new URL('.', import.meta.url));
const repo = resolve(here, '../..');
const dist = join(repo, 'dist');
const ENGINES = ['chromium', 'firefox', 'webkit'];

/* ---------- Options ---------- */

const argv = process.argv.slice(2);
const option = (name) => {
  const index = argv.findIndex((arg) => arg === `--${name}` || arg.startsWith(`--${name}=`));
  if (index < 0) return undefined;
  return argv[index].includes('=') ? argv[index].slice(name.length + 3) : (argv[index + 1] ?? '');
};
const has = (name) => argv.includes(`--${name}`);
const fail = (message) => { console.error(message); process.exit(2); };

const engineOption = option('engine') ?? 'all';
const engines = engineOption === 'all' ? ENGINES : engineOption.split(',');
for (const engine of engines) if (!ENGINES.includes(engine)) fail(`Unknown engine "${engine}". Use chromium, firefox, webkit or all.`);
const save = option('save');
const compare = option('compare');
if (save && compare) fail('Use --save or --compare, not both.');
const only = save || compare ? ['dom-snapshot'] : option('only')?.split(',').filter(Boolean);
for (const name of only ?? []) if (!manifest.some((entry) => entry.name === name)) fail(`No check named "${name}" in manifest.mjs.`);
const repeat = Math.max(1, Number(option('repeat') ?? 1) || 1);
const workers = Math.max(1, Number(option('workers') ?? 1) || 1);
const remote = option('base-url')?.replace(/\/$/, '');
const outDir = resolve(option('out') ?? join(tmpdir(), 'frameline-browser-checks'));
const baseline = compare ? JSON.parse(readFileSync(resolve(compare), 'utf8')) : null;

/* ---------- Servers ---------- */

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.json': 'application/json', '.woff2': 'font/woff2', '.ico': 'image/x-icon', '.vtt': 'text/vtt', '.mp4': 'video/mp4', '.txt': 'text/plain; charset=utf-8' };
const servers = [];
const children = [];

// A static server that answers as the host does: an ETag, `must-revalidate`, 404 for a missing file.
const staticHandler = (root) => (request, response) => {
  const url = new URL(request.url, 'http://localhost');
  const file = join(root, url.pathname === '/' ? '/index.html' : decodeURIComponent(url.pathname));
  if (!file.startsWith(root) || !existsSync(file) || statSync(file).isDirectory()) {
    response.statusCode = 404;
    response.setHeader('content-type', 'text/plain; charset=utf-8');
    response.end('NOT_FOUND\n');
    return;
  }
  const body = readFileSync(file);
  const etag = `"${createHash('md5').update(body).digest('hex')}"`;
  response.setHeader('cache-control', 'public, max-age=0, must-revalidate');
  response.setHeader('etag', etag);
  if (request.headers['if-none-match'] === etag) { response.statusCode = 304; response.end(); return; }
  response.setHeader('content-type', TYPES[extname(file)] ?? 'application/octet-stream');
  response.end(body);
};
const listen = (handler, host, port = 0) => new Promise((done, failed) => {
  const server = createServer(handler);
  server.once('error', failed);
  server.listen(port, host, () => { servers.push(server); done(server.address().port); });
});
// Ports from a range no browser refuses (the Fetch standard's bad ports are all below 11000).
const freePort = async (pair = false) => {
  for (let tries = 0; tries < 50; tries++) {
    const port = 20000 + Math.floor(Math.random() * 20000);
    const free = (candidate) => new Promise((done) => {
      const probe = createServer();
      probe.once('error', () => done(false));
      probe.listen(candidate, '127.0.0.1', () => probe.close(() => done(true)));
    });
    if ((await free(port)) && (!pair || (await free(port + 1)))) return port;
  }
  throw new Error('No free port found.');
};

/* ---------- The checks ---------- */

const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor;
const bodies = new Map();
const body = (name) => {
  if (!bodies.has(name)) bodies.set(name, new AsyncFunction('page', 'args', readFileSync(join(here, `${name}.js`), 'utf8')));
  return bodies.get(name);
};
const PERMISSIONS = { chromium: ['clipboard-read', 'clipboard-write'], webkit: ['clipboard-read'], firefox: [] };
const axe = import.meta.resolve('@axe-core/playwright');

const contextOptions = (entry, run, engine) => ({
  viewport: run.viewport,
  ...(run.scale ? { deviceScaleFactor: run.scale } : {}),
  ...(run.touch ? { hasTouch: true, ...(engine === 'firefox' ? {} : { isMobile: true }) } : {}),
  ...(entry.clipboard && PERMISSIONS[engine].length ? { permissions: PERMISSIONS[engine] } : {}),
  ...run.context,
});

// The failed assertions of a result: from the manifest's verdict, or from `out.checks`, and `pass` when the check
// says it failed and names no assertion.
const failedAssertions = (entry, out) => {
  const assertions = entry.verdict ? entry.verdict(out) : (out?.checks ?? {});
  const failed = Object.entries(assertions).filter(([, value]) => value !== true).map(([name]) => name);
  if (!failed.length && !entry.verdict && out?.pass !== true) failed.push('pass');
  return failed;
};
// For a failed check with one combined verdict: the top-level values that are `false`, as a hint to what failed.
const falseValues = (out) => Object.entries(out ?? {}).filter(([name, value]) => value === false && name !== 'pass').map(([name]) => name);
const matches = (known, engine, label, assertion) =>
  known.engine === engine && (!known.run || known.run === label) && (known.assertion instanceof RegExp ? known.assertion.test(assertion) : known.assertion === assertion);

// A line-by-line difference of two lists (longest common subsequence), as `- old` and `+ new` with the line number.
const difference = (before, after) => {
  const rows = before.length, columns = after.length;
  const table = Array.from({ length: rows + 1 }, () => new Uint16Array(columns + 1));
  for (let i = rows - 1; i >= 0; i--) for (let j = columns - 1; j >= 0; j--) table[i][j] = before[i] === after[j] ? table[i + 1][j + 1] + 1 : Math.max(table[i + 1][j], table[i][j + 1]);
  const lines = [];
  let i = 0, j = 0;
  while (i < rows || j < columns) {
    if (i < rows && j < columns && before[i] === after[j]) { i++; j++; }
    else if (j < columns && (i === rows || table[i][j + 1] >= table[i + 1][j])) { lines.push(`+ ${j + 1}: ${after[j].trim()}`); j++; }
    else { lines.push(`- ${i + 1}: ${before[i].trim()}`); i++; }
  }
  return lines;
};
const snapshots = {};
const compareSnapshot = (key, states) => {
  const old = baseline[key];
  if (!old) return [`${key}: not in the saved snapshot`];
  const lines = [];
  for (const state of new Set([...Object.keys(old), ...Object.keys(states)])) {
    if (!old[state]) lines.push(`state "${state}": new`);
    else if (!states[state]) lines.push(`state "${state}": gone`);
    else for (const line of difference(old[state], states[state])) lines.push(`state "${state}": ${line}`);
  }
  return lines;
};

const results = [];
const print = (result) => {
  const mark = { pass: 'pass ', known: 'known', flaky: 'flaky', FAIL: 'FAIL ', skip: 'skip ' }[result.outcome];
  const times = repeat > 1 ? ` #${result.repeat}` : '';
  const seconds = result.seconds === undefined ? '' : `  ${result.seconds.toFixed(1)} s`;
  console.log(`${mark}  ${result.engine.padEnd(8)}  ${result.check}  [${result.run}]${times}${seconds}${result.note ? `  ${result.note}` : ''}`);
  for (const line of result.details ?? []) console.log(`         ${line}`);
};

const runOne = async (browser, engine, entry, run, index, fixtures) => {
  const result = { check: entry.name, engine, run: run.label, repeat: index, outcome: 'pass' };
  const started = Date.now();
  let context;
  let server;
  try {
    const args = { axe, ...run.args };
    if (entry.fixture === 'embed-host') args.hostUrl = fixtures.embedHost;
    if (entry.fixture === 'deploy-server') {
      const port = await freePort(true);
      server = spawn(process.execPath, [join(here, 'fixtures/deploy-server.mjs'), dist, String(port)], { stdio: ['ignore', 'pipe', 'inherit'] });
      children.push(server);
      await new Promise((done, failed) => { server.stdout.once('data', done); server.once('exit', () => failed(new Error('deploy-server.mjs did not start'))); });
      args.base = `http://127.0.0.1:${port}`;
    }
    context = await browser.newContext(contextOptions(entry, run, engine));
    const page = await context.newPage();
    const seconds = entry.timeout ?? 180;
    let timer;
    const out = await Promise.race([
      (async () => {
        if (run.path !== null) await page.goto(fixtures.base + run.path);
        return body(entry.name)(page, args);
      })(),
      new Promise((_done, failed) => { timer = setTimeout(() => failed(new Error(`no result after ${seconds} s`)), seconds * 1000); }),
    ]).finally(() => clearTimeout(timer));
    result.failed = failedAssertions(entry, out);
    if (entry.name === 'dom-snapshot') {
      const key = `${engine} | ${run.label}`;
      snapshots[key] = out.states;
      result.note = `${Object.keys(out.states).length} states, ${Object.values(out.count).reduce((sum, count) => sum + count, 0)} elements`;
      if (baseline) {
        const lines = compareSnapshot(key, out.states);
        if (lines.length) { result.failed.push('sameMarkup'); result.details = lines.slice(0, 60); if (lines.length > 60) result.details.push(`… and ${lines.length - 60} more lines`); result.differences = lines; }
        else result.note += ', same as the saved snapshot';
      }
    } else if (result.failed.length) {
      result.out = out;
      const hints = result.failed.join() === 'pass' ? falseValues(out) : [];
      result.note = `failed: ${result.failed.join(', ')}${hints.length ? ` (false in the result: ${hints.join(', ')})` : ''}`;
    }
    if (result.failed.length) await page.screenshot({ path: join(outDir, `${entry.name}-${engine}-${run.label.replace(/[^a-z0-9]+/gi, '-')}-${index}.png`) }).catch(() => {});
  } catch (error) {
    result.failed = ['error'];
    result.error = String(error?.stack ?? error).split('\n').slice(0, 6).join('\n');
    result.note = `error: ${String(error?.message ?? error).split('\n')[0]}`;
  } finally {
    await context?.close().catch(() => {});
    server?.kill();
  }
  result.seconds = (Date.now() - started) / 1000;
  const known = (entry.known ?? []).filter((item) => item.engine === engine && (!item.run || item.run === run.label));
  if (result.failed.length) {
    const reasons = result.failed.map((assertion) => (entry.known ?? []).find((item) => matches(item, engine, run.label, assertion)));
    if (reasons.every(Boolean)) { result.outcome = 'known'; result.reasons = [...new Set(reasons.map((item) => item.reason))]; result.details = result.reasons.map((reason) => `known: ${reason}`); }
    else if (entry.flaky) { result.outcome = 'flaky'; result.details = [...(result.details ?? []), `flaky: ${entry.flaky}`]; }
    else result.outcome = 'FAIL';
  } else if (known.length) result.note = `${result.note ? `${result.note}; ` : ''}its known failure did not happen this time`;
  results.push(result);
  print(result);
};

/* ---------- Run ---------- */

const main = async () => {
  mkdirSync(outDir, { recursive: true });
  const fixtures = { base: remote };
  if (!remote) {
    if (!has('no-build')) {
      console.log('Building (npm run build)…');
      execFileSync('npm', ['run', 'build'], { cwd: repo, stdio: ['ignore', 'ignore', 'inherit'] });
    }
    if (!existsSync(join(dist, 'index.html'))) fail('No dist/ to serve. Run without --no-build.');
    // `localhost` is 127.0.0.1 in one browser and ::1 in another: answer on both.
    const port = await freePort();
    await listen(staticHandler(dist), '127.0.0.1', port);
    await listen(staticHandler(dist), '::1', port).catch(() => {});
    fixtures.base = `http://localhost:${port}`;
  }
  // The embed check's host page, on another origin than the site.
  fixtures.embedHost = `http://127.0.0.1:${await listen(staticHandler(join(here, 'fixtures')), '127.0.0.1')}/embed-host.html`;
  console.log(`Site: ${fixtures.base}. Engines: ${engines.join(', ')}.${repeat > 1 ? ` Every run ${repeat} times.` : ''} Results: ${outDir}\n`);

  const entries = manifest.filter((entry) => !only || only.includes(entry.name));
  const started = Date.now();
  for (const engine of engines) {
    const browser = await playwright[engine].launch(engine === 'chromium' ? { channel: 'chrome', headless: true } : { headless: true });
    const queue = [];
    for (const entry of entries) {
      for (const run of entry.runs) {
        if (!(entry.engines ?? ENGINES).includes(engine)) continue;
        if (remote && entry.fixture === 'deploy-server') {
          const result = { check: entry.name, engine, run: run.label, repeat: 1, outcome: 'skip', note: 'needs the local build' };
          results.push(result); print(result);
          continue;
        }
        for (let index = 1; index <= repeat; index++) queue.push(() => runOne(browser, engine, entry, run, index, fixtures));
      }
    }
    await Promise.all(Array.from({ length: workers }, async () => { while (queue.length) await queue.shift()(); }));
    await browser.close();
  }

  const count = (outcome) => results.filter((result) => result.outcome === outcome).length;
  const totals = { pass: count('pass'), known: count('known'), flaky: count('flaky'), fail: count('FAIL'), skip: count('skip') };
  const summary = { site: fixtures.base, engines, repeat, node: process.version, playwright: JSON.parse(readFileSync(join(repo, 'node_modules/playwright-core/package.json'), 'utf8')).version, seconds: Math.round((Date.now() - started) / 1000), totals, results };
  writeFileSync(join(outDir, 'summary.json'), JSON.stringify(summary, null, 2));
  if (save) { writeFileSync(resolve(save), JSON.stringify(snapshots, null, 1)); console.log(`\nSnapshot saved: ${resolve(save)}`); }
  console.log(`\n${totals.pass} pass, ${totals.known} known, ${totals.flaky} flaky, ${totals.fail} FAIL${totals.skip ? `, ${totals.skip} skipped` : ''} in ${summary.seconds} s. Summary: ${join(outDir, 'summary.json')}`);
  return totals.fail ? 1 : 0;
};

const stop = () => { for (const server of servers) server.close(); for (const child of children) child.kill(); };
main().then((code) => { stop(); process.exit(code); }, (error) => { stop(); console.error(error); process.exit(2); });
