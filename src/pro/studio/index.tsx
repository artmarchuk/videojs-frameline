/** @jsxImportSource react */

import './studio.css';
import { Menu, selectPlayback, selectQuality, useHotkey, useMedia, usePlayer } from '@videojs/react';
import { useCallback, useEffect, useId, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState, type ReactElement, type ReactNode, type Ref, type RefObject } from 'react';
import { createPortal } from 'react-dom';

import { cn } from '@/lib/resolve-class-name';

import { ChevronIcon, CloseIcon } from '../../video/icons';
import { useProSlot, useProThumbnailRenderer, useSetProSettingsItems } from '../../video/pro-slots';
import { Button } from '../../video/shared/button';
import { useShortcutsDialog, type ShortcutRow } from '../../video/shared/shortcuts-dialog';
import { ButtonTooltip } from '../../video/shared/tooltip';
import type { FramelineApi } from '../api';
import { useProStore, useProStoreApi } from '../context';
import type { FeatureFlags } from '../features';
import type { Marker } from '../store';
import { formatTimecode, framesFromSeconds, secondsFromFrames } from '../timecode';
import { AnnouncerProvider, useAnnounce } from './announcer';
import { useStudioController, type CopyLinkInfo, type FrameGrabInfo, type StudioController } from './controller';
import { GrabFrameIcon, LinkCopiedIcon, LinkIcon, LoopIcon, MarkerIcon, NextCutIcon, PreviousCutIcon, StepBackIcon, StepForwardIcon } from './icons';
import { isNarrowDock, narrowDockRows } from './logic';
import { studioStrings as t } from './strings';
import { Timeline, type TimelineProps } from './timeline';
import { snapFrame, validMarkers } from './timeline/logic';
import { allowedView, hasViewMenu } from '../view';
import { Guides } from './guides';
import { usePictureRect } from './guides/use-picture-rect';
import { useChapters, useCuts, type Chapter } from './use-cuts';
import { useGuidesActions, GuidesMenu, type GuidesActions } from './guides-menu';
import { useZoom, useZoomActions, ZoomMenu, type ZoomActions, type ZoomController } from './zoom';

export interface StudioLayerProps {
  features: Readonly<FeatureFlags>;
  fps: number;
  startFrames: number;
  dropFrame: boolean;
  markers: readonly Marker[];
  video: HTMLVideoElement | null;
  /** An element inside the player, used to find and measure the player container. */
  anchor: RefObject<HTMLElement | null>;
  onCopyLink?: ((info: CopyLinkInfo) => void) | undefined;
  onFrameGrab?: ((info: FrameGrabInfo) => void) | undefined;
  /** The host's handle on the Studio tools. */
  apiRef?: Ref<FramelineApi> | undefined;
}

/**
 * The Studio tier: the compact ruler timeline with the range handles, frame-by-frame transport, the timecode with
 * its link button, and the Markers, Capture, Guides and Zoom menus. Loaded lazily, only when a Studio feature is on. The controls are portalled
 * into the control bar's slots, so they sit in the bar's layout and focus order.
 */
export default function StudioLayer(props: StudioLayerProps) {
  return (
    <AnnouncerProvider>
      <Studio {...props} />
    </AnnouncerProvider>
  );
}

/**
 * The dock's arrangement: `wide`, or one of the two narrow ones (a narrow player, or a touch device): `keys`, with
 * the instrument on row one, and `compact` under 500 px, where Loop and the link button are cells of row two. CSS
 * container queries do the rest of the responsive work; this exists because the arrangements move controls, and
 * the DOM order has to change with them so the focus order matches what is on screen. Also written to the
 * container as `data-dock-size` (`wide` or `narrow`) and `data-dock-rows` (`keys` or `compact`, narrow only) for
 * the styles; the attributes are removed with this module.
 */
type DockArrangement = 'wide' | 'keys' | 'compact';

function useDockArrangement(anchor: RefObject<HTMLElement | null>): DockArrangement {
  const [arrangement, setArrangement] = useState<DockArrangement>('wide');

  useLayoutEffect(() => {
    const container = anchor.current?.closest<HTMLElement>('.media-container') ?? null;
    if (!container) return;
    const coarse = typeof matchMedia === 'function' ? matchMedia('(pointer: coarse)') : null;
    const update = () => {
      const width = container.getBoundingClientRect().width;
      const narrow = isNarrowDock(width, coarse?.matches ?? false);
      const next = narrow ? narrowDockRows(width) : 'wide';
      container.dataset.dockSize = narrow ? 'narrow' : 'wide';
      if (narrow) container.dataset.dockRows = next;
      else delete container.dataset.dockRows;
      setArrangement(next);
    };
    update();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update);
    observer?.observe(container);
    coarse?.addEventListener?.('change', update);
    return () => {
      observer?.disconnect();
      coarse?.removeEventListener?.('change', update);
      delete container.dataset.dockSize;
      delete container.dataset.dockRows;
    };
  }, [anchor]);

  return arrangement;
}

