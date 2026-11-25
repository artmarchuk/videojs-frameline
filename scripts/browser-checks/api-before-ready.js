// Browser check: what each method of the skin's handle (`apiRef`) does when the host calls it before the player is
// ready. Body of an async function; `page` on any page of the site; the check navigates itself to the monitor page,
// which puts the handle on `window.frameline` and fires `frameline:api` on the window when it arrives.
//
// Three moments, each reached on purpose:
//   handle   inside `frameline:api`, the moment the handle exists: Studio's first render, one render before its
//            controller knows the video element. The media is answered from memory, as a warm cache does, so it is
//            ready before the Studio code.
//   nomedia  the Studio code is on screen and the media's requests are held: no duration yet.
//   noframe  the playlists are answered and the media segments held: the duration is known, no frame is decoded.
//
// The rule (README, "Driving the player"): state methods (`setRange`, `setLoop`, `setGuides`, `setZoom`) apply at
// once; `seek` and `step` wait for the media, steps add up, a seek replaces the steps before it and steps after a
// seek count from its frame; `pan` and `grabFrame` do nothing. `out.table` has what was seen, case by moment.
// Pages, windows and options for the runner (`npm run check:browsers`): manifest.mjs.
const out = { table: {} };
const origin = new URL(page.url()).origin;
const MOMENTS = ['handle', 'nomedia', 'noframe'];
// The reel, 24 fps: 10.02 s is in frame 240, 00:00:10:00.
const CASES = {
  seek: { expect: { timecode: '00:00:10:00' } },
  step: { expect: { timecode: '00:00:00:02' } },
  stepSeek: { expect: { timecode: '00:00:10:00' } },
  seekStep: { expect: { timecode: '00:00:10:02' } },
  state: { expect: { timecode: '00:00:00:00', in: '00:00:02:00', out: '00:00:08:00', loop: 'false', thirds: true, crop: '1-1', zoom: '200' } },
  pan: { expect: { timecode: '00:00:00:00', zoom: '200', panned: false } },
  grab: { expect: { timecode: '00:00:00:00', downloads: 0, toast: '' } },
};
await page.addInitScript(() => {
  const query = new URLSearchParams(location.search);
  const name = query.get('apiCase');
  if (!name) return;
  try { localStorage.clear(); } catch {} // the guides are remembered; every case starts without them
  const seen = (window.__api = { downloads: 0, called: null });
  // No file is wanted from the check; a grab is counted instead.
  HTMLAnchorElement.prototype.click = function () { if (this.hasAttribute('download')) seen.downloads += 1; };
  const calls = {
    seek: (api) => api.seek(10.02),
    step: (api) => { api.step(1); api.step(1); },
    stepSeek: (api) => { api.step(5); api.seek(10.02); },
    seekStep: (api) => { api.seek(10.02); api.step(1); api.step(1); },
    state: (api) => { api.setRange({ in: 2, out: 8 }); api.setLoop(false); api.setGuides({ guides: ['thirds'], crop: '1:1' }); api.setZoom('200'); },
    pan: (api) => { api.setZoom('200'); api.pan('right'); api.pan('down'); },
    grab: (api) => api.grabFrame(),
  };
  window.__call = () => {
    const video = document.querySelector('.media-container video');
    seen.called = { duration: video ? video.duration : null, readyState: video ? video.readyState : null, ready: !!document.querySelector('[data-pro-ready]') };
    calls[name](window.frameline);
  };
  if (query.get('apiMoment') === 'handle') window.addEventListener('frameline:api', () => window.__call(), { once: true });
});

// The media's requests (every request to another origin): kept after the first answer, and held while `held` says so.
const answers = new Map();
let held = () => false;
let release = () => {};
let gate = Promise.resolve();
const hold = (which) => { held = which; gate = new Promise((done) => { release = done; }); };
const media = async (route) => {
  const request = route.request();
  if (held(request.url())) await gate;
  const key = `${request.method()} ${request.url()} ${request.headers().range ?? ''}`;
  if (!answers.has(key)) {
    try {
      const response = await route.fetch();
      answers.set(key, { status: response.status(), headers: response.headers(), body: await response.body() });
    } catch {
      return route.abort().catch(() => {});
    }
  }
  await route.fulfill(answers.get(key)).catch(() => {});
};
const elsewhere = (requested) => requested.origin !== origin;
await page.route(elsewhere, media);
const playlist = (url) => /\.m3u8(\?|$)/.test(url);

