/**
 * The landing page's script. The page itself is plain HTML (apps/preview/index.html) and CSS (landing.css, with its
 * tokens in tokens.css); this mounts the player into it and wires Configure (the form), the
 * query string, the code snippet, the event log and the "Show me" buttons. Everything that drives the player goes through the skin's public props and its `apiRef` handle.
 */
import { VideoPlayer } from '@videojs/react/video';
import { StrictMode, useMemo, useSyncExternalStore } from 'react';
import { createRoot } from 'react-dom/client';

import '@/skin.css';
import { FramelineSkin, type FramelineCopyLinkInfo, type FramelineEffectiveGuides, type FramelineFrameGrabInfo, type FramelineApi, type FramelineRange, type FramelineMarker, type FramelineZoomLevel } from '@/pro';
import { formatTimecode, framesFromSeconds } from '@/pro/timecode';

import { DemoVideo, useDemoMarkers } from '../frame/demo-video';
import { MEDIA, posterUrl, stagedSeconds } from '../frame/media';
import { FLAG_NAMES, overrides, readQuery, snippet, tierConfig, writeQuery, type FlagName, type PageConfig } from './config';

const $ = <T extends HTMLElement>(selector: string) => document.querySelector<T>(selector)!;

/* ---------- State: one configuration, mirrored in the form, the URL and the snippet ---------- */

let config: PageConfig = readQuery(window.location.search);
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => void listeners.delete(listener);
};

const form = $<HTMLFormElement>('#config');
const snippetElement = $('#snippet');
const configureToggle = $<HTMLButtonElement>('#configure-toggle');
const configure = $('#configure');
const configureSummary = $('#configure-summary');
const tierHint = $('#tier-hint');

/** The line under Configure's Tier switch: where the controls are in this tier and layout. */
function hint(current: PageConfig): string {
  const name = current.tier === 'studio' ? 'Studio' : 'Viewer';
  return current.layout === 'dock'
    ? `${name}: the controls sit in a dock below the picture, never over it.`
    : `${name}: the controls sit over the picture.`;
}

function setConfig(next: PageConfig) {
  config = next;
  render();
  for (const listener of [...listeners]) listener();
}

function render() {
  for (const input of form.querySelectorAll<HTMLInputElement>('input')) {
    if (input.type === 'radio') input.checked = input.value === (input.name === 'tier' ? config.tier : config.layout);
    else input.checked = config.flags[input.name as FlagName];
  }
  // Platform zones are drawn inside the guides layer: without guides the flag has nothing to switch.
  form.querySelector<HTMLInputElement>('input[name="zones"]')!.disabled = !config.flags.guides;
  tierHint.textContent = hint(config);
  // The room for the dock, kept until the Studio code draws it (landing.css). Viewer and the overlay have no dock.
  $('#player').toggleAttribute('data-reserve', config.tier === 'studio' && config.layout === 'dock');
  const on = FLAG_NAMES.filter((name) => config.flags[name]).length;
  configureSummary.textContent = `${config.tier === 'studio' ? 'Studio' : 'Viewer'} · ${config.layout === 'dock' ? 'Dock' : 'Overlay'} · ${on} of ${FLAG_NAMES.length} features on`;

  snippetElement.textContent = snippet(config, MEDIA.fps);

  // Never a reload, and the frame link in the hash (`#t=…`) stays.
  const query = writeQuery(config, window.location.search);
  window.history.replaceState(window.history.state, '', `${window.location.pathname}?${query}${window.location.hash}`);

  renderTasks();
}

/* ---------- Configure: a disclosure under the player, closed on load ---------- */

/** Open or close Configure. The CSS animates the height from `data-open` and hides the closed body from everyone. */
function setConfigureOpen(open: boolean) {
  configureToggle.setAttribute('aria-expanded', String(open));
  configure.toggleAttribute('data-open', open);
}
// Wired once, here: inside `render` every configuration change added another listener, and two of them cancel out.
configureToggle.addEventListener('click', () => setConfigureOpen(configureToggle.getAttribute('aria-expanded') !== 'true'));
// The skip link lands on the button, which is a better place for the keyboard than a closed section.
$('.skip').addEventListener('click', (event) => {
  event.preventDefault();
  configureToggle.focus();
});

