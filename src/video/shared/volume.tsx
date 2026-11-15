/** @jsxImportSource react */

import { MuteButton as MuteButtonPrimitive, VolumeSlider } from '@videojs/react';

import { cn } from '@/lib/resolve-class-name';

import { VolumeHighIcon, VolumeLowIcon, VolumeMutedIcon } from '../icons';
import { Button } from './button';
import { ButtonTooltip } from './tooltip';

/** Mute button, always; an inline volume slider on wide and medium players (CSS hides it when narrow). */
export function Volume() {
  return (
    <div className={'pro-volume'}>
      <ButtonTooltip>
        <MuteButtonPrimitive render={<Button />} className={'media-mute-button'}>
          <VolumeMutedIcon className={cn('media-button-icon', 'media-mute-button-muted-icon')} />
          <VolumeLowIcon className={cn('media-button-icon', 'media-mute-button-low-icon')} />
          <VolumeHighIcon className={cn('media-button-icon', 'media-mute-button-high-icon')} />
        </MuteButtonPrimitive>
      </ButtonTooltip>
      <VolumeSlider.Root className={'media-volume-slider'} orientation="horizontal">
        <VolumeSlider.Track className={'media-volume-slider-track'}>
          <VolumeSlider.Fill className={'media-volume-slider-fill'} />
        </VolumeSlider.Track>
        <VolumeSlider.Thumb className={'media-volume-slider-thumb'} />
      </VolumeSlider.Root>
    </div>
  );
}
