import { VideoPlayer } from '@videojs/react/video';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import '@/skin.css';
import './embed.css';
import { reloadOnStaleChunk } from '../reload-on-stale-chunk';
import { FramelineSkin, TIERS, type FramelineTier } from '@/pro';

import { DemoVideo, useDemoMarkers } from '../frame/demo-video';
import { MEDIA, posterUrl, SOURCES, type DemoSource } from '../frame/media';

reloadOnStaleChunk();

/**
 * The player alone, for an iframe on another site. No title, no switches, nothing outside the player. It fills the
 * frame's width and fits its height.
 *
 * Without parameters it plays the demo source in Studio. The page URL can name another video:
 * - `?src=<https URL>`: an HLS stream (`.m3u8`) or a file such as an `.mp4`;
 * - `?mux=<playback ID>`: a Mux video, which also gets hover thumbnails and a poster;
 * - `?tier=viewer|studio` (default `studio`), `?fps=<frames per second>` (default 24 for your own video),
 *   `?poster=<https URL>`.
 * A `src` or `poster` that is not an http(s) URL is ignored.
 */
const QUERY = new URLSearchParams(window.location.search);

function httpUrl(value: string | null): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : undefined;
  } catch {
    return undefined;
  }
}

const TIER: FramelineTier = TIERS.find((tier) => tier === QUERY.get('tier')) ?? 'studio';
const FPS = Number(QUERY.get('fps'));
const SRC = httpUrl(QUERY.get('src'));
const MUX = QUERY.get('mux')?.match(/^[A-Za-z0-9]+$/)?.[0];
const POSTER = httpUrl(QUERY.get('poster'));

/** The host's own video, or `null` to play the demo. */
function hostSource(): DemoSource | null {
  if (!SRC && !MUX) return null;
  // A playback ID this site already knows plays as it does on the landing page: its poster frame, chapters and markers.
  const known = MUX && Object.values(SOURCES as Record<string, DemoSource>).find((source) => source.playbackId === MUX);
  if (known) return { ...known, ...(POSTER ? { poster: POSTER } : {}), noCors: TIER === 'viewer' };
  return {
    ...(MUX ? { playbackId: MUX } : { src: SRC }),
    fps: FPS > 0 && FPS <= 240 ? FPS : 24,
    ...(POSTER ? { poster: POSTER } : {}),
    capRenditionToPlayerSize: false,
    // `crossorigin` is only needed to grab frames, a Studio tool. Leaving it out in Viewer lets a file play from a
    // host that sends no CORS headers.
    noCors: TIER === 'viewer',
  };
}

const SOURCE = hostSource() ?? MEDIA;

function Embed() {
  const markers = useDemoMarkers(SOURCE);
  return (
    <VideoPlayer poster={posterUrl(SOURCE)}>
      <FramelineSkin tier={TIER} density="comfortable" fps={SOURCE.fps} markers={markers} persist="frameline:embed">
        <DemoVideo source={SOURCE} />
      </FramelineSkin>
    </VideoPlayer>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Embed />
  </StrictMode>
);