/* ---------- Tier and layout changes keep the control in place ---------- */

/** A tier change that ends this soon after the last change of the player's size is taken as settled. */
const HOLD_QUIET_MS = 800;
/** How long a tier change waits for the player to change size at all (Studio's code may still be loading). */
const HOLD_WAIT_MS = 6000;
let releaseHold: (() => void) | null = null;

/**
 * Runs a tier or layout change and keeps `control` (the radio the visitor used) where it was on screen. Viewer and
 * the overlay have no dock, so the player's height changes and Configure under it moves; once it has, the page
 * scrolls by the difference,
 * instantly. It only compensates: it never scrolls to reveal anything, and at the top of the page, where it cannot
 * scroll far enough, the control moves. Where the browser's scroll anchoring has already kept the control in place
 * the difference is zero and this does nothing. It stops when the size has been quiet for a moment, or when the
 * visitor scrolls or presses a key. To remove the behaviour, delete this function and call `change` directly.
 */
function holdInPlace(control: HTMLElement, change: () => void) {
  releaseHold?.();
  const before = control.getBoundingClientRect().top;
  change();
  const compensate = () => {
    const drift = control.getBoundingClientRect().top - before;
    // The page has no smooth scrolling, so `auto` is instant, with or without reduced motion.
    if (Math.abs(drift) >= 0.5) window.scrollBy({ top: drift, behavior: 'auto' });
    window.clearTimeout(timer);
    timer = window.setTimeout(release, HOLD_QUIET_MS);
  };
  const observer = new ResizeObserver(compensate);
  observer.observe($('#player'));
  let timer = window.setTimeout(release, HOLD_WAIT_MS);
  const stopOn = ['wheel', 'touchmove', 'keydown'] as const;
  function release() {
    observer.disconnect();
    window.clearTimeout(timer);
    for (const name of stopOn) window.removeEventListener(name, release, true);
    if (releaseHold === release) releaseHold = null;
  }
  for (const name of stopOn) window.addEventListener(name, release, { capture: true, passive: true });
  releaseHold = release;
}

form.addEventListener('change', (event) => {
  const input = event.target as HTMLInputElement;
  if (input.name === 'tier') holdInPlace(input, () => setConfig(tierConfig(input.value === 'viewer' ? 'viewer' : 'studio')));
  else if (input.name === 'layout') holdInPlace(input, () => setConfig({ ...config, layout: input.value === 'overlay' ? 'overlay' : 'dock' }));
  else if ((FLAG_NAMES as readonly string[]).includes(input.name)) setConfig({ ...config, flags: { ...config.flags, [input.name]: input.checked } });
});
form.addEventListener('submit', (event) => event.preventDefault());

/* ---------- Code: copy ---------- */

const copyStatus = $('#copy-status');
let copyTimer = 0;

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Clipboard access can be refused; fall back to a selection copy.
  }
  try {
    const field = document.createElement('textarea');
    field.value = text;
    field.setAttribute('readonly', '');
    field.style.cssText = 'position:fixed;opacity:0;pointer-events:none';
    document.body.appendChild(field);
    field.select();
    const ok = document.execCommand('copy');
    field.remove();
    return ok;
  } catch {
    return false;
  }
}

$('#copy').addEventListener('click', () => {
  void copyText(snippetElement.textContent ?? '').then((ok) => {
    copyStatus.textContent = ok ? 'Copied' : 'Could not copy. Select the text instead.';
    window.clearTimeout(copyTimer);
    copyTimer = window.setTimeout(() => (copyStatus.textContent = ''), 2500);
  });
});

/* ---------- Event log ---------- */

/** True while the page stages the player on load, so the skin's events for it stay out of the log. */
let staging = false;

