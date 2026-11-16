import { VideoPlayer } from '@videojs/react/video';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import '@/skin.css';
import { FramelineSkin } from '@/pro';

import { DemoVideo, useDemoMarkers } from '../frame/demo-video';
import { MEDIA, posterUrl } from '../frame/media';

/**
 * Two independent Studio players in one React tree (one root, so React's ids stay unique across them). Each
 * remembers its guides under its own `persist` key; a host that wants two players to share remembered guides leaves
 * `persist` at its default.
 */
function One({ name, persist }: { name: string; persist: string }) {
  const markers = useDemoMarkers(MEDIA);
  return (
    <section aria-label={`Player ${name}`}>
      <h2>Player {name}</h2>
      <VideoPlayer poster={posterUrl(MEDIA)}>
        <FramelineSkin tier="studio" fps={MEDIA.fps} markers={markers} persist={persist}>
          <DemoVideo source={MEDIA} />
        </FramelineSkin>
      </VideoPlayer>
    </section>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <One name="A" persist="frameline:two-a" />
    <One name="B" persist="frameline:two-b" />
  </StrictMode>
);
