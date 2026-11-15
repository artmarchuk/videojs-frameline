/** @jsxImportSource react */

import {
  StatusIndicator as StatusIndicatorPrimitive,
  VolumeIndicator as VolumeIndicatorPrimitive,
} from '@videojs/react';
import type { ReactNode } from 'react';

import { cn } from '@/lib/resolve-class-name';

import {
  CaptionsOffIcon,
  CaptionsOnIcon,
  FullscreenEnterIcon,
  FullscreenExitIcon,
  PipEnterIcon,
  PipExitIcon,
  VolumeHighIcon,
  VolumeLowIcon,
  VolumeMutedIcon,
} from '../icons';

const STATUS_ACTIONS = ['toggleSubtitles', 'toggleFullscreen', 'togglePictureInPicture'] as const;

/**
 * Transient feedback for keyboard and gesture actions. It never takes pointer input, and the whole group is hidden
 * from assistive technology: `StatusAnnouncer` already speaks these same events.
 */
export function Indicators({ children }: { children?: ReactNode } = {}) {
  return (
    <div aria-hidden="true" className={'media-indicator-group'}>
      <VolumeIndicator />
      <StatusIndicator />
      {children}
    </div>
  );
}

function StatusIndicator() {
  const icon = (name: string) => cn('media-indicator-icon', 'media-status-indicator-icon', `media-status-${name}-icon`);

  return (
    <StatusIndicatorPrimitive.Root actions={STATUS_ACTIONS} className={cn('media-indicator', 'media-status-indicator')}>
      <CaptionsOnIcon className={icon('captions-on')} />
      <CaptionsOffIcon className={icon('captions-off')} />
      <FullscreenEnterIcon className={icon('fullscreen')} />
      <FullscreenExitIcon className={icon('exit-fullscreen')} />
      <PipEnterIcon className={icon('pip')} />
      <PipExitIcon className={icon('exit-pip')} />
      <StatusIndicatorPrimitive.Value className={'media-indicator-label'} />
    </StatusIndicatorPrimitive.Root>
  );
}

function VolumeIndicator() {
  const icon = (name: string) => cn('media-indicator-icon', 'media-volume-indicator-icon', `media-volume-${name}-icon`);

  return (
    <VolumeIndicatorPrimitive.Root className={cn('media-indicator', 'media-volume-indicator')}>
      <VolumeIndicatorPrimitive.Fill className={'media-volume-indicator-fill'}>
        <VolumeHighIcon className={icon('high')} />
        <VolumeLowIcon className={icon('low')} />
        <VolumeMutedIcon className={icon('off')} />
        <VolumeIndicatorPrimitive.Value className={'media-indicator-value'} />
      </VolumeIndicatorPrimitive.Fill>
    </VolumeIndicatorPrimitive.Root>
  );
}