const LOG_SIZE = 20;
const log = $('#log');
const logEmpty = $('#log-empty');

const video = () => document.querySelector<HTMLVideoElement>('#player video');
const seconds = (value: number) => value.toFixed(3);
const timecodeNow = () => formatTimecode(framesFromSeconds(video()?.currentTime ?? 0, MEDIA.fps), MEDIA.fps);

function logEvent(name: string, detail: string) {
  if (staging) return; // the staged state is the page's doing, not the visitor's
  const item = document.createElement('li');
  for (const [className, text] of [['log-time', timecodeNow()], ['log-name', name], ['log-detail', detail]] as const) {
    const part = document.createElement('span');
    part.className = className;
    part.textContent = text;
    item.appendChild(part);
  }
  log.prepend(item);
  while (log.children.length > LOG_SIZE) log.lastElementChild?.remove();
  logEmpty.hidden = true;
}

$('#log-clear').addEventListener('click', () => {
  log.replaceChildren();
  logEmpty.hidden = false;
});

// The skin's events are callback props. `onFrameChange` fires on every frame and is left out of the log.
const handlers = {
  onRangeChange: (range: FramelineRange) =>
    logEvent('onRangeChange', `in ${range.in === null ? 'not set' : seconds(range.in)} · out ${range.out === null ? 'not set' : seconds(range.out)}`),
  onGuidesChange: (view: FramelineEffectiveGuides) =>
    logEvent(
      'onGuidesChange',
      [view.guides.length ? `guides ${view.guides.join(', ')}` : '', view.crop ? `crop ${view.crop}` : '', view.zones ? `zones ${view.zones}` : ''].filter(Boolean).join(' · ') ||
        'nothing drawn'
    ),
  onMarkerSelect: (marker: FramelineMarker) => logEvent('onMarkerSelect', `"${marker.label}" at ${seconds(marker.time)}`),
  onFrameGrab: (info: FramelineFrameGrabInfo) => {
    logEvent('onFrameGrab', `frame ${info.frame} · ${info.width}×${info.height} · ${info.target === 'file' ? info.fileName : 'clipboard'}`);
    grabbed?.();
  },
  onCopyLink: (info: FramelineCopyLinkInfo) => logEvent('onCopyLink', `frame ${info.frame} · ${info.url.slice(info.url.indexOf('#'))}`),
  onZoomChange: (level: FramelineZoomLevel) => logEvent('onZoomChange', level === 'fit' ? 'fit' : `${level}%`),
};

/* ---------- Try this ---------- */

const api: { current: FramelineApi | null } = { current: null };
const tryStatus = $('#try-status');
const FLAG_LABELS: Record<FlagName, string> = {
  timecode: 'Timecode',
  frameStep: 'Frame step',
  loop: 'Loop',
  cuts: 'Previous and next cut',
  range: 'In and Out points',
  markers: 'Markers',
  grabFrame: 'Grab frame',
  copyLink: 'Copy link at timecode',
  guides: 'Guides and crop masks',
  zones: 'Platform zones',
  zoom: 'Zoom and pan',
};

/** The demo's markers as last loaded by the player, for the `review` task. */
let demoMarkers: FramelineMarker[] = [];
/** The marker the `review` task goes to: a note that names a single frame. */
const REVIEW_MARKER = 'hold';

/** Steps of a running "Show me", so the next one can cancel them. */
let timers: number[] = [];
let grabbed: (() => void) | null = null;
const later = (ms: number, work: () => void) => void timers.push(window.setTimeout(work, ms));
const say = (message: string) => (tryStatus.textContent = message);

interface Task {
  needs: FlagName[];
  /** Runs the task; returns what to say when it is done, or nothing when it says so itself later. */
  run(handle: FramelineApi, media: HTMLVideoElement): string | void;
}

