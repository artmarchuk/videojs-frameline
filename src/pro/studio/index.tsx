/** @jsxImportSource react */

import './studio.css';
import { Menu, selectPlayback, useHotkey, usePlayer } from '@videojs/react';
import { useEffect, useId, useLayoutEffect, useMemo, useState, type ReactElement, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';

import { cn } from '@/lib/resolve-class-name';

import { ChevronIcon, CloseIcon } from '../../video/icons';
import { useProSlot, useProThumbnailRenderer, useSetProSettingsItems } from '../../video/pro-slots';
import { Button } from '../../video/shared/button';
import { useShortcutsDialog, type ShortcutRow } from '../../video/shared/shortcuts-dialog';
import { ButtonTooltip } from '../../video/shared/tooltip';
import { useProStore, useProStoreApi } from '../context';
import type { FeatureFlags } from '../features';
import type { Marker } from '../store';
import { formatTimecode, framesFromSeconds, secondsFromFrames } from '../timecode';
import { AnnouncerProvider, useAnnounce } from './announcer';
import { useStudioController, type CopyLinkInfo, type StudioController } from './controller';
import { BookmarkIcon, GrabFrameIcon, LoopIcon, NextCutIcon, PreviousCutIcon, StepBackIcon, StepForwardIcon } from './icons';
import { isNarrowDock } from './logic';
import { studioStrings as t } from './strings';
import { Timeline, type TimelineProps } from './timeline';
import { snapFrame, validMarkers } from './timeline/logic';
import { allowedView, hasViewMenu } from '../view';
import { Guides } from './guides';
import { usePictureRect } from './guides/use-picture-rect';
import { useChapters, useCuts, type Chapter } from './use-cuts';
import { useViewActions, ViewMenu, type ViewActions } from './view-menu';

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
}

/**
 * The Studio tier: the compact ruler timeline with the range handles, frame-by-frame transport, the timecode, and
 * the Markers, Capture and View menus. Loaded lazily, only when a Studio feature is on. The controls are portalled
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
 * Whether the dock is in its narrow arrangement (a narrow player, or a touch device). CSS container queries do the
 * rest of the responsive work; this exists because the narrow arrangement changes the order of the controls and
 * adds In and Out buttons, and the DOM order has to change with it so the focus order matches what is on screen.
 * Also written to the container as `data-dock-size` for the styles; the attribute is removed with this module.
 */
function useNarrowDock(anchor: RefObject<HTMLElement | null>): boolean {
  const [narrow, setNarrow] = useState(false);

  useLayoutEffect(() => {
    const container = anchor.current?.closest<HTMLElement>('.media-container') ?? null;
    if (!container) return;
    const coarse = typeof matchMedia === 'function' ? matchMedia('(pointer: coarse)') : null;
    const update = () => {
      const next = isNarrowDock(container.getBoundingClientRect().width, coarse?.matches ?? false);
      container.dataset.dockSize = next ? 'narrow' : 'wide';
      setNarrow(next);
    };
    update();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update);
    observer?.observe(container);
    coarse?.addEventListener?.('change', update);
    return () => {
      observer?.disconnect();
      coarse?.removeEventListener?.('change', update);
      delete container.dataset.dockSize;
    };
  }, [anchor]);

  return narrow;
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

