/** @jsxImportSource react */

import { Time } from '@videojs/react';
import { formatTime } from '@videojs/utils/time';

/** Elapsed time. Mono, tabular numerals. */
export function CurrentTime() {
  return <Time.Value className={'media-time-value'} type="current" />;
}

/**
 * The toggle's accessible name starts with the value that is on screen, so the label matches the visible text
 * (WCAG 2.5.3, axe `label-content-name-mismatch`), then says what activating it does.
 */
function durationLabel(state: { type: 'current' | 'duration' | 'remaining'; seconds: number; disabled: boolean; unavailable: boolean }): string {
  if (state.disabled || state.unavailable) return 'Media not loaded, unknown time.';
  const value = formatTime(Math.abs(state.seconds), Math.abs(state.seconds));
  return state.type === 'remaining' ? `${value} remaining. Show duration.` : `${value} duration. Show remaining time.`;
}

/** Total time; activating it switches to remaining time and back. */
export function DurationTime() {
  return <Time.Value className={'media-time-value media-time-toggle'} type="duration" toggle label={durationLabel} />;
}

/** `0:42 / 3:20`, used when the seek bar is on its own row. */
export function TimeGroup() {
  return (
    <Time.Group className={'media-time-group'}>
      <CurrentTime />
      <Time.Separator className={'media-time-separator'} />
      <DurationTime />
    </Time.Group>
  );
}