/**
 * A selected marker stays selected (its pin in the accent) until the playhead moves away from it. Frame changes
 * during the seek that goes to the marker are ignored, so the selection is not dropped before the playhead arrives.
 */
function useMarkerDeselect(video: HTMLVideoElement | null, fps: number) {
  const store = useProStoreApi();
  useEffect(() => {
    if (!video) return;
    let lastFrame = store.getState().frame;
    return store.subscribe(() => {
      const { frame, selectedMarker, duration } = store.getState();
      if (frame === lastFrame) return;
      lastFrame = frame;
      if (!selectedMarker || video.seeking) return;
      if (frame !== snapFrame(selectedMarker.time, duration, fps)) store.deselectMarker();
    });
  }, [store, video, fps]);
}

/** How long the link button shows its check after a copy. */
const LINK_COPIED_MS = 1200;

/**
 * Copy link at timecode, shared by the link button, `S` and the settings item of the smallest dock. `copied` is true
 * for a moment after the clipboard took the link; a refused clipboard leaves it false. While the link button is on
 * screen its check is the visible confirmation; where the button is folded away, the message shows as a toast.
 */
function useCopyLink(controller: StudioController, anchor: RefObject<HTMLElement | null>): { copied: boolean; copy: () => void } {
  const [copied, setCopied] = useState(false);
  const timer = useRef(0);
  const copy = useCallback(() => {
    const button = anchor.current?.closest('.media-container')?.querySelector('.pro-tool-link');
    const shown = Boolean(button && button.getClientRects().length > 0);
    void controller.copyLink({ quiet: shown }).then((ok) => {
      if (!ok) return;
      setCopied(true);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setCopied(false), LINK_COPIED_MS);
    });
  }, [controller, anchor]);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  return { copied, copy };
}