function Studio({ features, fps, startFrames, dropFrame, markers, video, anchor, onCopyLink }: StudioLayerProps) {
  const announce = useAnnounce();
  const chapters = useChapters(video);
  const cuts = useCuts(chapters, features.shotNav ? markers : NO_MARKERS, fps);
  const controller = useStudioController({ video, fps, startFrames, dropFrame, cuts, announce, onCopyLink });
  const paused = usePlayer(selectPlayback)?.paused ?? true;
  const narrow = useNarrowDock(anchor);
  useMarkerDeselect(video, fps);

  // Guides: what the host allows, where the picture is, and the actions the menu and `Shift+V` share.
  const allowed = useMemo(() => allowedView(features), [features]);
  const viewMenu = hasViewMenu(allowed);
  const picture = usePictureRect(video, anchor);
  const viewActions = useViewActions();

  const timeline = useProSlot('timeline');
  const renderThumbnail = useProThumbnailRenderer<TimelineProps['renderThumbnail']>();
  const shownMarkers = features.markers ? markers : NO_MARKERS;
  const listed = useMemo(() => validMarkers(shownMarkers), [shownMarkers]);
  const listedChapters = features.markers ? chapters : NO_CHAPTERS;
  const time = useProSlot('time');
  const transportStart = useProSlot('transport-start');
  const transportEnd = useProSlot('transport-end');
  const rangeSlot = useProSlot('range');
  const rangeNarrow = useProSlot('range-narrow');
  const tools = useProSlot('tools');

  const hasCuts = cuts.length > 0;
  const range = features.inOut || features.loop;
  const capture = features.grabFrame || features.copyTimecodeLink;

  // On the narrow dock the Markers menu has no room in the row: the markers move into the settings menu.
  const setSettingsItems = useSetProSettingsItems();
  useEffect(() => {
    if (!narrow || listed.length === 0) return;
    setSettingsItems(<MarkersSubmenu markers={listed} chapters={listedChapters} controller={controller} fps={fps} />);
    return () => setSettingsItems(null);
  }, [narrow, listed, listedChapters, controller, fps, setSettingsItems]);

  const previousCut = features.shotNav && (
    <ToolButton label={t.previousCut} shortcut="[" icon={<PreviousCutIcon />} disabled={!hasCuts} disabledReason={t.noCuts} onClick={() => controller.goToCut('previous')} />
  );
  const nextCut = features.shotNav && (
    <ToolButton label={t.nextCut} shortcut="]" icon={<NextCutIcon />} disabled={!hasCuts} disabledReason={t.noCuts} onClick={() => controller.goToCut('next')} />
  );
  const stepBack = features.frameStep && <ToolButton label={t.stepBack} shortcut="," icon={<StepBackIcon />} onClick={() => controller.step(-1)} />;
  const stepForward = features.frameStep && <ToolButton label={t.stepForward} shortcut="." icon={<StepForwardIcon />} onClick={() => controller.step(1)} />;

  return (
    <>
      <StudioHotkeys controller={controller} features={features} paused={paused} viewActions={viewMenu ? viewActions : null} />
      <HelpRows features={features} guides={viewMenu} />
      {viewMenu && <Guides rect={picture.rect} layer={picture.layer} />}

      {timeline &&
        createPortal(
          <Timeline controller={controller} fps={fps} markers={shownMarkers} range={features.inOut} video={video} renderThumbnail={renderThumbnail} />,
          timeline
        )}

      {time && features.timecode && createPortal(<TimecodeField controller={controller} fps={fps} dropFrame={dropFrame} />, time)}

      {/* Wide: cut and step either side of Play. Narrow: step, Play, cut, so the two step buttons sit together. */}
      {transportStart &&
        createPortal(
          <Segmented name={narrow ? 'step' : 'back'}>
            {narrow ? (
              <>
                {stepBack}
                {stepForward}
              </>
            ) : (
              <>
                {previousCut}
                {stepBack}
              </>
            )}
          </Segmented>,
          transportStart
        )}
      {transportEnd &&
        createPortal(
          <Segmented name={narrow ? 'cut' : 'forward'}>
            {narrow ? (
              <>
                {previousCut}
                {nextCut}
              </>
            ) : (
              <>
                {stepForward}
                {nextCut}
              </>
            )}
          </Segmented>,
          transportEnd
        )}

      {/* Wide: Loop and Reset range after the transport. Narrow and touch: In, Out and Loop, because there is no keyboard. */}
      {!narrow && rangeSlot && range && createPortal(<RangeControls controller={controller} features={features} />, rangeSlot)}
      {narrow && rangeNarrow && range && createPortal(<RangeControls controller={controller} features={features} narrow />, rangeNarrow)}

      {tools &&
        createPortal(
          <>
            {!narrow && (listed.length > 0 || listedChapters.length > 0) && (
              <MarkersMenu markers={listed} chapters={listedChapters} controller={controller} fps={fps} />
            )}
            {capture && <CaptureMenu controller={controller} features={features} />}
            {viewMenu && <ViewMenu allowed={allowed} actions={viewActions} />}
          </>,
          tools
        )}
    </>
  );
}

const NO_MARKERS: readonly Marker[] = [];
const NO_CHAPTERS: readonly Chapter[] = [];

/** A segmented control: buttons that share one fill. Renders nothing when it has no buttons. */
function Segmented({ name, divided = false, children }: { name: string; divided?: boolean; children: ReactNode }) {
  return (
    <div className={cn('pro-seg', divided && 'pro-seg-divided')} data-pro-seg={name}>
      {children}
    </div>
  );
}

