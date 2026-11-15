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
import { BufferingIndicator, Poster } from './shared/video-feedback';

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
  /** Pro tiers only: render the pro bar, whose slots lazily loaded pro controls are placed in. */
  proBar?: boolean;
  /**
   * `'overlay'`: the controls sit over the picture and hide while idle. `'dock'`: the picture has its own stage and
   * the controls are a panel below it that never hides; the aspect ratio then applies to the stage, and the skin's
   * height is the stage plus the dock.
   */
  layout?: 'overlay' | 'dock';
  /** Pro tiers only: `←` / `→` seek 5 s only while playing, leaving them free for frame stepping while paused. */
  arrowSeekWhilePlayingOnly?: boolean;
}

/**
 * Video.js PRO, Share tier: the clean player a creator's client or audience gets.
 *
 * Layers, bottom to top: media, poster, the overlay layer (empty here; the Review tier draws guides in it),
 * transient indicators, controls, dialogs. With `layout="dock"` the picture layers sit in a stage and the controls in
 * a dock below it; the `Container` holds both, so fullscreen keeps the dock.
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
  proBar = false,
  layout = 'overlay',
  arrowSeekWhilePlayingOnly = false,
  ...props
}: VideoSkinProps = {}) {
  const dock = layout === 'dock';

  // Everything that belongs to the picture. In the dock layout it lives in the stage, so nothing covers the dock.
  const picture = (
    <>
      {children}
      <Poster renderImage={renderPoster} />
      <div className={'pro-overlay'} aria-hidden="true">
        {overlay}
      </div>
      {extras}
      {dock && <BufferingIndicator />}
      <Indicators>
        <SeekIndicator />
      </Indicators>
    </>
  );

  const body = (
    <>
      {dock ? <div className={'pro-stage'}>{picture}</div> : picture}
      <ErrorDialog />
      <VideoControls renderThumbnail={renderThumbnail} toolbarStart={toolbarStart} toolbarEnd={toolbarEnd} pro={proBar} dock={dock} />

      <VideoHotkeys arrowSeekWhilePlayingOnly={arrowSeekWhilePlayingOnly} />
      <VideoGestures dock={dock} />
      <StatusAnnouncer />
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
      data-layout={layout}
      {...props}
    >
      <ShortcutsProvider>{proBar ? <ProSlotsProvider renderThumbnail={renderThumbnail}>{body}</ProSlotsProvider> : body}</ShortcutsProvider>
    </ContainerPrimitive>
  );
}
