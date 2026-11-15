import { MuxVideo } from '@videojs/react/media/mux-video';
import { VideoPlayer } from '@videojs/react/video';

import { VideoSkin } from '@/video/skin';

import type { PlaybackProps } from '../shell/params';

// The media lives in ./media so it can be swapped in one place.
import { MEDIA } from './media';

/** `media` carries the workbench's playback options: autoplay, muted, loop, and preload. */
export function Player({ media }: { media?: PlaybackProps }) {
  return (
    <VideoPlayer poster={MEDIA.poster}>
      <VideoSkin>
        <MuxVideo {...media} src={MEDIA.src} playsInline crossOrigin="">
          {MEDIA.chapters && <track kind="chapters" label="English" srcLang="en" src={MEDIA.chapters} default />}
        </MuxVideo>
      </VideoSkin>
    </VideoPlayer>
  );
}
