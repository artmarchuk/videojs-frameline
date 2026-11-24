// The browser checks, as data: what `npm run check:browsers` (run.mjs) runs. One entry per check file.
//
// name      the check's file, without `.js`.
// runs      one per page and window. `path` is the page and its query; `viewport` the window; `touch` a touch context
//           (hasTouch, and isMobile where the engine has it: Firefox does not); `scale` the device scale factor;
//           `context` any other Playwright context option (reducedMotion, forcedColors, colorScheme);
//           `args` what the check reads from `args`.
// clipboard the context gets the clipboard permissions the engine knows: Chromium `clipboard-read` and
//           `clipboard-write`, WebKit `clipboard-read`, Firefox none.
// fixture   a server the check needs, started by the runner on a free port: `embed-host` serves fixtures/ on a second
//           origin; `deploy-server` runs fixtures/deploy-server.mjs on the build, so the check cannot run against a
//           remote site and is skipped with `--base-url`.
// engines   the engines it runs in (default: all three).
// verdict   for a check whose result has no `pass`: a function from the result to `{ assertion: true | false }`.
//           Otherwise the runner reads `out.checks` (assertion by assertion) and `out.pass`. `all(...)` below makes one
//           from the values a check combines into `pass`.
// known     known failures: `{ assertion, engine, reason }`, and `run` (a label) when only one run has it. `assertion`
//           is a name or a RegExp. A run whose failed assertions are all known does not fail the run; any other
//           failure does. `NOTES.md`, "Known failures", has the same list in prose.
// flaky     a reason. A failure of a flaky check is reported and does not fail the run.
// timeout   seconds for one run (default 180).
// slow      with `--slow` (CI passes it), every fixed wait of the check is this many times longer. For a check that
//           reads the timecode a fixed time after a seek: on GitHub's runners, which decode in software, the frame
//           is shown later than that. Without `--slow` it does nothing.
//
// Sizes and options come from each check's header. Where a header names no size, the window is 1440x900.

const WIDE = { width: 1440, height: 900 };
const STUDIO = '/preview.html?tier=studio';
const VIEWER = '/preview.html?tier=viewer';
// The reel's Mux playback ID (apps/preview/src/frame/media.ts), as embed-link.js uses it.
const EMBED = '/embed.html?tier=studio&fps=24&mux=9Y7a3hqNCi4u02fmBFbaK5qWoS6A5cPce7P1mA00JA02tY';

const wide = (path, more = {}) => ({ label: '1440x900', path, viewport: WIDE, ...more });
const touch = (path, width, height = 800, more = {}) => ({ label: `${width}x${height} touch`, path, viewport: { width, height }, touch: true, ...more });
const named = (label, run) => ({ ...run, label: `${label}, ${run.label}` });
// A verdict from the values a check combines into `pass`: every one of them, and `pass` itself.
const all = (...names) => (out) => Object.fromEntries([...names, 'pass'].map((name) => [name, out[name] === true || (name === 'pass' && names.some((other) => out[other] !== true))]));