// A first load fills the memory.
// (Not `load`: a held poster image would hold that event too.)
await page.goto('about:blank');
await page.goto(`${origin}/preview.html?tier=studio`, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => document.querySelector('video')?.readyState >= 2, null, { timeout: 30000 });
await page.waitForTimeout(1000);

const checks = {};
for (const [name, { expect }] of Object.entries(CASES)) {
  out.table[name] = {};
  for (const moment of MOMENTS) {
    await page.goto('about:blank');
    if (moment === 'nomedia') hold(() => true);
    else if (moment === 'noframe') hold((url) => !playlist(url));
    else hold(() => false);
    await page.goto(`${origin}/preview.html?tier=studio&apiCase=${name}&apiMoment=${moment}`, { waitUntil: 'domcontentloaded' });
    let reached = true;
    if (moment !== 'handle') {
      // Studio is on screen and has rendered with the video element; then the state of the media the moment names.
      await page.waitForSelector('[data-pro-ready] [data-handle="in"]', { timeout: 30000 });
      const state = moment === 'nomedia' ? () => { const video = document.querySelector('video'); return video && !(video.duration > 0); } : () => { const video = document.querySelector('video'); return video?.duration > 0 && video.readyState < 2; };
      reached = await page.waitForFunction(state, null, { timeout: 15000 }).then(() => true, () => false);
      await page.waitForTimeout(300);
      await page.evaluate(() => window.__call());
      await page.waitForTimeout(300);
    }
    release();
    await page.waitForFunction(() => window.__api?.called && document.querySelector('video')?.readyState >= 2, null, { timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(1500);
    const seen = await page.evaluate(() => {
      const skin = document.querySelector('.pro-skin'), video = document.querySelector('video');
      const transform = document.querySelector('.pro-picture')?.style.transform ?? '';
      const stage = document.querySelector('.pro-picture')?.parentElement.getBoundingClientRect(), picture = document.querySelector('.pro-picture')?.getBoundingClientRect();
      return {
        called: window.__api.called,
        timecode: (document.querySelector('.pro-timecode-values')?.textContent ?? '').replace(/^≈/, '').slice(0, 11),
        time: +video.currentTime.toFixed(3), paused: video.paused,
        in: document.querySelector('[data-handle="in"]')?.getAttribute('aria-valuetext'), out: document.querySelector('[data-handle="out"]')?.getAttribute('aria-valuetext'),
        loop: document.querySelector('[data-pro-tool="loop"]')?.getAttribute('aria-pressed'),
        thirds: skin.hasAttribute('data-guide-thirds'), crop: skin.dataset.crop ?? null, zoom: skin.dataset.zoom ?? 'fit',
        transform,
        // Centred: the zoomed picture's middle is the stage's middle.
        panned: transform && stage && picture ? Math.abs((picture.left + picture.width / 2) - (stage.left + stage.width / 2)) > 1 || Math.abs((picture.top + picture.height / 2) - (stage.top + stage.height / 2)) > 1 : false,
        downloads: window.__api.downloads, toast: document.querySelector('.pro-toast')?.textContent ?? '',
      };
    });
    const state = seen.called ?? {};
    // The call was made at the moment the case names.
    const moments = { handle: !state.ready, nomedia: state.ready && !(state.duration > 0), noframe: state.ready && state.duration > 0 && state.readyState < 2 };
    const at = reached && moments[moment] === true;
    const wrong = Object.entries(expect).filter(([key, value]) => seen[key] !== value).map(([key]) => `${key}: ${JSON.stringify(seen[key])}`);
    out.table[name][moment] = { at, wrong, ...seen };
    checks[`${name} at ${moment}: the moment was reached`] = at;
    checks[`${name} at ${moment}`] = wrong.length === 0 && (name === 'state' || name === 'pan' ? !!seen.transform : true);
  }
}
await page.unroute(elsewhere, media);
out.checks = checks;
out.pass = Object.values(checks).every(Boolean);
return out;
