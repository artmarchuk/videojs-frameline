import { MuxVideo } from '@videojs/react/media/mux-video';
import { VideoPlayer } from '@videojs/react/video';
import { lazy, Suspense, useState } from 'react';

import { ProSkin, type Tier } from '@/pro';

import type { PlaybackProps } from '../shell/params';

// The media lives in ./media so it can be swapped in one place.
import { MEDIA } from './media';

// Loaded only with `?debug`, so it is not part of the normal preview bundle.
const DevTierSwitch = lazy(() => import('./dev-tier-switch'));

const DEBUG = new URLSearchParams(window.location.search).has('debug');

/** `media` carries the workbench's playback options: autoplay, muted, loop, and preload. */
export function Player({ media }: { media?: PlaybackProps }) {
  const [tier, setTier] = useState<Tier>('share');

  return (
    <>
      <VideoPlayer poster={MEDIA.poster}>
        <ProSkin tier={tier} fps={MEDIA.fps}>
          <MuxVideo {...media} src={MEDIA.src} playsInline crossOrigin="">
            {MEDIA.chapters && <track kind="chapters" label="English" srcLang="en" src={MEDIA.chapters} default />}
          </MuxVideo>
        </ProSkin>
      </VideoPlayer>
      {DEBUG && (
        <Suspense fallback={null}>
          <DevTierSwitch tier={tier} onChange={setTier} />
        </Suspense>
      )}
    </>
  );
}