function Studio({ features, fps, startFrames, dropFrame, markers, video, anchor, onCopyLink, onFrameGrab, apiRef }: StudioLayerProps) {
  const announce = useAnnounce();
  const chapters = useChapters(video);
  const cuts = useCuts(chapters, features.shotNav ? markers : NO_MARKERS, fps);
  const controller = useStudioController({ video, fps, startFrames, dropFrame, cuts, announce, onCopyLink, onFrameGrab });
  const paused = usePlayer(selectPlayback)?.paused ?? true;
  const arrangement = useDockArrangement(anchor);
  const narrow = arrangement !== 'wide';
  // Loop and the link button are cells of row two only on the compact dock; elsewhere they are keys of row one.
  const compact = arrangement === 'compact';
  useMarkerDeselect(video, fps);

  // Guides: what the host allows, where the picture is, and the actions the menu and `Shift+V` share.
  const allowed = useMemo(() => allowedView(features), [features]);
  const guides = hasViewMenu(allowed);
  const picture = usePictureRect(video, anchor);
  const guidesActions = useGuidesActions();

  // Zoom: the picture wrapper is scaled and moved; the guides are inside it and follow.
  const renditionNote = useRenditionNote();
  const zoom = useZoom(video, picture.rect, picture.layer, allowed.zoom, usePlayer(selectQuality)?.videoRenditionList ?? null);
  const zoomActions = useZoomActions(renditionNote);
  const zoomed = useProStore((state) => state.zoom !== 'fit');
  useLiftRenditionCap(allowed.zoom && zoomed);

  // The host's handle. Each call follows the flags; the store ignores guides and zoom that are not allowed.
  const store = useProStoreApi();
  useImperativeHandle(
    apiRef,
    (): FramelineApi => ({
      seek: (time) => controller.seekToTime(time),
      step: (frames) => {
        if (features.frameStep && Number.isFinite(frames) && frames !== 0) controller.step(Math.trunc(frames));
      },
      setRange: (next) => {
        if (features.inOut) store.setRange(next.in, next.out);
      },
      setLoop: (on) => {
        if (features.loop) store.setLoop(on);
      },
      setGuides: (next) => store.setGuides(next),
      setZoom: (level) => store.setZoom(level),
      pan: (direction) => zoom.pan(direction),
      grabFrame: () => {
        if (features.grabFrame) controller.grabFrame();
      },
    }),
    [controller, store, zoom, features]
  );

  const timeline = useProSlot('timeline');
  const renderThumbnail = useProThumbnailRenderer<TimelineProps['renderThumbnail']>();
  const shownMarkers = features.markers ? markers : NO_MARKERS;
  const listed = useMemo(() => validMarkers(shownMarkers), [shownMarkers]);
  const listedChapters = features.markers ? chapters : NO_CHAPTERS;
  const time = useProSlot('time');
  const transportStart = useProSlot('transport-start');
  const transportEnd = useProSlot('transport-end');
  const rangeSlot = useProSlot('range');
  const tools = useProSlot('tools');

  const hasCuts = cuts.length > 0;
  const link = useCopyLink(controller, anchor);
  const copyLink = link.copy;
  const linkButton = features.copyTimecodeLink && <LinkButton copied={link.copied} onCopy={copyLink} />;

  // Under 340px the narrow row has no cell for the link button: the action is an item of the settings menu there
  // (shown by the styles at that width only). It is rendered inside the settings menu's own tree.
  const setSettingsItems = useSetProSettingsItems();
  useEffect(() => {
    if (!compact || !features.copyTimecodeLink) return;
    setSettingsItems(
      <Menu.Item className={'media-menu-item pro-menu-item-dock-narrow pro-menu-item-link'} onSelect={copyLink}>
        <span className={'media-menu-icon pro-tool-icon'}>
          <LinkIcon />
        </span>
        <span>{t.copyLink}</span>
        <span className={'media-menu-hint'}>
          <kbd className={'pro-kbd'}>S</kbd>
        </span>
      </Menu.Item>
    );
    return () => setSettingsItems(null);
  }, [compact, features.copyTimecodeLink, copyLink, setSettingsItems]);

  // Named, so the narrow dock's styles can fold the two cut buttons away under 324px.
  const previousCut = features.shotNav && (
    <ToolButton name="previous-cut" label={t.previousCut} shortcut="[" icon={<PreviousCutIcon />} disabled={!hasCuts} disabledReason={t.noCuts} onClick={() => controller.goToCut('previous')} />
  );
  const nextCut = features.shotNav && (
    <ToolButton name="next-cut" label={t.nextCut} shortcut="]" icon={<NextCutIcon />} disabled={!hasCuts} disabledReason={t.noCuts} onClick={() => controller.goToCut('next')} />
  );
  const stepBack = features.frameStep && <ToolButton label={t.stepBack} shortcut="," icon={<StepBackIcon />} onClick={() => controller.step(-1)} />;
  const stepForward = features.frameStep && <ToolButton label={t.stepForward} shortcut="." icon={<StepForwardIcon />} onClick={() => controller.step(1)} />;

  return (
    <>
      <StudioHotkeys controller={controller} features={features} paused={paused} guidesActions={guides ? guidesActions : null} copyLink={copyLink} />
      {allowed.zoom && <ZoomHotkeys zoom={zoom} actions={zoomActions} />}
      <HelpRows features={features} guides={guides} zoom={allowed.zoom} />
      {guides && <Guides rect={picture.rect} layer={picture.layer} />}

      {timeline &&
        createPortal(
          <Timeline controller={controller} fps={fps} markers={shownMarkers} range={features.inOut} video={video} renderThumbnail={renderThumbnail} />,
          timeline
        )}

      {/* The link button is joined to the timecode field, because it copies what the field shows (not when compact). */}
      {time && features.timecode && createPortal(<TimecodeField controller={controller} fps={fps} dropFrame={dropFrame} link={compact ? null : linkButton} />, time)}
      {time && !features.timecode && !compact && linkButton && createPortal(linkButton, time)}

      {/*
        Cut and step either side of Play, on every dock: previous cut, step back, Play, step forward, next cut. The
        narrow dock compacts the buttons instead of reordering them (and folds the cut pair away under 324px).
      */}
      {transportStart &&
        createPortal(
          <Segmented name="back">
            {previousCut}
            {stepBack}
          </Segmented>,
          transportStart
        )}
      {transportEnd &&
        createPortal(
          <Segmented name="forward">
            {stepForward}
            {nextCut}
          </Segmented>,
          transportEnd
        )}

      {/* Wide: Loop and Reset range after the transport. Narrow from 500px: Loop alone, at the end of row one. */}
      {!narrow && rangeSlot && (features.inOut || features.loop) && createPortal(<RangeControls controller={controller} features={features} />, rangeSlot)}
      {arrangement === 'keys' && rangeSlot && features.loop && createPortal(<LoopButton controller={controller} />, rangeSlot)}

      {/*
        Wide: Markers, Capture, Guides, Zoom. Narrow and touch, the same four as one row of equal cells with the
        playback buttons that follow (Settings, Fullscreen); under 500px Loop and Link are cells of that row too:
        Markers, Loop, Capture, Link, Guides, Zoom. The range is set with the handles there; `I` and `O` still
        work from a keyboard.
      */}
      {tools &&
        createPortal(
          <>
            {(listed.length > 0 || listedChapters.length > 0) && <MarkersMenu markers={listed} chapters={listedChapters} controller={controller} fps={fps} />}
            {compact && features.loop && <LoopButton controller={controller} />}
            {features.grabFrame && <CaptureMenu controller={controller} />}
            {compact && linkButton}
            {guides && <GuidesMenu allowed={allowed} actions={guidesActions} />}
            {allowed.zoom && <ZoomMenu actions={zoomActions} note={renditionNote} />}
          </>,
          tools
        )}
    </>
  );
}