const TASKS: Record<string, Task> = {
  step: {
    needs: ['frameStep'],
    run(handle) {
      handle.setZoom('fit');
      // `step` pauses first; three frames, one at a time, so each one can be seen.
      handle.step(1);
      later(350, () => handle.step(1));
      later(700, () => handle.step(1));
      return 'Paused and stepped three frames forward. The timecode shows the frame.';
    },
  },
  range: {
    needs: ['range'],
    run(handle, media) {
      const duration = media.duration;
      const start = duration > 12 ? Math.round(duration * 0.25) : duration * 0.25;
      const end = duration > 12 ? start + 4 : duration * 0.75;
      handle.setZoom('fit');
      handle.setRange({ in: start, out: end });
      handle.seek(start);
      if (!config.flags.loop) return 'Marked a range on the timeline. Drag its handles to change it; playback stays inside it and stops at Out.';
      handle.setLoop(true);
      void media.play().catch(() => undefined);
      return 'Marked a range and started playing it; it loops. Press K or Space to stop, R to switch Loop off.';
    },
  },
  review: {
    needs: ['markers'],
    run(handle, media) {
      // The marker comes from the loaded markers file, not from a time written here.
      const marker = demoMarkers.find((item) => item.id === REVIEW_MARKER);
      if (!marker) return 'The markers have not loaded yet. Try again in a moment.';
      media.pause();
      handle.setZoom('fit');
      handle.seek(marker.time);
      return `On the marker "${marker.label}". Press S to copy a link to this frame.`;
    },
  },
  guides: {
    needs: ['guides'],
    run(handle) {
      handle.setZoom('fit');
      if (config.flags.zones) {
        handle.setGuides({ guides: [], crop: '9:16', zones: 'tiktok' });
        return 'The 9:16 mask and the TikTok zones are on. Shift+V hides the guides and shows them again.';
      }
      handle.setGuides({ guides: ['title-safe'], crop: null, zones: null });
      return 'Title safe is on. Shift+V hides the guides and shows them again.';
    },
  },
  zoom: {
    needs: ['zoom'],
    run(handle) {
      handle.setZoom('100');
      for (const [index, direction] of (['right', 'right', 'down'] as const).entries()) later(450 + index * 300, () => handle.pan(direction));
      return 'Zoomed to 100%, the pixels of the source, and moved the view right and down. Shift+Z steps back; Fit is in the Zoom menu.';
    },
  },
  grab: {
    needs: ['grabFrame'],
    run(handle) {
      grabbed = () => {
        grabbed = null;
        say('Saved the frame on screen as a PNG. Look in your downloads.');
      };
      later(2500, () => {
        if (!grabbed) return;
        grabbed = null;
        say('The frame could not be grabbed. Play the video for a moment and try again.');
      });
      handle.grabFrame();
    },
  },
};

/** Every element that runs a task: a Feature row (`data-task`) or a Cue row under the player (`data-cue`). */
const taskItems = [...document.querySelectorAll<HTMLElement>('[data-task], [data-cue]')];
const taskOf = (item: HTMLElement) => TASKS[item.dataset.task ?? item.dataset.cue ?? ''];

function renderTasks() {
  for (const item of taskItems) {
    const task = taskOf(item);
    if (!task) continue;
    const missing = task.needs.filter((name) => !config.flags[name]);
    item.querySelector<HTMLButtonElement>('button')!.disabled = missing.length > 0;
    // A Feature row says what to switch on; a Cue row only goes quiet.
    const need = item.querySelector<HTMLElement>('.need');
    if (!need) continue;
    need.hidden = missing.length === 0;
    need.textContent = missing.length ? `Switch on ${missing.map((name) => FLAG_LABELS[name]).join(' and ')} in Configure to try this.` : '';
  }
}

for (const item of taskItems) {
  item.querySelector('button')!.addEventListener('click', () => {
    const task = taskOf(item);
    const handle = api.current;
    const media = video();
    for (const timer of timers) window.clearTimeout(timer);
    timers = [];
    grabbed = null;
    if (!task) return;
    if (!handle || !media) return void say('The Studio tools are still loading. Try again in a moment.');
    if (!(media.duration > 0)) return void say('The video has not loaded yet. Try again in a moment.');

    // Bring the player into view without moving focus: the keyboard stays on this button.
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    $('#player').scrollIntoView({ block: 'nearest', behavior: calm ? 'auto' : 'smooth' });

    const done = task.run(handle, media);
    if (done) say(done);
  });
}

