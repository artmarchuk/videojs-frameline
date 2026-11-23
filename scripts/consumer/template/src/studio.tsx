import { VideoPlayer } from '@videojs/react/video';
import { createRoot } from 'react-dom/client';
import { FramelineSkin, type FramelineCopyLinkInfo, type FramelineLinkPosition, type FramelineLinkUrl } from 'videojs-frameline';

import { Reel, REEL_FPS } from './media';

declare global {
  interface Window {
    /** What the check reads: every onCopyLink payload, and every call of a linkUrl function. */
    __frameline: { copied: FramelineCopyLinkInfo[]; asked: FramelineLinkPosition[] };
  }
}
window.__frameline = { copied: [], asked: [] };

/** `?link=` picks what Copy link copies: nothing given, a base URL, a function returning a URL, or one returning null. */
function linkUrl(): FramelineLinkUrl | undefined {
  switch (new URLSearchParams(location.search).get('link')) {
    case 'string':
      return 'https://example.com/review/42?cut=3';
    case 'function':
      return (position) => {
        window.__frameline.asked.push(position);
        return `https://example.com/#/review/42?${position.fragment}`;
      };
    case 'null':
      return (position) => {
        window.__frameline.asked.push(position);
        return null;
      };
    default:
      return undefined;
  }
}

createRoot(document.getElementById('root')!).render(
  <>
    {/* The host's own content in the same React root: it must survive a pro chunk that fails to load. */}
    <p data-host-content>Host content</p>
    <VideoPlayer>
      <FramelineSkin tier="studio" fps={REEL_FPS} linkUrl={linkUrl()} onCopyLink={(info) => window.__frameline.copied.push(info)}>
        <Reel />
      </FramelineSkin>
    </VideoPlayer>
  </>
);
