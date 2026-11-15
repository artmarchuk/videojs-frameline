/** @jsxImportSource react */

import { Time } from '@videojs/react';

/** Elapsed time. Mono, tabular numerals. */
export function CurrentTime() {
  return <Time.Value className={'media-time-value'} type="current" />;
}

/** Total time; activating it switches to remaining time and back. */
export function DurationTime() {
  return <Time.Value className={'media-time-value media-time-toggle'} type="duration" toggle />;
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