const NO_MARKERS: readonly Marker[] = [];

/**
 * "showing 540p" while the rendition that is playing is smaller than the best one the stream offers, otherwise
 * `null`. Adaptive streams pick a rendition for the connection and the player's size, so a 100% view is not always a
 * view of the source. From Video.js's quality feature: `activeVideoRendition` is the rendition the engine reports as
 * playing (also under automatic selection) and `videoRenditionList` what the manifest offers.
 */
function useRenditionNote(): string | null {
  const quality = usePlayer(selectQuality);
  const playing = quality?.activeVideoRendition?.height;
  if (!playing || !quality) return null;
  const best = Math.max(0, ...quality.videoRenditionList.map((rendition) => rendition.height ?? 0));
  return playing < best ? t.showing(playing) : null;
}
const NO_CHAPTERS: readonly Chapter[] = [];

/** A segmented control: buttons that share one fill. Renders nothing when it has no buttons. */
function Segmented({ name, children }: { name: string; children: ReactNode }) {
  return (
    <div className={'pro-seg'} data-pro-seg={name}>
      {children}
    </div>
  );
}

/** A dock button with an accessible name and a tooltip that shows its shortcut, or why it is disabled. */
function ToolButton({
  label,
  shortcut,
  icon,
  onClick,
  pressed,
  disabled = false,
  disabledReason,
  className,
  name,
}: {
  label: string;
  shortcut?: string;
  icon: ReactElement;
  onClick?: () => void;
  pressed?: boolean;
  disabled?: boolean;
  disabledReason?: string;
  className?: string;
  name?: string;
}) {
  const tip = (
    <>
      <span>{disabled && disabledReason ? disabledReason : label}</span>
      {shortcut && !disabled && <kbd className={'pro-kbd'}>{shortcut}</kbd>}
    </>
  );

  return (
    <ButtonTooltip label={tip}>
      <Button
        type="button"
        className={cn('pro-tool', className)}
        aria-label={disabled && disabledReason ? `${label}. ${disabledReason}` : label}
        aria-keyshortcuts={shortcut}
        aria-pressed={pressed}
        aria-disabled={disabled || undefined}
        data-pressed={pressed ? '' : undefined}
        data-pro-tool={name}
        onClick={disabled ? undefined : onClick}
      >
        <span className={'media-button-icon pro-tool-icon'}>{icon}</span>
      </Button>
    </ButtonTooltip>
  );
}

/**
 * The timecode: the full timecode of the current frame in a recessed field, and the duration in dim text beside it.
 * Pressing the field switches between timecode and seconds. It re-renders when the frame number changes and at no
 * other time. It is not a live region: the value is read on focus, and steps and seeks are announced separately.
 * With `link`, the field and the link button are one segmented pair: `[ 00:00:14:20 | link ]`.
 */
