/** @jsxImportSource react */

import { Hotkey, selectPlayback, usePlayer } from '@videojs/react';

export interface VideoHotkeysProps {
  disabled?: boolean | undefined;
  /** Pro tiers: the arrow keys seek only while playing; while paused the Studio tier uses them to step frames. */
  arrowSeekWhilePlayingOnly?: boolean | undefined;
}

function ArrowSeek({ disabled = false }: { disabled?: boolean }) {
  return (
    <>
      <Hotkey disabled={disabled} keys="ArrowRight" action="seekStep" value={5} />
      <Hotkey disabled={disabled} keys="ArrowLeft" action="seekStep" value={-5} />
    </>
  );
}

function ArrowSeekWhilePlaying({ disabled = false }: { disabled?: boolean }) {
  const playback = usePlayer(selectPlayback);
  return <ArrowSeek disabled={disabled || Boolean(playback?.paused)} />;
}

/**
 * The YouTube keyboard map, kept in every tier. `I`, `O`, `,`, `.` and `Shift+←/→` are deliberately left free for the
 * Studio tier. `Shift+?` (the help dialog) is registered by `ShortcutsDialog`.
 */
export function VideoHotkeys({ disabled = false, arrowSeekWhilePlayingOnly = false }: VideoHotkeysProps = {}) {
  return (
    <>
      <Hotkey disabled={disabled} keys="Space" action="togglePaused" />
      <Hotkey disabled={disabled} keys="k" action="togglePaused" />
      <Hotkey disabled={disabled} keys="m" action="toggleMuted" />
      <Hotkey disabled={disabled} keys="f" action="toggleFullscreen" />
      <Hotkey disabled={disabled} keys="c" action="toggleSubtitles" />
      {arrowSeekWhilePlayingOnly ? <ArrowSeekWhilePlaying disabled={disabled} /> : <ArrowSeek disabled={disabled} />}
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
