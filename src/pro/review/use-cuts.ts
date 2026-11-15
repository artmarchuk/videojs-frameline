import { useEffect, useState } from 'react';

import type { Marker } from '../store';
import { buildCutList, type Cut } from './logic';

function chapterStarts(video: HTMLVideoElement): number[] {
  const starts: number[] = [];
  for (const track of Array.from(video.textTracks)) {
    if (track.kind !== 'chapters' || !track.cues) continue;
    for (const cue of Array.from(track.cues)) starts.push(cue.startTime);
  }
  return starts;
}

/**
 * The cut list for previous/next cut: chapter starts when the media has a chapters track, otherwise the `markers`
 * prop. Chapter cues load after the video, so the list is rebuilt when tracks are added or finish loading.
 */
export function useCuts(video: HTMLVideoElement | null, markers: readonly Marker[], fps: number): Cut[] {
  const [cuts, setCuts] = useState<Cut[]>([]);

  useEffect(() => {
    if (!video) {
      setCuts(buildCutList([], markers, fps));
      return;
    }

    const update = () => {
      const next = buildCutList(chapterStarts(video), markers, fps);
      setCuts((current) =>
        current.length === next.length && current.every((cut, i) => cut.time === next[i]!.time && cut.marker === next[i]!.marker)
          ? current
          : next
      );
    };

    update();
    const tracks = video.textTracks;
    tracks.addEventListener('addtrack', update);
    tracks.addEventListener('removetrack', update);
    tracks.addEventListener('change', update);
    video.addEventListener('loadedmetadata', update);
    const elements = Array.from(video.querySelectorAll('track'));
    for (const element of elements) element.addEventListener('load', update);
    // Cues can arrive without any of the events above firing in some browsers; check again shortly after mount.
    const retry = window.setTimeout(update, 1500);

    return () => {
      tracks.removeEventListener('addtrack', update);
      tracks.removeEventListener('removetrack', update);
      tracks.removeEventListener('change', update);
      video.removeEventListener('loadedmetadata', update);
      for (const element of elements) element.removeEventListener('load', update);
      window.clearTimeout(retry);
    };
  }, [video, markers, fps]);

  return cuts;
}
