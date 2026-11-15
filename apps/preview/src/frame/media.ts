// The one place that names the media the preview plays. Step 8 replaces the default with our own Mux video.
// Current default: the scaffold's demo (NASA Cosmic Dawn trailer on Mux), not our own asset.

import type { Marker } from '@/pro';

export interface PreviewMedia {
  src: string;
  poster?: string;
  /** Frames per second of the source. The player cannot detect it. */
  fps?: number;
  /** Leave out the `crossorigin` attribute, so frame capture is blocked. For testing the error path. */
  noCors?: boolean;
  /** Chapters for the time slider, served from `apps/preview/public`. */
  chapters?: string;
  /** Sample markers for the Review timeline. */
  markers?: Marker[];
}

const DEFAULT: PreviewMedia = {
  src: 'https://stream.mux.com/83EzHOvVzVN01AsrD01BCpiH02Pj3S8mfzBOu101w2nHC5s.m3u8',
  poster: 'https://image.mux.com/83EzHOvVzVN01AsrD01BCpiH02Pj3S8mfzBOu101w2nHC5s/thumbnail.webp?time=69',
  chapters: './cosmic-dawn-chapters.vtt',
  // Measured: the frame clock reports media times in steps of 1/30 s for this stream.
  fps: 30,
  // Samples that exercise the marker lane: a point, a range, the two ends, and three within a second (a cluster).
  markers: [
    { id: 'start', time: 0, label: 'Head' },
    { id: 'logo', time: 8.4, label: 'Logo too small' },
    { id: 'grade', time: 34, end: 44, label: 'Check the grade' },
    { id: 'cut-a', time: 62.0, label: 'Trim two frames' },
    { id: 'cut-b', time: 62.3, label: 'Flash frame' },
    { id: 'cut-c', time: 62.6, label: 'Audio pop' },
    { id: 'end', time: 111.143, label: 'Tail' },
  ],
};

/**
 * Test sources for the gate checklist, chosen with `?media=<name>` on `/preview.html`:
 * - `plain`: the sample stream the Video.js docs use; no captions, no chapters.
 * - `error`: a source that does not exist, to exercise the error dialog and retry.
 * - `nocors`: a progressive MP4 loaded without `crossorigin`, so grabbing a frame is refused by the browser.
 */
const VARIANTS: Record<string, PreviewMedia> = {
  plain: { src: 'https://stream.mux.com/BV3YZtogl89mg9VcNBhhnHm02Y34zI1nlMuMQfAbl3dM.m3u8' },
  nocors: { src: 'https://stream.mux.com/BV3YZtogl89mg9VcNBhhnHm02Y34zI1nlMuMQfAbl3dM/highest.mp4', noCors: true },
  error: { src: 'https://stream.mux.com/this-playback-id-does-not-exist.m3u8' },
};

function pick(): PreviewMedia {
  if (typeof window === 'undefined') return DEFAULT;
  const name = new URLSearchParams(window.location.search).get('media');
  return (name && VARIANTS[name]) || DEFAULT;
}

export const MEDIA: PreviewMedia = pick();
