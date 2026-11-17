import { I18nProvider } from '@videojs/react/i18n';
import { type CSSProperties, type RefObject, StrictMode, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';

import '@/skin.css';
import './preview.css';
import { playbackProps, playerStyles } from '../shell/params';
import { initialParams, onParamsChange } from './frame';
import { MEDIA } from './media';
import { Player } from './player';

// The workbench shell, or a link, can fix the player's width (`#width=384`). Without one the monitor uses the window.
const SIZED = new URLSearchParams(location.hash.slice(1)).has('width');

/** The source's picture inside its file (`media.ts`), as a CSS ratio; `null` when the picture fills the file. */
const PICTURE_RATIO = MEDIA.picture ? `${MEDIA.picture.width} / ${MEDIA.picture.height}` : null;

/**
 * Crops a source's black bars, as the landing page does: the stage takes the picture's shape (see `Preview`) and the
 * video covers it. Only while the video's box has the picture's shape: on a short window the monitor makes the stage
 * shorter and letterboxes the picture, and covering it there would crop the picture itself. The video is looked for
 * again when the tier switch mounts a new one.
 */
function useCoverBars(host: RefObject<HTMLDivElement | null>, active: boolean) {
  useEffect(() => {
    const element = host.current;
    const picture = MEDIA.picture;
    if (!element || !active || !picture) return;
    const ratio = picture.width / picture.height;
    let video: HTMLVideoElement | null = null;
    const sized = new ResizeObserver(() => {
      if (!video) return;
      const box = video.getBoundingClientRect();
      const fits = box.height > 0 && Math.abs(box.width / box.height / ratio - 1) < 0.003;
      if (fits) element.style.setProperty('--media-object-fit', 'cover');
      else element.style.removeProperty('--media-object-fit');
    });
    const find = () => {
      const next = element.querySelector('video');
      if (next === video) return;
      if (video) sized.unobserve(video);
      video = next;
      if (video) sized.observe(video);
    };
    const mounted = new MutationObserver(find);
    mounted.observe(element, { childList: true, subtree: true });
    find();
    return () => {
      mounted.disconnect();
      sized.disconnect();
      element.style.removeProperty('--media-object-fit');
    };
  }, [host, active]);
}

function Preview() {
  const [params, setParams] = useState(initialParams);
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => onParamsChange(setParams), []);

  const styles = playerStyles(params);
  // The default ratio stands for the source's own shape: for a file with bars, that is its picture.
  const shaped = PICTURE_RATIO !== null && params.ratio === '16:9' && '--preview-player-ratio' in styles;
  if (shaped) styles['--preview-player-ratio'] = PICTURE_RATIO;
  useCoverBars(host, shaped);

  return (
    // The provider loads Video.js's built-in translations for the selected language.
    <I18nProvider locale={params.locale}>
      <div ref={host} className="preview-player" style={styles as CSSProperties} data-sized={SIZED ? '' : undefined}>
        <Player media={playbackProps(params)} />
      </div>
    </I18nProvider>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Preview />
  </StrictMode>
);
