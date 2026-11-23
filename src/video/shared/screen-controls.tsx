/** @jsxImportSource react */

import { FullscreenButton as FullscreenButtonPrimitive, PiPButton as PiPButtonPrimitive } from '@videojs/react';

import { cn } from '../../lib/resolve-class-name';

import { FullscreenEnterIcon, FullscreenExitIcon, PipEnterIcon, PipExitIcon } from '../icons';
import { Button } from './button';
import { ButtonTooltip } from './tooltip';

/** Picture-in-picture. The component renders nothing where the browser does not support it. */
export function PiPButton() {
  return (
    <ButtonTooltip>
      <PiPButtonPrimitive render={<Button />} className={'media-pip-button'}>
        <PipEnterIcon className={cn('media-button-icon', 'media-pip-button-enter-icon')} />
        <PipExitIcon className={cn('media-button-icon', 'media-pip-button-exit-icon')} />
      </PiPButtonPrimitive>
    </ButtonTooltip>
  );
}

export function FullscreenButton() {
  return (
    <ButtonTooltip align="end">
      <FullscreenButtonPrimitive render={<Button />} className={'media-fullscreen-button'}>
        <FullscreenEnterIcon className={cn('media-button-icon', 'media-fullscreen-button-enter-icon')} />
        <FullscreenExitIcon className={cn('media-button-icon', 'media-fullscreen-button-exit-icon')} />
      </FullscreenButtonPrimitive>
    </ButtonTooltip>
  );
}