/**
 * A dock button with an accessible name and a tooltip that shows its shortcut, or why it is disabled. With `text` it
 * shows that word in place of an icon; the accessible name stays the full label.
 */
function ToolButton({
  label,
  shortcut,
  icon,
  text,
  onClick,
  pressed,
  disabled = false,
  disabledReason,
  className,
  name,
}: {
  label: string;
  shortcut?: string;
  icon?: ReactElement;
  text?: string;
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
        className={cn('pro-tool', text && 'pro-tool-text', className)}
        aria-label={disabled && disabledReason ? `${label}. ${disabledReason}` : label}
        aria-keyshortcuts={shortcut}
        aria-pressed={pressed}
        aria-disabled={disabled || undefined}
        data-pressed={pressed ? '' : undefined}
        data-pro-tool={name}
        onClick={disabled ? undefined : onClick}
      >
        {icon && <span className={'media-button-icon pro-tool-icon'}>{icon}</span>}
        {text}
      </Button>
    </ButtonTooltip>
  );
}

/**
 * The timecode: the full timecode of the current frame in a recessed field, and the duration in dim text beside it.
 * Pressing the field switches between timecode and seconds. It re-renders when the frame number changes and at no
 * other time. It is not a live region: the value is read on focus, and steps and seeks are announced separately.
 */
function TimecodeField({ controller, fps, dropFrame }: { controller: StudioController; fps: number; dropFrame: boolean }) {
  const store = useProStoreApi();
  const frame = useProStore((state) => state.frame);
  const display = useProStore((state) => state.timeDisplay);
  const duration = useProStore((state) => state.duration);
  const approximate = useProStore((state) => state.clockPrecision === 'approximate');
  const valueId = useId();
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
      <ButtonTooltip label={tip} align="start">
        <button type="button" className={'pro-timecode'} aria-label={t.timeInSeconds} aria-pressed={seconds} aria-describedby={valueId} onClick={() => store.toggleTimeDisplay()}>
          <span id={valueId} className={'pro-timecode-values'} data-pro-timecode>
            {approximate && <span className={'pro-timecode-approx'}>≈</span>}
            {current}
            <span className={'pro-visually-hidden'}> {t.of(total)}</span>
          </span>
        </button>
      </ButtonTooltip>
      {duration > 0 && (
        <span className={'pro-timecode-total'} aria-hidden="true">
          {t.of(total)}
        </span>
      )}
    </>
  );
}

/**
 * Loop and the range buttons. Wide: a Loop toggle and, only while a range is set, a small Reset range button. Narrow
 * and touch: a segmented In, Out, Loop control, because there is no keyboard for `I` and `O`; the buttons set the
 * point at the playhead. Loop loops the range when one is set, otherwise the whole video.
 */
function RangeControls({ controller, features, narrow = false }: { controller: StudioController; features: Readonly<FeatureFlags>; narrow?: boolean }) {
  const looping = useProStore((state) => state.loopMode !== 'off');
  const hasRange = useProStore((state) => state.inPoint !== null || state.outPoint !== null);

  const loop = features.loop && <ToolButton name="loop" label={t.loop} shortcut="R" icon={<LoopIcon />} pressed={looping} onClick={controller.toggleLoop} />;

  if (narrow) {
    return (
      <div className={'pro-range'} role="group" aria-label={t.range}>
        <Segmented name="range" divided>
          {features.inOut && <ToolButton label={t.setIn} text={t.in} onClick={controller.setIn} />}
          {features.inOut && <ToolButton label={t.setOut} text={t.out} onClick={controller.setOut} />}
          {loop}
        </Segmented>
      </div>
    );
  }

  const reset = (event: { currentTarget: HTMLElement }) => {
    // The button goes away with the range: hand focus to its neighbour, not to the page.
    const next = event.currentTarget.closest('.pro-range')?.querySelector<HTMLElement>('[data-pro-tool="loop"]');
    controller.clearRange();
    next?.focus();
  };

  return (
    <div className={'pro-range'} role="group" aria-label={t.range}>
      {loop}
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
    <ToolMenu name="markers" label={count > 0 ? t.markersCount(count) : t.chapters} tooltip={count > 0 ? t.markers : t.chapters} icon={<BookmarkIcon />} badge={count}>
      <MarkerItems {...props} />
    </ToolMenu>
  );
}

/**
 * The same list as a page of the settings menu, for the narrow dock. It is rendered inside the settings menu's own
 * tree (see `useSetProSettingsItems`), so it takes everything it needs as props.
 */
