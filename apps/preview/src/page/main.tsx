/**
 * The configurator page's script. The page itself is plain HTML (apps/preview/index.html) and CSS (page.css); this
 * mounts the player into it and wires the form, the query string, the code snippet, the event log and the
 * "Show me" buttons. Everything that drives the player goes through the skin's public props and its `apiRef` handle.
 */
import { VideoPlayer } from '@videojs/react/video';
import { StrictMode, useMemo, useSyncExternalStore } from 'react';
import { createRoot } from 'react-dom/client';

import '@/skin.css';
import { FramelineSkin, type CopyLinkInfo, type EffectiveGuides, type FrameGrabInfo, type FramelineApi, type InOutRange, type Marker, type ZoomLevel } from '@/pro';
import { formatTimecode, framesFromSeconds } from '@/pro/timecode';

import { DemoVideo, useDemoMarkers } from '../frame/demo-video';
import { MEDIA, posterUrl } from '../frame/media';
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
  form.querySelector<HTMLInputElement>('input[name="platformZones"]')!.disabled = !config.flags.guides;

  snippetElement.textContent = snippet(config, MEDIA.fps);

  // Never a reload, and the frame link in the hash (`#t=…`) stays.
  const query = writeQuery(config, window.location.search);
  window.history.replaceState(window.history.state, '', `${window.location.pathname}?${query}${window.location.hash}`);

  renderTasks();
}

form.addEventListener('change', (event) => {
  const input = event.target as HTMLInputElement;
  if (input.name === 'tier') setConfig(tierConfig(input.value === 'viewer' ? 'viewer' : 'studio'));
  else if (input.name === 'layout') setConfig({ ...config, layout: input.value === 'overlay' ? 'overlay' : 'dock' });
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

const LOG_SIZE = 20;
const log = $('#log');
const logEmpty = $('#log-empty');

const video = () => document.querySelector<HTMLVideoElement>('#player video');
const seconds = (value: number) => value.toFixed(3);
const timecodeNow = () => formatTimecode(framesFromSeconds(video()?.currentTime ?? 0, MEDIA.fps), MEDIA.fps);

function logEvent(name: string, detail: string) {
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
  onInOutChange: (range: InOutRange) =>
    logEvent('onInOutChange', `in ${range.in === null ? 'not set' : seconds(range.in)} · out ${range.out === null ? 'not set' : seconds(range.out)}`),
  onGuidesChange: (view: EffectiveGuides) =>
    logEvent(
      'onGuidesChange',
      [view.guides.length ? `guides ${view.guides.join(', ')}` : '', view.crop ? `crop ${view.crop}` : '', view.zones ? `zones ${view.zones}` : ''].filter(Boolean).join(' · ') ||
        'nothing drawn'
    ),
  onMarkerSelect: (marker: Marker) => logEvent('onMarkerSelect', `"${marker.label}" at ${seconds(marker.time)}`),
  onFrameGrab: (info: FrameGrabInfo) => {
    logEvent('onFrameGrab', `frame ${info.frame} · ${info.width}×${info.height} · ${info.target === 'file' ? info.fileName : 'clipboard'}`);
    grabbed?.();
  },
  onCopyLink: (info: CopyLinkInfo) => logEvent('onCopyLink', `frame ${info.frame} · ${info.url.slice(info.url.indexOf('#'))}`),
  onZoomChange: (level: ZoomLevel) => logEvent('onZoomChange', level === 'fit' ? 'fit' : `${level}%`),
};

/* ---------- Try this ---------- */

const api: { current: FramelineApi | null } = { current: null };
const tryStatus = $('#try-status');
const FLAG_LABELS: Record<FlagName, string> = {
  timecode: 'Timecode',
  frameStep: 'Frame step',
  loop: 'Loop',
  shotNav: 'Previous and next cut',
  inOut: 'In and Out points',
  markers: 'Markers',
  grabFrame: 'Grab frame',
  copyTimecodeLink: 'Copy link at timecode',
  guides: 'Guides and crop masks',
  platformZones: 'Platform zones',
  zoom: 'Zoom and pan',
};

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
    needs: ['inOut'],
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
  zones: {
    needs: ['guides', 'platformZones'],
    run(handle) {
      handle.setZoom('fit');
      handle.setGuides({ guides: [], crop: '9:16', zones: 'tiktok' });
      return 'The 9:16 mask and the TikTok zones are on. Shift+V hides the guides and shows them again.';
    },
  },
  safe: {
    needs: ['guides'],
    run(handle) {
      handle.setZoom('fit');
      handle.setGuides({ guides: ['title-safe'], crop: null, zones: null });
      return 'Title safe is on. Shift+V hides the guides and shows them again.';
    },
  },
  zoom: {
    needs: ['zoom'],
    run(handle) {
      handle.setZoom('200');
      for (const [index, direction] of (['right', 'right', 'down'] as const).entries()) later(450 + index * 300, () => handle.pan(direction));
      return 'Zoomed to 200% and moved the view right and down. Shift+Z steps back; Fit is in the Zoom menu.';
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

function renderTasks() {
  for (const item of document.querySelectorAll<HTMLElement>('[data-task]')) {
    const task = TASKS[item.dataset.task ?? ''];
    if (!task) continue;
    const missing = task.needs.filter((name) => !config.flags[name]);
    const need = item.querySelector<HTMLElement>('.need')!;
    item.querySelector<HTMLButtonElement>('button')!.disabled = missing.length > 0;
    need.hidden = missing.length === 0;
    need.textContent = missing.length ? `Switch on ${missing.map((name) => FLAG_LABELS[name]).join(' and ')} in Features to try this.` : '';
  }
}

for (const item of document.querySelectorAll<HTMLElement>('[data-task]')) {
  item.querySelector('button')!.addEventListener('click', () => {
    const task = TASKS[item.dataset.task ?? ''];
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

/* ---------- The player ---------- */

function Player() {
  const current = useSyncExternalStore(subscribe, () => config);
  const markers = useDemoMarkers(MEDIA);
  const features = useMemo(() => overrides(current), [current]);

  return (
    <VideoPlayer poster={posterUrl(MEDIA)}>
      <FramelineSkin tier={current.tier} layout={current.layout} features={features} fps={MEDIA.fps} markers={markers} apiRef={api} {...handlers}>
        <DemoVideo source={MEDIA} />
      </FramelineSkin>
    </VideoPlayer>
  );
}

render();

createRoot($('#player')).render(
  <StrictMode>
    <Player />
  </StrictMode>
);
