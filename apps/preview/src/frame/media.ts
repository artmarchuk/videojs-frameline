// The one place that names the demo media. Both pages read it: the configurator (`/`) and the monitor
// (`/preview.html`). To switch the demo to another source, change the one line marked ACTIVE below.

import type { Marker } from '@/pro';

/** One demo source. Files are paths under `apps/preview/public`, written relative to the page (`./demo/…`). */
export interface DemoSource {
  /** A Mux playback ID. The stream and poster URLs are built from it. Give this or `src`. */
  playbackId?: string;
  /** A stream or file URL, for a source that is not on Mux. */
  src?: string;
  /** Frames per second of the source. The player cannot detect it; timecode and frame steps depend on it. */
  fps: number;
  /** A WebVTT captions file, for a source whose stream carries no captions of its own. */
  captions?: string;
  /** A WebVTT chapters file: the cuts for previous/next cut and the Markers menu. */
  chapters?: string;
  /** A JSON file with the markers for the Studio timeline: `[{ "time": 8.4, "label": "…", "end"?: 12, "id"?: "…" }]`. */
  markers?: string;
  /** Poster image. For a Mux source the default is a thumbnail of the stream; `posterTime` picks its moment. */
  poster?: string;
  posterTime?: number;
  /**
   * Whether automatic quality is held to the player's size (Video.js's `source.capRenditionToPlayerSize`). `false`
   * on the demo: a creator checks the picture, so the stream may go as high as the connection allows.
   */
  capRenditionToPlayerSize: boolean;
  /** File name and format for the monitor page's top bar. */
  info?: string;
  /** Leave out the `crossorigin` attribute, so frame capture is blocked. For testing the error path. */
  noCors?: boolean;
  /** What a first-time visitor finds on the landing page's Studio player before touching it. */
  staged?: StagedState;
  /**
   * The picture inside the file, in source pixels, when the file carries black bars around it. The landing page shapes
   * its player to this and crops the bars. Leave it out when the picture fills the file.
   */
  picture?: { width: number; height: number };
}

/**
 * A staged state, in frame numbers of the source (a timecode `HH:MM:SS:FF` is frame `SS × fps + FF`). It belongs to
 * the source: the moments are picked from its picture. `stagedSeconds` converts it for the skin's handle.
 */
export interface StagedState {
  /** The In and Out frames of the range. */
  in: number;
  out: number;
  /** The frame the playhead rests on, paused. The poster shows the same frame. */
  playhead: number;
  /** The checkbox guides that are on. A visitor's remembered guides win over these. */
  guides: readonly string[];
}

/**
 * The reel's staged state: a range across almost the whole reel, set on cuts as an editor would, so a first visit can
 * still watch it all, with the handles in view. In 00:00:02:18 (frame 66): the first frame after the leader, where the
 * chapter "Courier greenscreen comp" starts (2.750 s). Out 00:00:50:16 (frame 1216): the last frame before "Titles"
 * (50.708 s, frame 1217). Playhead 00:00:03:02 (frame 74), in the Courier section.
 */
const REEL_STAGED: StagedState = { in: 66, out: 1216, playhead: 74, guides: ['title-safe'] };
const REEL_FPS = 24;

export const SOURCES = {
  /** NASA's Cosmic Dawn trailer on Mux: the scaffold's test stream. Its captions are in the stream. */
  cosmicDawn: {
    playbackId: '83EzHOvVzVN01AsrD01BCpiH02Pj3S8mfzBOu101w2nHC5s',
    // Measured: the frame clock reports media times in steps of 1/30 s for this stream.
    fps: 30,
    chapters: './demo/cosmic-dawn/chapters.vtt',
    // Samples that exercise the marker pins: a point, one with an end time, the two ends, and three within a second.
    markers: './demo/cosmic-dawn/markers.json',
    posterTime: 69,
    capRenditionToPlayerSize: false,
    info: 'cosmic-dawn-trailer.m3u8 · 1920×1080 · 30 fps',
  },
  /**
   * The author's reel on Mux: 56 s, 1920×1080, green screen with a burned-in timecode. No captions: the stream has
   * none and the file in `demo/reel/` is a placeholder. Chapters are the reel's 13 sections, from the author's cut list;
   * markers are simulated editor and director notes.
   */
  reel: {
    playbackId: '9Y7a3hqNCi4u02fmBFbaK5qWoS6A5cPce7P1mA00JA02tY',
    // Measured with ffprobe on the 1080p rendition: 24/1.
    fps: REEL_FPS,
    chapters: './demo/reel/chapters.vtt',
    markers: './demo/reel/markers.json',
    // The staged frame, asked for at the middle of its interval: Mux's thumbnail at the frame's own start time is the
    // frame before it (`time=6` shows 00:00:05:23, `time=6.02` shows 00:00:06:00).
    posterTime: (REEL_STAGED.playhead + 0.5) / REEL_FPS,
    staged: REEL_STAGED,
    // Every frame carries 4 black rows at the top and 4 at the bottom: the picture is 1920×1072 inside 1920×1080.
    picture: { width: 1920, height: 1072 },
    capRenditionToPlayerSize: false,
    info: 'reel.m3u8 · 1920×1080 · 24 fps',
  },
} satisfies Record<string, DemoSource>;

