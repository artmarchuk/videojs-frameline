/** @jsxImportSource react */

import { PlayButton as PlayButtonPrimitive } from '@videojs/react';

import { cn, resolveClassName } from '../../lib/resolve-class-name';

import { PauseIcon, PlayIcon, ReplayIcon } from '../icons';
import { Button } from './button';
import { ButtonTooltip } from './tooltip';

function PlayIcons() {
  return (
    <>
      <ReplayIcon className={cn('media-button-icon', 'media-play-button-replay-icon')} />
      <PlayIcon className={cn('media-button-icon', 'media-play-button-play-icon')} />
      <PauseIcon className={cn('media-button-icon', 'media-play-button-pause-icon')} />
    </>
  );
}

export function PlayButton({ className, ...props }: PlayButtonPrimitive.Props = {}) {
  return (
    <ButtonTooltip>
      <PlayButtonPrimitive
        render={<Button />}
        className={(state) => cn('media-play-button', resolveClassName(className, state))}
        {...props}
      >
        <PlayIcons />
      </PlayButtonPrimitive>
    </ButtonTooltip>
  );
}

/**
 * The large play button over the video: the start affordance before playback, and the tap-to-play target on touch.
 * It duplicates the control bar's play button, so it is kept out of the tab order and the accessibility tree.
 */
export function CenterPlayButton() {
  return (
    <PlayButtonPrimitive
      render={<Button tabIndex={-1} aria-hidden="true" />}
      className={cn('media-play-button', 'pro-center-play')}
    >
      <PlayIcons />
    </PlayButtonPrimitive>
  );
}