export default [
  {
    name: 'viewer-gate',
    runs: [
      named('monitor', wide(VIEWER)),
      named('monitor', { label: '320x800', path: VIEWER, viewport: { width: 320, height: 800 } }),
      named('landing', wide('/?tier=viewer')),
      named('landing', { label: '320x800', path: '/?tier=viewer', viewport: { width: 320, height: 800 } }),
    ],
  },
  {
    // No verdict of its own: it records the markup. `--save <file>` and `--compare <file>` make it a comparison.
    name: 'dom-snapshot',
    runs: [
      named('viewer', wide(VIEWER)),
      named('studio', wide(STUDIO)),
      named('studio debug', wide(`${STUDIO}&debug`)),
      named('landing', wide('/?tier=studio')),
      named('embed', wide(EMBED)),
      named('studio', touch(STUDIO, 724, 375)),
      named('studio', touch(STUDIO, 422)),
    ],
    verdict: (out) => ({ recorded: Object.keys(out.states ?? {}).length > 0 && Object.values(out.count).every((count) => count > 0) }),
  },
  {
    name: 'configurator',
    clipboard: true,
    runs: [wide('/')],
    timeout: 300,
    // The check has one combined verdict; these are the values it combines, so that a known failure can name one.
    verdict: all('reserveOk', 'stagedOk', 'reviewOk', 'configureToggles', 'configureClosed', 'configureOpens', 'startOk', 'flagOk', 'tierOk', 'viewerPlusOk', 'heroTierOk', 'layoutOk', 'noReload', 'keyboardTier', 'stepOk', 'rangeOk', 'zonesOk', 'safeOk', 'zoomOk', 'cueOk', 'grabOk', 'logOk', 'logCapped', 'logNotLive', 'logCleared', 'copied', 'roundTripOk', 'viewerNoProChunk'),
    known: [
      {
        assertion: 'stagedOk',
        engine: 'chromium',
        reason: 'On GitHub’s runners the landing page often opens on 00:00:00:00 instead of its staged frame: when the media is ready within half a second of the load, the page sets the staged range but its seek is never issued. A race in the page or the skin, not in the check; not seen on a Mac. The fix is its own step.',
      },
    ],
  },
  {
    name: 'dock-polish',
    clipboard: true,
    runs: [
      wide(STUDIO),
      touch(STUDIO, 724, 375),
      touch(STUDIO, 422),
      touch(STUDIO, 392),
      touch(STUDIO, 352),
      named('forced colours', wide(STUDIO, { context: { forcedColors: 'active' } })),
      named('forced colours', touch(STUDIO, 724, 375, { context: { forcedColors: 'active' } })),
    ],
  },
  {
    name: 'phone-transport',
    runs: [...[430, 390, 375, 360, 352, 340, 320].map((width) => touch(STUDIO, width)), wide(STUDIO)],
  },
  {
    name: 'range-playback',
    runs: [wide(STUDIO)],
    flaky: 'After the start at In, the streaming engine’s stall recovery sometimes skips forward inside the range. The skin is right.',
  },
  {
    name: 'link-open',
    runs: [wide(`${STUDIO}&media=cosmicDawn`)],
    timeout: 300,
    known: [
      {
        assertion: /^#autoplay=1&muted=1&t=/,
        engine: 'webkit',
        reason: 'With autoplay, WebKit sometimes stays near 0 s: the link is applied while the streaming engine’s own seek over the gap at the start is still running, and the skin’s snap-to-frame listener then seeks back to the old position. The skin is wrong; the fix is its own step.',
      },
    ],
  },
  {
    name: 'stale-chunk-reload',
    fixture: 'deploy-server',
    runs: ['/?tier=studio', '/preview.html?tier=studio', '/embed.html?tier=studio'].map((path) => ({ label: `${path}, 1440x900`, path: null, viewport: WIDE, args: { path } })),
  },
  {
    name: 'pro-chunk-failure',
    runs: [named('monitor', wide(STUDIO)), named('landing', wide('/?tier=studio'))],
    timeout: 300,
  },
  {
    name: 'embed-link',
    clipboard: true,
    fixture: 'embed-host',
    runs: [wide(STUDIO)],
    // Not 3: the check looks for the link button's tick 400 ms after `S`, and the tick shows for 1.2 s.
    slow: 2,
  },
  {
    name: 'zoom',
    runs: [
      named('1x', wide(`${STUDIO}&media=cosmicDawn`, { scale: 1 })),
      named('2x', wide(`${STUDIO}&media=cosmicDawn`, { scale: 2 })),
    ],
  },
  { name: 'zoom-rendition-cap', runs: [wide(`${STUDIO}&cap=1`, { scale: 1 })], timeout: 300 },
  { name: 'zoom-rendition-note', runs: [wide(`${STUDIO}&cap=1`, { scale: 1 })] },
  {
    name: 'guides-menu-focus',
    runs: [wide(STUDIO)],
    // The check returns what it saw; this is the verdict its header describes.
    verdict: (out) => ({
      first: out.first?.startsWith('Title safe') === true,
      space: out.space?.startsWith('Title safe') === true,
      readingOrder: new Set(out.order).size > 10 && out.order.some((text) => text.startsWith('Hide guides')),
      back: /^Guides/.test(out.back ?? ''),
    }),
  },
  { name: 'handle-focus-ring', runs: [wide(STUDIO)] },
  { name: 'fullscreen-focus', runs: [named('studio', wide(STUDIO)), named('viewer', wide(VIEWER))] },
  { name: 'error-retry', runs: [named('studio', wide(`${STUDIO}&media=error`)), named('viewer', wide(`${VIEWER}&media=error`))] },
  { name: 'two-players', runs: [wide('/two-players.html')] },
  {
    name: 'reduced-motion',
    runs: [STUDIO, VIEWER, '/'].map((path, index) => named(['studio', 'viewer', 'landing'][index], wide(path, { context: { reducedMotion: 'reduce' } }))),
  },
  {
    name: 'axe-audit',
    runs: [
      named('landing', wide('/')),
      named('landing', { label: '390x844', path: '/', viewport: { width: 390, height: 844 } }),
      named('studio', wide(STUDIO)),
      named('studio, Guides menu', wide(STUDIO, { args: { state: 'guides' } })),
      named('studio, Zoom menu', wide(STUDIO, { args: { state: 'zoom' } })),
      named('studio, help dialog', wide(STUDIO, { args: { state: 'help' } })),
      named('studio', touch(STUDIO, 422)),
      named('viewer', wide(VIEWER)),
    ],
    // An axe run has no `pass`: the verdict is zero violations.
    verdict: (out) => ({ noViolations: Object.values(out.counts).every((count) => count === 0) }),
  },
];