function TimecodeField({ controller, fps, dropFrame, link }: { controller: StudioController; fps: number; dropFrame: boolean; link: ReactNode }) {
  const store = useProStoreApi();
  const frame = useProStore((state) => state.frame);
  const display = useProStore((state) => state.timeDisplay);
  const duration = useProStore((state) => state.duration);
  const approximate = useProStore((state) => state.clockPrecision === 'approximate');
  const valueId = useId();
  const labelId = useId();
  const seconds = display === 'seconds';

  const current = seconds ? secondsFromFrames(frame, fps).toFixed(3) : controller.timecode(frame);
  // The total is a length, so the start-timecode offset does not apply to it.
  const total = seconds ? `${duration.toFixed(3)} s` : formatTimecode(framesFromSeconds(duration, fps), fps, { dropFrame });

  const tip = (
    <span>
      {seconds ? t.switchToTimecode : t.switchToSeconds}
      {approximate ? `. ≈ ${t.approximateClock}` : ''}
    </span>
  );

  return (
    <>
      <div className={'pro-timecode-pair'} data-link={link ? '' : undefined}>
        <ButtonTooltip label={tip} align="start">
          {/* The name is the visible value plus the toggle's purpose, so the label matches what is shown (WCAG 2.5.3). */}
          <button type="button" className={'pro-timecode'} aria-labelledby={`${valueId} ${labelId}`} aria-pressed={seconds} onClick={() => store.toggleTimeDisplay()}>
            <span id={valueId} className={'pro-timecode-values'} data-pro-timecode>
              {approximate && <span className={'pro-timecode-approx'}>≈</span>}
              {current}
              <span className={'pro-visually-hidden'}> {t.of(total)}</span>
            </span>
            <span id={labelId} className={'pro-visually-hidden'}>
              {t.timeInSeconds}
            </span>
          </button>
        </ButtonTooltip>
        {link}
      </div>
      {duration > 0 && (
        <span className={'pro-timecode-total'} aria-hidden="true">
          {t.of(total)}
        </span>
      )}
    </>
  );
}

/**
 * The link button: copies a link to the frame the timecode field shows. After a copy its icon is a check for a
 * moment and its tooltip says so; the announcement (with the timecode) comes from the controller.
 */
function LinkButton({ copied, onCopy }: { copied: boolean; onCopy: () => void }) {
  const tip = copied ? (
    <span>{t.linkCopied}</span>
  ) : (
    <>
      <span>{t.copyLink}</span>
      <kbd className={'pro-kbd'}>S</kbd>
    </>
  );
  return (
    <ButtonTooltip label={tip}>
      <Button type="button" className={'pro-tool pro-tool-link'} aria-label={t.copyLink} aria-keyshortcuts="S" data-copied={copied ? '' : undefined} data-pro-tool="link" onClick={onCopy}>
        <span className={'media-button-icon pro-tool-icon pro-link-icon'}>
          <LinkIcon />
        </span>
        <span className={'media-button-icon pro-tool-icon pro-link-check'}>
          <LinkCopiedIcon />
        </span>
      </Button>
    </ButtonTooltip>
  );
}

/** Loop: the range when one is set, otherwise the whole video. */
function LoopButton({ controller }: { controller: StudioController }) {
  const looping = useProStore((state) => state.loopMode !== 'off');
  return <ToolButton name="loop" label={t.loop} shortcut="R" icon={<LoopIcon />} pressed={looping} onClick={controller.toggleLoop} />;
}

/** Wide dock: the Loop toggle and, only while a range is set, a small Reset range button. */
function RangeControls({ controller, features }: { controller: StudioController; features: Readonly<FeatureFlags> }) {
  const hasRange = useProStore((state) => state.inPoint !== null || state.outPoint !== null);

  const reset = (event: { currentTarget: HTMLElement }) => {
    // The button goes away with the range: hand focus to its neighbour, not to the page.
    const next = event.currentTarget.closest('.pro-range')?.querySelector<HTMLElement>('[data-pro-tool="loop"]');
    controller.clearRange();
    next?.focus();
  };

  return (
    <div className={'pro-range'} role="group" aria-label={t.range}>
      {features.loop && <LoopButton controller={controller} />}
      {features.inOut && hasRange && (
        <ButtonTooltip label={<span>{t.resetRange}</span>}>
          <Button type="button" className={'pro-tool pro-tool-reset'} aria-label={t.resetRange} onClick={reset}>
            <span className={'media-button-icon pro-tool-icon'}>
              <CloseIcon />
            </span>
          </Button>
        </ButtonTooltip>
      )}
    </div>
  );
}

/**
 * A menu button of the main row: an icon, an optional count badge, and a chevron. The menu opens upward, over the
 * bottom edge of the picture. It is a Video.js `Menu`: arrow keys, Enter, Escape, and focus returns to the button.
 */
