// The one place that names the media the preview plays. Step 8 replaces the default with our own Mux video.
// Current default: the scaffold's demo (NASA Cosmic Dawn trailer on Mux), not our own asset.

export interface PreviewMedia {
  src: string;
  poster?: string;
  /** Chapters for the time slider, served from `apps/preview/public`. */
  chapters?: string;
}

const DEFAULT: PreviewMedia = {
  src: 'https://stream.mux.com/83EzHOvVzVN01AsrD01BCpiH02Pj3S8mfzBOu101w2nHC5s.m3u8',
  poster: 'https://image.mux.com/83EzHOvVzVN01AsrD01BCpiH02Pj3S8mfzBOu101w2nHC5s/thumbnail.webp?time=69',
  chapters: './cosmic-dawn-chapters.vtt',
};

/**
 * Test sources for the gate checklist, chosen with `?media=<name>` on `/preview.html`:
 * - `plain`: the sample stream the Video.js docs use; no captions, no chapters.
 * - `error`: a source that does not exist, to exercise the error dialog and retry.
 */
const VARIANTS: Record<string, PreviewMedia> = {
  plain: { src: 'https://stream.mux.com/BV3YZtogl89mg9VcNBhhnHm02Y34zI1nlMuMQfAbl3dM.m3u8' },
  error: { src: 'https://stream.mux.com/this-playback-id-does-not-exist.m3u8' },
};

function pick(): PreviewMedia {
  if (typeof window === 'undefined') return DEFAULT;
  const name = new URLSearchParams(window.location.search).get('media');
  return (name && VARIANTS[name]) || DEFAULT;
}

export const MEDIA: PreviewMedia = pick();
