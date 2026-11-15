import { useMedia } from '@videojs/react';
import { useEffect, useState, type RefObject } from 'react';

/**
 * The `<video>` element of the player that `anchor` sits in, or `null` while there is none.
 *
 * Video.js's `useMedia()` returns a media handle that is only guaranteed to have `play()` and the event methods, and
 * for some engines it is not the element itself. The frame clock needs the real element, so we look it up in the
 * player container. `useMedia()` is still read here: it changes when media attaches, detaches or is swapped, which is
 * exactly when the lookup has to run again.
 */
export function useVideoElement(anchor: RefObject<HTMLElement | null>): HTMLVideoElement | null {
  const media = useMedia();
  const [video, setVideo] = useState<HTMLVideoElement | null>(null);

  useEffect(() => {
    const container = anchor.current?.closest('.media-container') ?? null;
    if (!container) {
      setVideo(null);
      return;
    }

    const find = () => setVideo(container.querySelector('video'));
    find();

    // The element can also be replaced without the media handle changing.
    const observer = new MutationObserver(find);
    observer.observe(container, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [anchor, media]);

  return video;
}