function ToolMenu({
  name,
  label,
  tooltip,
  icon,
  badge,
  word,
  popupClassName,
  children,
}: {
  name: string;
  /** The accessible name. */
  label: string;
  tooltip?: string;
  icon: ReactElement;
  badge?: number | undefined;
  /** The word shown beside the icon on very wide players. */
  word?: string;
  popupClassName?: string;
  children: ReactNode;
}) {
  return (
    <Menu.Root side="top" align="end">
      <ButtonTooltip label={<span>{tooltip ?? label}</span>}>
        <Menu.Trigger render={<Button />} className={'pro-tool pro-tool-menu'} aria-label={label} data-pro-menu={name}>
          <span className={'media-button-icon pro-tool-icon'}>{icon}</span>
          {word && <span className={'pro-tool-word'}>{word}</span>}
          {badge !== undefined && badge > 0 && <span className={'pro-badge'}>{badge}</span>}
          <ChevronIcon className={'pro-chevron-down'} />
        </Menu.Trigger>
      </ButtonTooltip>
      <Menu.Popup keepMounted className={cn('media-popup', 'media-menu-popup', 'pro-menu-popup', popupClassName)}>
        <Menu.Content className={'media-menu-content'}>{children}</Menu.Content>
      </Menu.Popup>
    </Menu.Root>
  );
}

interface MarkerListProps {
  markers: readonly Marker[];
  chapters: readonly Chapter[];
  controller: StudioController;
  fps: number;
}

/** The markers, then the media's chapters under a second heading. Activating one seeks to it. */
function MarkerItems({ markers, chapters, controller, fps }: MarkerListProps) {
  const code = (time: number) => controller.timecode(framesFromSeconds(time, fps));
  return (
    <>
      {markers.length > 0 && (
        <Menu.Group className={'pro-menu-group'}>
          <Menu.GroupLabel className={'pro-menu-label'}>{t.markers}</Menu.GroupLabel>
          {markers.map((marker, index) => (
            <Menu.Item key={marker.id ?? `${index}:${marker.time}`} className={'media-menu-item pro-marker-item'} onSelect={() => controller.goToMarker(marker)}>
              <span className={'pro-marker-item-label'}>{marker.label}</span>
              <span className={'media-menu-hint'}>
                <span className={'media-menu-hint-label'}>{code(marker.time)}</span>
              </span>
            </Menu.Item>
          ))}
        </Menu.Group>
      )}
      {chapters.length > 0 && (
        <Menu.Group className={'pro-menu-group'}>
          <Menu.GroupLabel className={'pro-menu-label'}>{t.chapters}</Menu.GroupLabel>
          {chapters.map((chapter, index) => (
            <Menu.Item key={`${index}:${chapter.time}`} className={'media-menu-item pro-marker-item'} onSelect={() => controller.goToTime(chapter.time)}>
              <span className={'pro-marker-item-label'}>{chapter.label || t.untitledChapter(index + 1)}</span>
              <span className={'media-menu-hint'}>
                <span className={'media-menu-hint-label'}>{code(chapter.time)}</span>
              </span>
            </Menu.Item>
          ))}
        </Menu.Group>
      )}
    </>
  );
}

/** The Markers menu: every marker the host passed, and the media's chapters. The skin only lists and navigates them. */
function MarkersMenu(props: MarkerListProps) {
  const count = props.markers.length;
  return (
    <ToolMenu name="markers" label={count > 0 ? t.markersCount(count) : t.chapters} tooltip={count > 0 ? t.markers : t.chapters} icon={<MarkerIcon />} badge={count}>
      <MarkerItems {...props} />
    </ToolMenu>
  );
}

function MenuAction({ label, shortcut, hint, disabled = false, onSelect }: { label: string; shortcut?: string; hint?: string; disabled?: boolean; onSelect: () => void }) {
  return (
    <Menu.Item className={'media-menu-item'} disabled={disabled} aria-label={disabled && hint ? `${label}. ${hint}` : undefined} onSelect={onSelect}>
      <span>{label}</span>
      {shortcut && !hint && (
        <span className={'media-menu-hint'}>
          <kbd className={'pro-kbd'}>{shortcut}</kbd>
        </span>
      )}
      {hint && <span className={'media-menu-hint'}>{hint}</span>}
    </Menu.Item>
  );
}

/** The Capture menu: the image actions. Save the frame as a file, or copy it. */
function CaptureMenu({ controller }: { controller: StudioController }) {
  // Firefox before 127 has no `ClipboardItem`: the item stays, disabled, and says so instead of failing on activation.
  const canCopyImage = typeof ClipboardItem !== 'undefined' && typeof navigator.clipboard?.write === 'function';
  return (
    <ToolMenu name="capture" label={t.capture} icon={<GrabFrameIcon />} word={t.capture}>
      <MenuAction label={t.grab} shortcut="G" onSelect={controller.grabFrame} />
      <MenuAction label={t.copyImage} shortcut="Shift+G" disabled={!canCopyImage} hint={canCopyImage ? undefined : t.copyImageHint} onSelect={controller.copyFrameImage} />
    </ToolMenu>
  );
}

