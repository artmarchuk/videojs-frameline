/** @jsxImportSource react */

'use client';

import '../styles/tokens.css';
import '../styles/base.css';
import './skin.css';
import { Container as ContainerPrimitive, Poster as PosterPrimitive, Slider as SliderPrimitive } from '@videojs/react';
import type { ReactNode } from 'react';

import { cn } from '@/lib/resolve-class-name';

import { VideoGestures } from './behaviors/gestures';
import { VideoHotkeys } from './behaviors/hotkeys';
import { VideoControls } from './controls';
import { ProSlotsProvider } from './pro-slots';
import { ErrorDialog } from './shared/error-dialog';
import { Indicators } from './shared/indicators';
import { SeekIndicator } from './shared/seek-indicator';
import { ShortcutsDialog, ShortcutsProvider } from './shared/shortcuts-dialog';
import { StatusAnnouncer } from './shared/status-announcer';
import { Poster } from './shared/video-feedback';

export interface VideoSkinProps extends Omit<ContainerPrimitive.Props, 'children'> {
  /** The media element, for example `<MuxVideo />`. */
  children?: ReactNode;
  renderPoster?: PosterPrimitive.ImageProps['render'];
  renderThumbnail?: SliderPrimitive.Thumbnail.ImageProps['render'];
  /** Host controls in the control bar, after play and volume. */
  toolbarStart?: ReactNode;
  /** Host controls in the control bar, before the captions button. */
  toolbarEnd?: ReactNode;
  /** Drawn in the overlay layer over the picture, which is `aria-hidden` and ignores the pointer. */
  overlay?: ReactNode;
  /** Extra layers inside the container, above the overlay layer. `ProSkin` mounts the pro runtime here. */
  extras?: ReactNode;
  /** Pro tiers only: render the control-bar slots that lazily loaded pro controls are placed in. */
  proSlots?: boolean;
  /** Pro tiers only: always put the seek bar on its own row. */
  stackedBar?: boolean;
  /** Pro tiers only: `←` / `→` seek 5 s only while playing, leaving them free for frame stepping while paused. */
  arrowSeekWhilePlayingOnly?: boolean;
}

/**
 * Video.js PRO, Share tier: the clean player a creator's client or audience gets.
 *
 * Layers, bottom to top: media, poster, the overlay layer (empty here; the Review tier draws guides in it),
 * transient indicators, controls, dialogs.
 */
export function VideoSkin({
  children,
  className,
  renderPoster,
  renderThumbnail,
  toolbarStart,
  toolbarEnd,
  overlay,
  extras,
  proSlots = false,
  stackedBar = false,
  arrowSeekWhilePlayingOnly = false,
  ...props
}: VideoSkinProps = {}) {
  const body = (
    <>
      {children}
      <Poster renderImage={renderPoster} />
      <div className={'pro-overlay'} aria-hidden="true">
        {overlay}
      </div>
      {extras}
      <ErrorDialog />
      <VideoControls
        renderThumbnail={renderThumbnail}
        toolbarStart={toolbarStart}
        toolbarEnd={toolbarEnd}
        forceStacked={stackedBar}
      />

      <VideoHotkeys arrowSeekWhilePlayingOnly={arrowSeekWhilePlayingOnly} />
      <VideoGestures />
      <StatusAnnouncer />
      <Indicators>
        <SeekIndicator />
      </Indicators>
      <ShortcutsDialog />
    </>
  );

  return (
    <ContainerPrimitive
      className={cn('media-skin', 'media-container', 'media-video', 'pro-skin', className)}
      data-theme="pro"
      data-preset="video"
      data-tier="share"
      data-density="comfortable"
      {...props}
    >
      <ShortcutsProvider>{proSlots ? <ProSlotsProvider>{body}</ProSlotsProvider> : body}</ShortcutsProvider>
    </ContainerPrimitive>
  );
}