function MarkersSubmenu(props: MarkerListProps) {
  const title = props.markers.length > 0 ? t.markers : t.chapters;
  return (
    <Menu.Root>
      <Menu.Trigger className={'media-menu-item'}>
        <span className={'media-menu-icon pro-tool-icon'}>
          <BookmarkIcon />
        </span>
        <span>{title}</span>
        <span className={'media-menu-hint'}>
          <span className={'media-menu-hint-label'}>{props.markers.length || props.chapters.length}</span>
          <ChevronIcon className={'media-menu-icon media-menu-forward-chevron'} />
        </span>
      </Menu.Trigger>
      <Menu.Content className={'media-menu-content'}>
        <Menu.Item className={'media-menu-item media-menu-back-item'}>
          <ChevronIcon className={'media-menu-icon media-menu-back-chevron'} />
          <span>{title}</span>
        </Menu.Item>
        <MarkerItems {...props} />
      </Menu.Content>
    </Menu.Root>
  );
}

function MenuAction({ label, shortcut, onSelect }: { label: string; shortcut?: string; onSelect: () => void }) {
  return (
    <Menu.Item className={'media-menu-item'} onSelect={onSelect}>
      <span>{label}</span>
      {shortcut && (
        <span className={'media-menu-hint'}>
          <kbd className={'pro-kbd'}>{shortcut}</kbd>
        </span>
      )}
    </Menu.Item>
  );
}

/** The Capture menu: grab or copy the frame, or copy a link at the timecode. */
function CaptureMenu({ controller, features }: { controller: StudioController; features: Readonly<FeatureFlags> }) {
  const link = features.copyTimecodeLink;
  return (
    <ToolMenu name="capture" label={t.capture} icon={<GrabFrameIcon />} word={t.capture}>
      {features.grabFrame && <MenuAction label={t.grab} shortcut="G" onSelect={controller.grabFrame} />}
      {features.grabFrame && <MenuAction label={t.copyImage} onSelect={controller.copyFrameImage} />}
      {features.grabFrame && link && <Menu.Separator className={'pro-menu-separator'} />}
      {features.copyTimecodeLink && <MenuAction label={t.copyLink} onSelect={controller.copyLink} />}
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
  viewActions,
}: {
  controller: StudioController;
  features: Readonly<FeatureFlags>;
  paused: boolean;
  viewActions: ViewActions | null;
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
  useHotkey({ keys: 'g', action: 'grabFrame', repeatable: false, disabled: !features.grabFrame, onActivate: controller.grabFrame });
  // Shift alone with V; the hotkey layer ignores keys typed into text fields and matches modifiers exactly.
  useHotkey({ keys: 'Shift+v', action: 'toggleGuides', repeatable: false, disabled: !viewActions, onActivate: () => viewActions?.toggleHidden() });

  return null;
}

/** Adds the live Studio shortcuts to the `Shift+?` help dialog, and removes them when the tier goes away. */
function HelpRows({ features, guides }: { features: Readonly<FeatureFlags>; guides: boolean }) {
  const { setExtraRows } = useShortcutsDialog();

  const rows = useMemo(() => {
    const list: ShortcutRow[] = [];
    if (features.frameStep) {
      list.push({ keys: [',', '.'], label: t.help.step });
      list.push({ keys: ['←', '→'], label: t.help.stepPaused });
      list.push({ keys: ['Shift', '←', '→'], label: t.help.jump });
    }
    if (features.inOut) {
      list.push({ keys: ['I', 'O'], label: t.help.setInOut });
      list.push({ keys: ['Shift', 'I', 'O'], label: t.help.clearInOut });
    }
    if (features.loop) list.push({ keys: ['R'], label: t.help.loop });
    if (features.shotNav) list.push({ keys: ['[', ']'], label: features.markers ? t.help.cutsMarkers : t.help.cuts });
    if (features.grabFrame) list.push({ keys: ['G'], label: t.help.grab });
    if (features.inOut) {
      list.push({ keys: ['←', '→'], label: t.help.handles });
      list.push({ keys: ['Shift', '←', '→'], label: t.help.handlesJump });
      list.push({ keys: ['Delete'], label: t.help.handlesClear });
    }
    if (guides) list.push({ keys: ['Shift', 'V'], label: t.help.guides });
    return list;
  }, [features, guides]);

  useEffect(() => {
    setExtraRows(rows);
    return () => setExtraRows([]);
  }, [rows, setExtraRows]);

  return null;
}
