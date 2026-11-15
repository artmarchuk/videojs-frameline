import { MuxVideo } from '@videojs/react/media/mux-video';
import { VideoPlayer } from '@videojs/react/video';
import { lazy, Suspense, useCallback, useMemo, useState } from 'react';

import { ProSkin, type Tier } from '@/pro';

import type { PlaybackProps } from '../shell/params';

// The media lives in ./media so it can be swapped in one place.
import { MEDIA } from './media';

// Loaded only with `?debug`, so they are not part of the normal preview bundle.
const DevTierSwitch = lazy(() => import('./dev-tier-switch'));
const EventLog = lazy(() => import('./event-log'));

const DEBUG = new URLSearchParams(window.location.search).has('debug');

/** `media` carries the workbench's playback options: autoplay, muted, loop, and preload. */
export function Player({ media }: { media?: PlaybackProps }) {
  const [tier, setTier] = useState<Tier>('share');
  const [events, setEvents] = useState<string[]>([]);

  const log = useCallback((name: string, detail: unknown) => {
    const line = `${name} ${JSON.stringify(detail, (_key, value) => (typeof value === 'number' ? Number(value.toFixed(3)) : value))}`;
    setEvents((current) => [line, ...current].slice(0, 30));
  }, []);

  // With `?debug` every event the skin emits is appended to the on-page log.
  const handlers = useMemo(
    () =>
      DEBUG
        ? {
            onInOutChange: (range: unknown) => log('inout:change', range),
            onMarkerSelect: (marker: unknown) => log('marker:select', marker),
            onCopyLink: (info: unknown) => log('link:copy', info),
            onPosterFrame: (info: unknown) => log('poster:frame', info),
            onFrameChange: (frame: unknown) => log('frame:change', frame),
          }
        : {},
    [log]
  );

  return (
    <>
      <VideoPlayer poster={MEDIA.poster}>
        <ProSkin tier={tier} fps={MEDIA.fps} markers={MEDIA.markers} {...handlers}>
          <MuxVideo {...media} src={MEDIA.src} playsInline crossOrigin={MEDIA.noCors ? undefined : ''}>
            {MEDIA.chapters && <track kind="chapters" label="English" srcLang="en" src={MEDIA.chapters} default />}
          </MuxVideo>
        </ProSkin>
      </VideoPlayer>
      {DEBUG && (
        <Suspense fallback={null}>
          <DevTierSwitch tier={tier} onChange={setTier} />
          <EventLog events={events} />
        </Suspense>
      )}
    </>
  );
}
