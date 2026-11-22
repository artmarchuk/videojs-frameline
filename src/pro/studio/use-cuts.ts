import { useEffect, useMemo, useState } from 'react';

import type { FramelineMarker } from '../store';
import { buildCutList, type Cut } from './logic';

/** A chapter of the media: where it starts, and its title (may be empty). */
export interface Chapter {
  time: number;
  label: string;
}

function readChapters(video: HTMLVideoElement): Chapter[] {
  const chapters: Chapter[] = [];
  for (const track of Array.from(video.textTracks)) {
    if (track.kind !== 'chapters' || !track.cues) continue;
    for (const cue of Array.from(track.cues)) chapters.push({ time: cue.startTime, label: ((cue as VTTCue).text ?? '').trim() });
  }
  // A player can carry the same chapters twice (the stream's own track and one the host added): list each start once.
  const seen = new Set<number>();
  return chapters
    .sort((a, b) => a.time - b.time)
    .filter((chapter) => {
      const key = Math.round(chapter.time * 1000);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

const same = (a: readonly Chapter[], b: readonly Chapter[]) =>
  a.length === b.length && a.every((chapter, i) => chapter.time === b[i]!.time && chapter.label === b[i]!.label);

/**
 * The media's chapters, from its chapters text track. Chapter cues load after the video, so the list is rebuilt when
 * tracks are added or finish loading. The skin only reads them: it never creates or stores chapters.
 */
export function useChapters(video: HTMLVideoElement | null): readonly Chapter[] {
  const [chapters, setChapters] = useState<readonly Chapter[]>([]);

  useEffect(() => {
    if (!video) {
      setChapters((current) => (current.length ? [] : current));
      return;
    }

    const update = () => {
      const next = readChapters(video);
      setChapters((current) => (same(current, next) ? current : next));
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
  }, [video]);

  return chapters;
}

/** The cut list for previous/next cut: chapter starts when the media has chapters, otherwise the `markers` prop. */
export function useCuts(chapters: readonly Chapter[], markers: readonly FramelineMarker[], fps: number): Cut[] {
  return useMemo(
    () =>
      buildCutList(
        chapters.map((chapter) => chapter.time),
        markers,
        fps
      ),
    [chapters, markers, fps]
  );
}
