import { MuxVideo } from '@videojs/react/media/mux-video';

/** The same media element on every page: the author's reel on Mux, 24 fps. */
export const REEL_FPS = 24;
const SOURCE = { playbackId: '9Y7a3hqNCi4u02fmBFbaK5qWoS6A5cPce7P1mA00JA02tY', capRenditionToPlayerSize: false };

export function Reel() {
  return <MuxVideo source={SOURCE} playsInline crossOrigin="" />;
}
