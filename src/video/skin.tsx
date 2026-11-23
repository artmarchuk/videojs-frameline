/** @jsxImportSource react */

'use client';

import '../styles/tokens.css';
import '../styles/base.css';
import './skin.css';
import { Container as ContainerPrimitive, Poster as PosterPrimitive, Slider as SliderPrimitive } from '@videojs/react';
import { useEffect, useRef, type ReactNode } from 'react';

import { cn } from '../lib/resolve-class-name';

import { FullscreenFocus } from './behaviors/fullscreen-focus';
import { VideoGestures } from './behaviors/gestures';
import { VideoHotkeys } from './behaviors/hotkeys';
import { VideoControls } from './controls';
import { ProFallbackProvider, ProNotice, type ProFallback } from './pro-fallback';
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
  /** Draws the poster image in place of the one the skin renders (the Video.js `Poster` image's `render` prop). */
  renderPoster?: PosterPrimitive.ImageProps['render'];
  /** Draws the storyboard frame in the seek preview in place of the one the skin renders. */
  renderThumbnail?: SliderPrimitive.Thumbnail.ImageProps['render'];
  /** Host controls in the control bar, after play and volume. */
  toolbarStart?: ReactNode;
  /** Host controls in the control bar, before the captions button. */
  toolbarEnd?: ReactNode;
  /** Drawn in the overlay layer over the picture, which is `aria-hidden` and ignores the pointer. */
  overlay?: ReactNode;
  /** Extra layers inside the container, above the overlay layer. `FramelineSkin` mounts the pro runtime here. */
  extras?: ReactNode;
  /** Pro tiers only: render the pro bar, whose slots lazily loaded pro controls are placed in. */
  proBar?: boolean;
  /**
   * Pro only (zoom): put the media, the poster and the overlay layer in one wrapper, which the Studio module scales
   * and moves. Without it nothing is added, so the Viewer tier's DOM is the same as before zoom existed.
   */
  pictureWrapper?: boolean;
  /**
   * `'overlay'`: the controls sit over the picture and hide while idle. `'dock'`: the picture has its own stage and
   * the controls are a panel below it that never hides; the aspect ratio then applies to the stage, and the skin's
   * height is the stage plus the dock.
   */
  layout?: 'overlay' | 'dock';
  /** Pro tiers only: `←` / `→` seek 5 s only while playing, leaving them free for frame stepping while paused. */
  arrowSeekWhilePlayingOnly?: boolean;
  /** Set while the pro code could not load: the message to announce, and the retry for the settings menu. */
  proFallback?: ProFallback | null;
}

/**
 * Frameline, Viewer tier: the clean player a creator's client or audience gets.
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
  pictureWrapper = false,
  layout = 'overlay',
  arrowSeekWhilePlayingOnly = false,
  proFallback = null,
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

  // The media element is not a Tab stop: Firefox makes a `<video>` focusable by keyboard (two stops, one of them
  // its own controls host), and nothing happens there that the bar does not offer. The player's hotkeys listen on the
  // container, so they work wherever focus is inside it. A `tabindex` the host set itself is left alone. The element
  // comes from the host and can be replaced, so the container is watched.
  useEffect(() => {
    const root = container.current;
    if (!root) return;
    const apply = () => {
      for (const media of root.querySelectorAll('video:not([tabindex]), audio:not([tabindex])')) media.setAttribute('tabindex', '-1');
    };
    apply();
    const observer = new MutationObserver(apply);
    observer.observe(root, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  // Everything that belongs to the picture. In the dock layout it lives in the stage, so nothing covers the dock.
  const image = (
    <>
      {children}
      <Poster renderImage={renderPoster} />
      <div className={'pro-overlay'} aria-hidden="true">
        {overlay}
      </div>
    </>
  );

  const picture = (
    <>
      {pictureWrapper ? <div className={'pro-picture'}>{image}</div> : image}
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
      <ProNotice />
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
      <ProFallbackProvider value={proFallback}>
        <ShortcutsProvider>{proBar ? <ProSlotsProvider renderThumbnail={renderThumbnail}>{body}</ProSlotsProvider> : body}</ShortcutsProvider>
      </ProFallbackProvider>
    </ContainerPrimitive>
  );
}
