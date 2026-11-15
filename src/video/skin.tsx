/** @jsxImportSource react */

'use client';

import '../styles/tokens.css';
import '../styles/base.css';
import './skin.css';
import { Container as ContainerPrimitive, Poster as PosterPrimitive, Slider as SliderPrimitive } from '@videojs/react';
import { useEffect, useRef, type ReactNode } from 'react';

import { cn } from '@/lib/resolve-class-name';

import { FullscreenFocus } from './behaviors/fullscreen-focus';
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
 * Video.js PRO, Viewer tier: the clean player a creator's client or audience gets.
 *
 * Layers, bottom to top: media, poster, the overlay layer (empty here; the Studio tier draws guides in it),
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
  onBlur,
  onPointerDownCapture,
  ...props
}: VideoSkinProps = {}) {
  const dock = layout === 'dock';
  const container = useRef<HTMLDivElement>(null);
  const pressedInside = useRef(false);
  useEffect(() => {
    const onDown = (event: PointerEvent) => {
      pressedInside.current = container.current?.contains(event.target as Node) ?? false;
    };
    document.addEventListener('pointerdown', onDown, true);
    return () => document.removeEventListener('pointerdown', onDown, true);
  }, []);

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
      <FullscreenFocus />
      <StatusAnnouncer />
      <ShortcutsDialog />
    </>
  );

  return (
    <ContainerPrimitive
      className={cn('media-skin', 'media-container', 'media-video', 'pro-skin', className)}
      data-theme="pro"
      data-preset="video"
      data-tier="viewer"
      data-density="comfortable"
      data-layout={layout}
      // Out of the Tab order: the first Tab stop is the first control, which has its own focus ring. The container is
      // still focusable from code (a click on the picture focuses it so the hotkeys keep working) but a keyboard
      // user never lands on it, so it needs no ring of its own.
      tabIndex={-1}
      ref={container}
      // A press inside the player that ends with focus on the page body (the big play button takes it on press and
      // goes away when playback starts) puts focus on the container, so the hotkeys keep working after a click on the
      // picture. A press outside the player, or focus moving to another element, is left alone.
      onPointerDownCapture={(event) => {
        pressedInside.current = true;
        onPointerDownCapture?.(event);
      }}
      onBlur={(event) => {
        onBlur?.(event);
        if (event.relatedTarget || !pressedInside.current) return;
        const element = event.currentTarget;
        window.setTimeout(() => {
          const active = document.activeElement;
          if (!active || active === document.body) element.focus({ preventScroll: true });
        }, 0);
      }}
      {...props}
    >
      <ShortcutsProvider>{proBar ? <ProSlotsProvider renderThumbnail={renderThumbnail}>{body}</ProSlotsProvider> : body}</ShortcutsProvider>
    </ContainerPrimitive>
  );
}