export type SourceName = keyof typeof SOURCES;

/** ACTIVE: the source both pages play. Change this one line to switch the demo, for example to `'reel'`. */
export const ACTIVE_SOURCE: SourceName = 'reel';

/**
 * Test sources for the gate checklist, chosen with `?media=<name>` on either page (`?media=reel` also works):
 * - `plain`: the sample stream the Video.js docs use; no captions, no chapters.
 * - `error`: a source that does not exist, to exercise the error dialog and retry.
 * - `nocors`: a progressive MP4 loaded without `crossorigin`, so grabbing a frame is refused by the browser.
 * Their frame rate was not measured; 24 is the skin's default.
 *
 * `?cap=1` puts Video.js's player-size cap back on whatever source is chosen, to check what the skin does on a host
 * that keeps the default (`scripts/browser-checks/zoom-rendition-cap.js`).
 */
const VARIANTS: Record<string, DemoSource> = {
  plain: { playbackId: 'BV3YZtogl89mg9VcNBhhnHm02Y34zI1nlMuMQfAbl3dM', fps: 24, poster: '', capRenditionToPlayerSize: false },
  nocors: { src: 'https://stream.mux.com/BV3YZtogl89mg9VcNBhhnHm02Y34zI1nlMuMQfAbl3dM/highest.mp4', fps: 24, noCors: true, capRenditionToPlayerSize: false },
  error: { src: 'https://stream.mux.com/this-playback-id-does-not-exist.m3u8', fps: 24, capRenditionToPlayerSize: false },
};

function pick(): DemoSource {
  const active: DemoSource = SOURCES[ACTIVE_SOURCE];
  if (typeof window === 'undefined') return active;
  const query = new URLSearchParams(window.location.search);
  const name = query.get('media');
  const source = (name && (VARIANTS[name] ?? (SOURCES as Record<string, DemoSource>)[name])) || active;
  return query.get('cap') === '1' ? { ...source, capRenditionToPlayerSize: true } : source;
}

/** The source in use. */
export const MEDIA: DemoSource = pick();

/** A source's staged state in seconds, for `apiRef.setRange` and `apiRef.seek`; `null` for a source without one. */
export function stagedSeconds(source: DemoSource): { in: number; out: number; playhead: number; guides: readonly string[] } | null {
  const staged = source.staged;
  if (!staged) return null;
  return { in: staged.in / source.fps, out: staged.out / source.fps, playhead: staged.playhead / source.fps, guides: staged.guides };
}

/** The stream or file URL of a source. */
export function streamUrl(source: DemoSource): string {
  return source.src ?? `https://stream.mux.com/${source.playbackId}.m3u8`;
}

/** The poster of a source: its own image, or for a Mux source a thumbnail of the stream. `undefined` for none. */
export function posterUrl(source: DemoSource): string | undefined {
  if (source.poster !== undefined) return source.poster || undefined;
  if (!source.playbackId) return undefined;
  const time = source.posterTime === undefined ? '' : `?time=${source.posterTime}`;
  return `https://image.mux.com/${source.playbackId}/thumbnail.webp${time}`;
}

/** Reads a markers file. Anything that is not a list of `{ time, label }` gives no markers; it never throws. */
export async function loadMarkers(url: string | undefined, signal?: AbortSignal): Promise<Marker[]> {
  if (!url) return [];
  try {
    const response = await fetch(url, signal ? { signal } : undefined);
    if (!response.ok) return [];
    const data: unknown = await response.json();
    if (!Array.isArray(data)) return [];
    return data.filter((item): item is Marker => typeof item?.time === 'number' && typeof item?.label === 'string');
  } catch {
    return [];
  }
}
