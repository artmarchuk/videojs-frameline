/** @jsxImportSource react */

import { CaptionsButton as CaptionsButtonPrimitive } from '@videojs/react';

import { cn } from '@/lib/resolve-class-name';

import { CaptionsOffIcon, CaptionsOnIcon } from '../icons';
import { Button } from './button';
import { ButtonTooltip } from './tooltip';

/** Captions on or off. With several tracks, the track is chosen in the settings menu. Hidden when there are none. */
export function CaptionsToggle() {
  return (
    <ButtonTooltip>
      <CaptionsButtonPrimitive render={<Button />} className={'media-captions-button'}>
        <CaptionsOffIcon className={cn('media-button-icon', 'media-captions-button-off-icon')} />
        <CaptionsOnIcon className={cn('media-button-icon', 'media-captions-button-on-icon')} />
      </CaptionsButtonPrimitive>
    </ButtonTooltip>
  );
}