/**
 * Studio shortcuts. Each is registered only while its feature is on. None changes what a Viewer key does during
 * playback: `←` and `→` step frames only while paused, and seek 5 seconds (the Viewer map) while playing.
 * Patterns match modifiers exactly, so Ctrl, Cmd and Alt combinations stay with the browser.
 */
function StudioHotkeys({
  controller,
  features,
  paused,
  guidesActions,
  copyLink,
}: {
  controller: StudioController;
  features: Readonly<FeatureFlags>;
  paused: boolean;
  guidesActions: GuidesActions | null;
  copyLink: () => void;
}) {
  const noStep = !features.frameStep;
  const noInOut = !features.inOut;
  const noCuts = !features.shotNav;

  useHotkey({ keys: ',', action: 'frameStep', disabled: noStep, onActivate: () => controller.step(-1) });
  useHotkey({ keys: '.', action: 'frameStep', disabled: noStep, onActivate: () => controller.step(1) });
  useHotkey({ keys: 'ArrowLeft', action: 'frameStep', disabled: noStep || !paused, onActivate: () => controller.step(-1) });
  useHotkey({ keys: 'ArrowRight', action: 'frameStep', disabled: noStep || !paused, onActivate: () => controller.step(1) });
  useHotkey({ keys: 'Shift+ArrowLeft', action: 'frameJump', disabled: noStep, onActivate: () => controller.jump(-1) });
  useHotkey({ keys: 'Shift+ArrowRight', action: 'frameJump', disabled: noStep, onActivate: () => controller.jump(1) });
  useHotkey({ keys: 'i', action: 'setIn', repeatable: false, disabled: noInOut, onActivate: controller.setIn });
  useHotkey({ keys: 'o', action: 'setOut', repeatable: false, disabled: noInOut, onActivate: controller.setOut });
  useHotkey({ keys: 'Shift+i', action: 'clearIn', repeatable: false, disabled: noInOut, onActivate: controller.clearIn });
  useHotkey({ keys: 'Shift+o', action: 'clearOut', repeatable: false, disabled: noInOut, onActivate: controller.clearOut });
  useHotkey({ keys: 'r', action: 'toggleLoop', repeatable: false, disabled: !features.loop, onActivate: controller.toggleLoop });
  useHotkey({ keys: '[', action: 'previousCut', repeatable: false, disabled: noCuts, onActivate: () => controller.goToCut('previous') });
  useHotkey({ keys: ']', action: 'nextCut', repeatable: false, disabled: noCuts, onActivate: () => controller.goToCut('next') });
  // The G family: `G` saves the frame, `Shift+G` copies it. `S` ("share") copies the link at the timecode.
  useHotkey({ keys: 'g', action: 'grabFrame', repeatable: false, disabled: !features.grabFrame, onActivate: controller.grabFrame });
  useHotkey({ keys: 'Shift+g', action: 'copyFrameImage', repeatable: false, disabled: !features.grabFrame, onActivate: controller.copyFrameImage });
  useHotkey({ keys: 's', action: 'copyLink', repeatable: false, disabled: !features.copyTimecodeLink, onActivate: copyLink });
  // Shift alone with V; the hotkey layer ignores keys typed into text fields and matches modifiers exactly.
  useHotkey({ keys: 'Shift+v', action: 'toggleGuides', repeatable: false, disabled: !guidesActions, onActivate: () => guidesActions?.toggleHidden() });

  return null;
}

/**
 * While zoomed with Quality on Auto, lets the engine pick a rendition by bandwidth alone. By default the HLS engine
 * holds automatic selection to the smallest rendition that covers the player (`capRenditionToPlayerSize`, on by
 * default), so a zoomed picture would be upscaled from a rendition chosen for the unzoomed size. The cap is a field
 * of the media's `source`; assigning a source with the same `src` and engine options applies it to the running
 * engine without a reload (installed `@videojs/hlsjs-video` `adapter.js`: `set source` calls `#applyRenditionCaps`,
 * and only a new `src` or new engine options request a load).
 *
 * Nothing is forced: no rendition is selected, and a quality the user picked by hand is left alone (the cap only
 * bounds automatic selection, and it is not touched while a rendition is selected). At Fit the host's own value is
 * put back, unless the source was replaced in the meantime. Media without a `source` and renditions (a plain
 * `<video>`, native HLS) are left alone.
 */
