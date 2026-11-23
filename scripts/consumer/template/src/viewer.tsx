import { VideoPlayer } from '@videojs/react/video';
import { createRoot } from 'react-dom/client';
import { FramelineSkin } from 'videojs-frameline';

import { Reel, REEL_FPS } from './media';

createRoot(document.getElementById('root')!).render(
  <VideoPlayer>
    <FramelineSkin tier="viewer" fps={REEL_FPS}>
      <Reel />
    </FramelineSkin>
  </VideoPlayer>
);
