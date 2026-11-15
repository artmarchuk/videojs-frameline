import { MuxVideo } from '@videojs/react/media/mux-video';
import { useEffect, useMemo, useState } from 'react';

import type { Marker } from '@/pro';

import type { PlaybackProps } from '../shell/params';
import { loadMarkers, streamUrl, type DemoSource } from './media';

/**
 * The media element for a demo source: the stream with the source's own options, and its captions and chapters
 * tracks. Goes inside the skin, as its child.
 */
export function DemoVideo({ source, playback }: { source: DemoSource; playback?: PlaybackProps | undefined }) {
  // A Mux source is named by its playback ID, not by its URL: MuxVideo derives the stream and the storyboard (the
  // hover thumbnails) from the ID, and gives no storyboard to a source that only has a `src`.
  const structured = useMemo(
    () => ({
      ...(source.playbackId ? { playbackId: source.playbackId } : { src: streamUrl(source) }),
      capRenditionToPlayerSize: source.capRenditionToPlayerSize,
    }),
    [source]
  );

  return (
    <MuxVideo {...playback} source={structured} playsInline crossOrigin={source.noCors ? undefined : ''}>
      {source.captions && <track kind="subtitles" label="English" srcLang="en" src={source.captions} />}
      {source.chapters && <track kind="chapters" label="English" srcLang="en" src={source.chapters} default />}
    </MuxVideo>
  );
}

const NONE: Marker[] = [];

/** The markers of a demo source, read from its markers file. Empty until the file has arrived. */
export function useDemoMarkers(source: DemoSource): Marker[] {
  const [markers, setMarkers] = useState<Marker[]>(NONE);

  useEffect(() => {
    const abort = new AbortController();
    void loadMarkers(source.markers, abort.signal).then((next) => {
      if (!abort.signal.aborted) setMarkers(next.length ? next : NONE);
    });
    return () => abort.abort();
  }, [source]);

  return markers;
}