function useLiftRenditionCap(lift: boolean) {
  const media = useMedia();
  const quality = usePlayer(selectQuality);
  const auto = quality ? quality.videoRenditionList.length > 0 && quality.videoRenditionList.every((rendition) => !rendition.selected) : false;
  const active = lift && auto;

  useEffect(() => {
    if (!active || !media) return;
    const target = media as unknown as { source?: Record<string, unknown> | null; videoRenditions?: unknown };
    if (!('source' in target) || !('videoRenditions' in target)) return;
    const before = target.source;
    // No structured source to edit, or the host switched the cap off itself: nothing to do, nothing to restore.
    if (!before || before.capRenditionToPlayerSize === false) return;

    const lifted = { ...before, capRenditionToPlayerSize: false };
    target.source = lifted;

    return () => {
      // Only undo our own change: if the host gave the media another source meanwhile, that one stands.
      if (target.source !== lifted) return;
      target.source = before;
    };
  }, [active, media]);
}

/**
 * Zoom shortcuts. `Z` and `Shift+Z` are free in the YouTube map and in ours. `Shift+Alt` + an arrow pans; patterns
 * match modifiers exactly, so the plain arrows (seek, frame step, volume), `Shift` + arrows (jump) and `Alt` + arrows
 * (the browser's Back and Forward on Windows and Linux) are not touched. Pan is registered only while zoomed.
 */
function ZoomHotkeys({ zoom, actions }: { zoom: ZoomController; actions: ZoomActions }) {
  const fit = useProStore((state) => state.zoom === 'fit');
  useHotkey({ keys: 'z', action: 'zoom', repeatable: false, onActivate: () => actions.cycle(1) });
  useHotkey({ keys: 'Shift+z', action: 'zoomBack', repeatable: false, onActivate: () => actions.cycle(-1) });
  useHotkey({ keys: 'Shift+Alt+ArrowLeft', action: 'pan', disabled: fit, onActivate: () => zoom.pan('left') });
  useHotkey({ keys: 'Shift+Alt+ArrowRight', action: 'pan', disabled: fit, onActivate: () => zoom.pan('right') });
  useHotkey({ keys: 'Shift+Alt+ArrowUp', action: 'pan', disabled: fit, onActivate: () => zoom.pan('up') });
  useHotkey({ keys: 'Shift+Alt+ArrowDown', action: 'pan', disabled: fit, onActivate: () => zoom.pan('down') });
  return null;
}

/** Adds the live Studio shortcuts to the `Shift+?` help dialog, and removes them when the tier goes away. */
function HelpRows({ features, guides, zoom }: { features: Readonly<FeatureFlags>; guides: boolean; zoom: boolean }) {
  const { setExtraRows } = useShortcutsDialog();

  const rows = useMemo(() => {
    const list: ShortcutRow[] = [];
    if (features.frameStep) {
      list.push({ keys: [',', '.'], label: t.help.step });
      list.push({ keys: ['←', '→'], label: t.help.stepPaused });
      list.push({ keys: ['Shift', '←', '→'], label: t.help.jump });
    }
    if (features.copyTimecodeLink) list.push({ keys: ['S'], label: t.help.link });
    if (features.inOut) {
      list.push({ keys: ['I', 'O'], label: t.help.setInOut });
      list.push({ keys: ['Shift', 'I', 'O'], label: t.help.clearInOut });
    }
    if (features.loop) list.push({ keys: ['R'], label: t.help.loop });
    if (features.shotNav) list.push({ keys: ['[', ']'], label: features.markers ? t.help.cutsMarkers : t.help.cuts });
    if (features.grabFrame) {
      list.push({ keys: ['G'], label: t.help.grab });
      list.push({ keys: ['Shift', 'G'], label: t.help.copyImage });
    }
    if (features.inOut) {
      list.push({ keys: ['←', '→'], label: t.help.handles });
      list.push({ keys: ['Shift', '←', '→'], label: t.help.handlesJump });
      list.push({ keys: ['Delete'], label: t.help.handlesClear });
    }
    if (guides) list.push({ keys: ['Shift', 'V'], label: t.help.guides });
    if (zoom) {
      list.push({ keys: ['Z'], label: t.help.zoom });
      list.push({ keys: ['Shift', 'Z'], label: t.help.zoomBack });
      list.push({ keys: ['Shift', 'Alt', '←', '→', '↑', '↓'], label: t.help.pan });
    }
    return list;
  }, [features, guides, zoom]);

  useEffect(() => {
    setExtraRows(rows);
    return () => setExtraRows([]);
  }, [rows, setExtraRows]);

  return null;
}
