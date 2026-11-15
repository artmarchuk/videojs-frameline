/** @jsxImportSource react */

import { Gesture } from '@videojs/react';

export interface VideoGesturesProps {
  disabled?: boolean | undefined;
}

/**
 * Mouse: a click on the video plays or pauses. Touch: a tap shows or hides the controls (the centre button plays),
 * and a double tap on the left or right third seeks 10 seconds; on the centre third it toggles fullscreen.
 */
export function VideoGestures({ disabled = false }: VideoGesturesProps = {}) {
  return (
    <>
      <Gesture disabled={disabled} type="tap" action="togglePaused" pointer="mouse" region="center" />
      <Gesture disabled={disabled} type="tap" action="toggleControls" pointer="touch" />
      <Gesture disabled={disabled} type="doubletap" action="seekStep" value={-10} region="left" />
      <Gesture disabled={disabled} type="doubletap" action="toggleFullscreen" region="center" />
      <Gesture disabled={disabled} type="doubletap" action="seekStep" value={10} region="right" />
    </>
  );
}