/* ---------- Staging: what a first-time visitor sees before touching the player ---------- */

const STAGED = stagedSeconds(MEDIA);
/** The skin's own storage key for the guides it remembers (`persist` is left at its default on this page). */
const REMEMBERED_KEY = 'frameline:v1';

/** Staging is decided once, on load: a page opened in Studio, on a source that has a staged state. */
let stagePending = STAGED !== null && config.tier === 'studio';

/**
 * While staging is pending the dock's controls are not shown (`data-staging`, landing.css): the range lands after the
 * dock is drawn, and its handles and the Reset range button would move the dock about once it does. Shown again two
 * frames after the staged state is set, so they appear once, in place; landing.css shows them after 4 s regardless.
 */
const player = $('#player');
player.toggleAttribute('data-staging', stagePending);
const staged = () => requestAnimationFrame(() => requestAnimationFrame(() => player.removeAttribute('data-staging')));

/** Whether this visitor has a remembered set of guides. The skin restores it, and it wins over the staged guide. */
function hasRememberedGuides(): boolean {
  try {
    return window.localStorage.getItem(REMEMBERED_KEY) !== null;
  } catch {
    return false;
  }
}

/**
 * Sets the range, the guide and the playhead, once, when the Studio player first has a handle and the video has a
 * duration. Paused, silent, no focus, no scrolling. A frame link in the hash (`#t=…`) keeps the playhead: the skin
 * seeks to it itself. Not repeated after the visitor changes the range or comes back from Viewer.
 */
function stage() {
  if (!stagePending || !STAGED) return;
  const media = video();
  if (!media) return;
  stagePending = false;

  const apply = () => {
    if (!(media.duration > 0)) return;
    media.removeEventListener('loadedmetadata', apply);
    media.removeEventListener('durationchange', apply);
    const handle = api.current;
    if (!handle) return staged(); // the visitor went to Viewer before the video was ready
    staging = true;
    try {
      handle.setRange({ in: STAGED.in, out: STAGED.out });
      if (!hasRememberedGuides()) handle.setGuides({ guides: STAGED.guides });
      if (!/(?:^#|&)tc?=/.test(window.location.hash)) handle.seek(STAGED.playhead);
    } finally {
      staging = false;
      staged();
    }
  };
  media.addEventListener('loadedmetadata', apply);
  media.addEventListener('durationchange', apply);
  apply();
}

/** The skin's handle arrives here: `null` in Viewer and until the Studio code has loaded. */
function setApi(handle: FramelineApi | null) {
  api.current = handle;
  if (handle) stage();
}

/* ---------- The player ---------- */

function Player() {
  const current = useSyncExternalStore(subscribe, () => config);
  const markers = useDemoMarkers(MEDIA);
  demoMarkers = markers;
  const features = useMemo(() => overrides(current), [current]);

  return (
    <VideoPlayer poster={posterUrl(MEDIA)}>
      <FramelineSkin tier={current.tier} layout={current.layout} features={features} fps={MEDIA.fps} markers={markers} apiRef={setApi} {...handlers}>
        <DemoVideo source={MEDIA} />
      </FramelineSkin>
    </VideoPlayer>
  );
}

render();

// A file with black bars around its picture: the stage takes the picture's shape and the video covers it, so the
// bars fall outside the stage. Set before the player mounts, so the placeholder already has the final height.
// The ratio goes on the block around the player, because the page also sizes that block's width with it.
if (MEDIA.picture) {
  $('.stage').style.setProperty('--fl-stage-ratio', `${MEDIA.picture.width} / ${MEDIA.picture.height}`);
  $('#player').style.setProperty('--media-object-fit', 'cover');
}

createRoot($('#player')).render(
  <StrictMode>
    <Player />
  </StrictMode>
);
