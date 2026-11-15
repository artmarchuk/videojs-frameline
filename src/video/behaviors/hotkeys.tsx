/** @jsxImportSource react */

import { Hotkey } from '@videojs/react';

export interface VideoHotkeysProps {
  disabled?: boolean | undefined;
}

/**
 * The YouTube keyboard map, kept in every tier. `I`, `O`, `,`, `.` and `Shift+←/→` are deliberately left free for the
 * Review tier. `Shift+?` (the help dialog) is registered by `ShortcutsDialog`.
 */
export function VideoHotkeys({ disabled = false }: VideoHotkeysProps = {}) {
  return (
    <>
      <Hotkey disabled={disabled} keys="Space" action="togglePaused" />
      <Hotkey disabled={disabled} keys="k" action="togglePaused" />
      <Hotkey disabled={disabled} keys="m" action="toggleMuted" />
      <Hotkey disabled={disabled} keys="f" action="toggleFullscreen" />
      <Hotkey disabled={disabled} keys="c" action="toggleSubtitles" />
      <Hotkey disabled={disabled} keys="ArrowRight" action="seekStep" value={5} />
      <Hotkey disabled={disabled} keys="ArrowLeft" action="seekStep" value={-5} />
      <Hotkey disabled={disabled} keys="l" action="seekStep" value={10} />
      <Hotkey disabled={disabled} keys="j" action="seekStep" value={-10} />
      <Hotkey disabled={disabled} keys="ArrowUp" action="volumeStep" />
      <Hotkey disabled={disabled} keys="ArrowDown" action="volumeStep" />
      <Hotkey disabled={disabled} keys="0-9" action="seekToPercent" />
      <Hotkey disabled={disabled} keys="Home" action="seekToPercent" value={0} />
      <Hotkey disabled={disabled} keys="End" action="seekToPercent" value={100} />
      <Hotkey disabled={disabled} keys=">" action="speedUp" />
      <Hotkey disabled={disabled} keys="<" action="speedDown" />
    </>
  );
}
