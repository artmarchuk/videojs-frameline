// The stock skin: Video.js's Default video skin, as its docs show it (guides/skins.md, "Packaged skin").
import '@videojs/react/video/skin.css';

import { VideoPlayer, VideoSkin } from '@videojs/react/video';
import { createRoot } from 'react-dom/client';

import { Reel } from './media';

createRoot(document.getElementById('root')!).render(
  <VideoPlayer>
    <VideoSkin>
      <Reel />
    </VideoSkin>
  </VideoPlayer>
);
