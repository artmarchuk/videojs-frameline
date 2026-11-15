/** @jsxImportSource react */

import './review.css';
import { Menu, selectPlayback, useHotkey, usePlayer } from '@videojs/react';
import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactElement,
  type ReactNode,
  type RefObject,
} from 'react';
import { createPortal } from 'react-dom';

import { cn } from '@/lib/resolve-class-name';

import { ChevronIcon } from '../../video/icons';
import { useProSlot, useProThumbnailRenderer } from '../../video/pro-slots';
import { Button } from '../../video/shared/button';
import { useShortcutsDialog, type ShortcutRow } from '../../video/shared/shortcuts-dialog';
import { ButtonTooltip } from '../../video/shared/tooltip';
import { useProStore, useProStoreApi } from '../context';
import type { FeatureFlags } from '../features';
import type { Marker } from '../store';
import { formatTimecode, framesFromSeconds, secondsFromFrames } from '../timecode';
import { AnnouncerProvider, useAnnounce } from './announcer';
import { useReviewController, type CopyLinkInfo, type PosterFrameInfo, type ReviewController } from './controller';
import { chooseDockSize, toolsSummary, type DockSize } from './dock-logic';
import {
  ClearRangeIcon,
  CopyImageIcon,
  EyeIcon,
  GrabFrameIcon,
  LinkIcon,
  LoopIcon,
  NextCutIcon,
  PlayRangeIcon,
  PosterIcon,
  PreviousCutIcon,
  StepBackIcon,
  StepForwardIcon,
} from './icons';
import { reviewStrings as t } from './strings';
import { Timeline, type TimelineProps } from './timeline';
import { formatRangeLength, validMarkers } from './timeline/logic';
import { useCuts } from './use-cuts';

export interface ReviewLayerProps {
  features: Readonly<FeatureFlags>;
  fps: number;
  startFrames: number;
  dropFrame: boolean;
  markers: readonly Marker[];
  video: HTMLVideoElement | null;
  /** An element inside the player, used to find and measure the player container. */
  anchor: RefObject<HTMLElement | null>;
  onCopyLink?: ((info: CopyLinkInfo) => void) | undefined;
  onPosterFrame?: ((info: PosterFrameInfo) => void) | undefined;
}

/**
 * Review tier: the ruler timeline, frame-by-frame transport, timecode, and the Tools tray (Range, Capture, View).
 * Loaded lazily, only when a Review feature is on. The controls are portalled into the control bar's slots, so they
 * sit in the bar's layout and focus order.
 */
export default function ReviewLayer(props: ReviewLayerProps) {
  return (
    <AnnouncerProvider>
      <Review {...props} />
    </AnnouncerProvider>
  );
}

/**
 * Which arrangement the bar is in, from the player's own width. Also written to the container as `data-dock-size`
 * for the styles; the attribute belongs to this module and is removed with it.
 */
function useDockSize(anchor: RefObject<HTMLElement | null>): DockSize {
  const [size, setSize] = useState<DockSize>('wide');

  useLayoutEffect(() => {
    const container = anchor.current?.closest<HTMLElement>('.media-container') ?? null;
    if (!container) return;
    const coarse = typeof matchMedia === 'function' ? matchMedia('(pointer: coarse)') : null;
    const update = () => {
      const next = chooseDockSize(container.getBoundingClientRect().width, coarse?.matches ?? false);
      container.dataset.dockSize = next;
      setSize(next);
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

  return size;
}

function Review({ features, fps, startFrames, dropFrame, markers, video, anchor, onCopyLink, onPosterFrame }: ReviewLayerProps) {
  const announce = useAnnounce();
  const cuts = useCuts(video, features.shotNav ? markers : NO_MARKERS, fps);
  const controller = useReviewController({ video, fps, startFrames, dropFrame, cuts, announce, onCopyLink, onPosterFrame });
  const paused = usePlayer(selectPlayback)?.paused ?? true;
  const size = useDockSize(anchor);
  const narrow = size === 'narrow';
  const toolsOpen = useProStore((state) => state.toolsOpen);
  const trayId = useId();

  const timeline = useProSlot('timeline');
  const renderThumbnail = useProThumbnailRenderer<TimelineProps['renderThumbnail']>();
  const shownMarkers = features.markers ? markers : NO_MARKERS;
  const timeStart = useProSlot('time-start');
  const transportStart = useProSlot('transport-start');
  const transportEnd = useProSlot('transport-end');
  const time = useProSlot('time');
  const tools = useProSlot('tools');
  const tray = useProSlot('tray');

  const hasCuts = cuts.length > 0;
  const range = features.inOut || features.loop;
  const capture = features.grabFrame || features.copyTimecodeLink || features.posterFrame;
  const hasTray = range || capture || shownMarkers.length > 0 || features.guides !== false;

  const previousCut = features.shotNav && (
    <ToolButton label={t.previousCut} shortcut="[" icon={<PreviousCutIcon />} disabled={!hasCuts} disabledReason={t.noCuts} onClick={() => controller.goToCut('previous')} />
  );
  const nextCut = features.shotNav && (
    <ToolButton label={t.nextCut} shortcut="]" icon={<NextCutIcon />} disabled={!hasCuts} disabledReason={t.noCuts} onClick={() => controller.goToCut('next')} />
  );
  const stepBack = features.frameStep && <ToolButton label={t.stepBack} shortcut="," icon={<StepBackIcon />} onClick={() => controller.step(-1)} />;
  const stepForward = features.frameStep && <ToolButton label={t.stepForward} shortcut="." icon={<StepForwardIcon />} onClick={() => controller.step(1)} />;
  const timecode = features.timecode && <TimecodeField controller={controller} fps={fps} dropFrame={dropFrame} />;

  return (
    <>
      <ReviewHotkeys controller={controller} features={features} paused={paused} />
      <HelpRows features={features} />

      {timeline &&
        createPortal(
          <Timeline controller={controller} fps={fps} markers={shownMarkers} range={range} video={video} renderThumbnail={renderThumbnail} />,
          timeline
        )}

      {/* Wide and medium: cut and step either side of Play, then the timecode. Narrow: timecode, step, Play, cut. */}
      {narrow && timeStart && timecode && createPortal(timecode, timeStart)}
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
      {!narrow && time && timecode && createPortal(timecode, time)}

      {tools && hasTray && createPortal(<ToolsToggle trayId={trayId} guides={features.guides !== false} />, tools)}
      {tray &&
        hasTray &&
        toolsOpen &&
        createPortal(
          <Tray id={trayId} controller={controller} features={features} fps={fps} markers={shownMarkers} />,
          tray
        )}
    </>
  );
}

const NO_MARKERS: readonly Marker[] = [];

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
  hint,
  icon,
  text,
  onClick,
  pressed,
  disabled = false,
  disabledReason,
  className,
}: {
  label: string;
  shortcut?: string;
  hint?: string;
  icon?: ReactElement;
  text?: string;
  onClick?: () => void;
  pressed?: boolean;
  disabled?: boolean;
  disabledReason?: string;
  className?: string;
}) {
  const tip = (
    <>
      <span>{disabled && disabledReason ? disabledReason : hint ? `${label}. ${hint}` : label}</span>
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
        onClick={disabled ? undefined : onClick}
      >
        {icon && <span className={'media-button-icon pro-tool-icon'}>{icon}</span>}
        {text}
      </Button>
    </ButtonTooltip>
  );
}

/**
 * The timecode field: the full timecode of the current frame in a recessed field, with the frame rate beside it.
 * Pressing it switches between timecode and seconds. It re-renders when the frame number changes and at no other
 * time. It is not a live region: the value is read on focus, and steps and seeks are announced separately.
 */
function TimecodeField({ controller, fps, dropFrame }: { controller: ReviewController; fps: number; dropFrame: boolean }) {
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
  const rate = t.fps(Number.isInteger(fps) ? String(fps) : fps.toFixed(2));

  const tip = (
    <>
      <span>
        {seconds ? t.switchToTimecode : t.switchToSeconds}
        {approximate ? `. ≈ ${t.approximate}` : ''}
      </span>
      <span className={'pro-kbd'}>{t.total(total)}</span>
    </>
  );

  return (
    <ButtonTooltip label={tip}>
      <button
        type="button"
        className={'pro-timecode'}
        aria-label={t.timeInSeconds}
        aria-pressed={seconds}
        aria-describedby={valueId}
        onClick={() => store.toggleTimeDisplay()}
      >
        <span id={valueId} className={'pro-timecode-values'} data-pro-timecode>
          {approximate && <span className={'pro-timecode-approx'}>≈</span>}
          {current}
          <span className={'pro-visually-hidden'}>
            {' '}
            {t.of} {total}, {rate}
          </span>
        </span>
        <span className={'pro-timecode-fps'} aria-hidden="true">
          {rate}
        </span>
      </button>
    </ButtonTooltip>
  );
}

function useRangeState() {
  const inPoint = useProStore((state) => state.inPoint);
  const outPoint = useProStore((state) => state.outPoint);
  const looping = useProStore((state) => state.loopMode === 'range');
  return { inPoint, outPoint, looping, hasRange: inPoint !== null || outPoint !== null };
}

/**
 * The one disclosure control for the secondary tools. Closed, it also shows a dim summary of what is set. It only
 * changes what is visible: every shortcut works whether the tray is open or not.
 */
function ToolsToggle({ trayId, guides }: { trayId: string; guides: boolean }) {
  const store = useProStoreApi();
  const open = useProStore((state) => state.toolsOpen);
  const duration = useProStore((state) => state.duration);
  const active = useProStore((state) => state.activeOverlays.size);
  const { inPoint, outPoint } = useRangeState();
  const summary = open ? '' : toolsSummary({ in: inPoint, out: outPoint }, duration, guides ? active : 0);

  return (
    <ButtonTooltip label={<span>{open ? t.hideTools : t.showTools}</span>}>
      <button
        type="button"
        className={'pro-tools-toggle'}
        aria-expanded={open}
        aria-controls={open ? trayId : undefined}
        data-open={open ? '' : undefined}
        onClick={() => store.setToolsOpen()}
      >
        <span className={'pro-tools-label'}>{t.tools}</span>
        <span className={'pro-tools-label-short'} aria-hidden="true">
          {t.toolsShort}
        </span>
        {summary && <span className={'pro-tools-summary'}>{summary}</span>}
        <ChevronIcon className={'pro-tools-chevron'} />
      </button>
    </ButtonTooltip>
  );
}

/** `00:00:14:00 – 00:00:31:00` over `17 s · 408 frames`. */
function RangeReadout({ controller, fps }: { controller: ReviewController; fps: number }) {
  const { inPoint, outPoint, hasRange } = useRangeState();
  const duration = useProStore((state) => state.duration);
  const seconds = useProStore((state) => state.timeDisplay === 'seconds');

  if (!hasRange) return <span className={'pro-range-readout pro-range-empty'}>{t.noRange}</span>;

  const code = (time: number) => (seconds ? time.toFixed(3) : controller.timecode(framesFromSeconds(time, fps)));
  const start = inPoint ?? 0;
  const end = outPoint ?? duration;
  const frames = Math.max(0, framesFromSeconds(end, fps) - framesFromSeconds(start, fps));

  return (
    <span className={'pro-range-readout'}>
      <span className={'pro-range-points'}>
        {inPoint === null ? t.fromStart : code(inPoint)} <span aria-hidden="true">–</span>
        <span className={'pro-visually-hidden'}>to</span> {outPoint === null ? t.toEnd : code(outPoint)}
      </span>
      <span className={'pro-range-length'}>
        {formatRangeLength(Math.max(0, end - start))}
        <span className={'pro-range-frames'}> · {t.frames(frames)}</span>
      </span>
    </span>
  );
}

/** A small chevron button that opens a menu of the less-used actions of its segmented control. */
function OptionsMenu({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <Menu.Root side="top" align="start">
      <ButtonTooltip label={<span>{label}</span>}>
        <Menu.Trigger render={<Button />} className={cn('pro-tool pro-tool-chevron', className)} aria-label={label}>
          <ChevronIcon className={'pro-chevron-down'} />
        </Menu.Trigger>
      </ButtonTooltip>
      <Menu.Popup keepMounted className={cn('media-popup', 'media-menu-popup', 'pro-options-popup')}>
        <Menu.Content className={'media-menu-content'}>{children}</Menu.Content>
      </Menu.Popup>
    </Menu.Root>
  );
}

function OptionsItem({ icon, label, shortcut, onSelect, disabled }: { icon?: ReactElement; label: string; shortcut?: string; onSelect: () => void; disabled?: boolean }) {
  return (
    <Menu.Item className={'media-menu-item'} disabled={disabled} onSelect={onSelect}>
      {icon && <span className={'media-menu-icon'}>{icon}</span>}
      <span>{label}</span>
      {shortcut && (
        <span className={'media-menu-hint'}>
          <kbd className={'pro-kbd'}>{shortcut}</kbd>
        </span>
      )}
    </Menu.Item>
  );
}

function TrayGroup({ label, name, children }: { label: string; name: string; children: ReactNode }) {
  return (
    <div className={'pro-tray-group'} role="group" aria-label={label} data-pro-group={name}>
      <span className={'pro-tray-label'} aria-hidden="true">
        {label}
      </span>
      {children}
    </div>
  );
}

/**
 * The Tools tray: Range, Capture, markers and View, with inline labels. Escape inside it closes it and returns focus
 * to the Tools button.
 */
function Tray({
  id,
  controller,
  features,
  fps,
  markers,
}: {
  id: string;
  controller: ReviewController;
  features: Readonly<FeatureFlags>;
  fps: number;
  markers: readonly Marker[];
}) {
  const store = useProStoreApi();
  const { looping, hasRange } = useRangeState();
  const duration = useProStore((state) => state.duration);
  const active = useProStore((state) => state.activeOverlays.size);
  const listed = useMemo(() => validMarkers(markers, duration), [markers, duration]);

  const range = features.inOut || features.loop;
  const capture = features.grabFrame || features.copyTimecodeLink || features.posterFrame;

  const onKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Escape' || event.defaultPrevented) return;
    // An open menu or tooltip takes Escape first.
    if (event.target instanceof Element && event.target.closest('[role="menu"], [aria-expanded="true"]')) return;
    event.preventDefault();
    store.setToolsOpen(false);
    event.currentTarget.closest('.pro-bar')?.querySelector<HTMLElement>('.pro-tools-toggle')?.focus();
  };

  return (
    <div id={id} className={'pro-tray'} onKeyDown={onKeyDown}>
      {range && (
        <TrayGroup label={t.range} name="range">
          <Segmented name="range" divided>
            {features.inOut && <ToolButton label={t.setIn} shortcut="I" text={t.in} onClick={controller.setIn} />}
            {features.inOut && <ToolButton label={t.setOut} shortcut="O" text={t.out} onClick={controller.setOut} />}
            {features.loop && (
              <ToolButton label={t.loop} shortcut="R" icon={<LoopIcon />} pressed={looping} disabled={!hasRange} disabledReason={t.needRange} onClick={controller.toggleLoop} />
            )}
            <OptionsMenu label={t.rangeOptions}>
              {features.loop && <OptionsItem icon={<PlayRangeIcon />} label={t.playRange} disabled={!hasRange} onSelect={controller.playRange} />}
              {features.inOut && <OptionsItem icon={<ClearRangeIcon />} label={t.clearRange} disabled={!hasRange} onSelect={controller.clearRange} />}
            </OptionsMenu>
          </Segmented>
          {features.inOut && <RangeReadout controller={controller} fps={fps} />}
        </TrayGroup>
      )}

      {capture && (
        <TrayGroup label={t.capture} name="capture">
          <Segmented name="capture" divided>
            {features.grabFrame && <ToolButton label={t.grab} hint={t.grabHint} shortcut="G" icon={<GrabFrameIcon />} onClick={controller.grabFrame} />}
            {features.grabFrame && (
              <OptionsMenu label={t.grabOptions} className={'pro-tool-attached'}>
                <OptionsItem icon={<GrabFrameIcon />} label={t.download} shortcut="G" onSelect={controller.grabFrame} />
                <OptionsItem icon={<CopyImageIcon />} label={t.copyImage} onSelect={controller.copyFrameImage} />
              </OptionsMenu>
            )}
            {features.copyTimecodeLink && <ToolButton label={t.copyLink} icon={<LinkIcon />} onClick={controller.copyLink} />}
            {features.posterFrame && <ToolButton label={t.poster} icon={<PosterIcon />} onClick={controller.usePoster} />}
          </Segmented>
        </TrayGroup>
      )}

      {listed.length > 0 && (
        <TrayGroup label={t.goTo} name="markers">
          <Menu.Root side="top" align="start">
            <ButtonTooltip label={<span>{t.markers}</span>}>
              <Menu.Trigger render={<Button />} className={'pro-tool pro-tool-text pro-tool-menu'}>
                {t.markers}
                <span className={'pro-badge'}>{listed.length}</span>
                <ChevronIcon className={'pro-chevron-down'} />
              </Menu.Trigger>
            </ButtonTooltip>
            <Menu.Popup keepMounted className={cn('media-popup', 'media-menu-popup', 'pro-options-popup')}>
              <Menu.Content className={'media-menu-content'}>
                {listed.map((marker, index) => (
                  <Menu.Item key={marker.id ?? `${index}:${marker.time}`} className={'media-menu-item pro-marker-item'} onSelect={() => controller.goToMarker(marker)}>
                    <span className={'pro-marker-item-label'}>{marker.label}</span>
                    <span className={'media-menu-hint'}>
                      <span className={'media-menu-hint-label'}>{controller.timecode(framesFromSeconds(marker.time, fps))}</span>
                    </span>
                  </Menu.Item>
                ))}
              </Menu.Content>
            </Menu.Popup>
          </Menu.Root>
        </TrayGroup>
      )}

      {features.guides !== false && (
        <TrayGroup label={t.view} name="view">
          {/* Step 6 fills this menu. Until then the control has its place and says so. */}
          <ButtonTooltip label={<span>{t.guidesSoon}</span>}>
            <Button type="button" className={'pro-tool pro-tool-text pro-tool-menu'} aria-label={t.guidesSoon} aria-disabled="true">
              <span className={'media-button-icon pro-tool-icon'}>
                <EyeIcon />
              </span>
              {t.guides}
              {active > 0 && <span className={'pro-badge'}>{active}</span>}
              <ChevronIcon className={'pro-chevron-down'} />
            </Button>
          </ButtonTooltip>
        </TrayGroup>
      )}
    </div>
  );
}

/**
 * Review shortcuts. Each is registered only while its feature is on. None changes what a Share key does during
 * playback: `←` and `→` step frames only while paused, and seek 5 seconds (the Share map) while playing.
 * Patterns match modifiers exactly, so Ctrl, Cmd and Alt combinations stay with the browser.
 */
function ReviewHotkeys({ controller, features, paused }: { controller: ReviewController; features: Readonly<FeatureFlags>; paused: boolean }) {
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

  return null;
}

/** Adds the live Review shortcuts to the `Shift+?` help dialog, and removes them when the tier goes away. */
function HelpRows({ features }: { features: Readonly<FeatureFlags> }) {
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
    return list;
  }, [features]);

  useEffect(() => {
    setExtraRows(rows);
    return () => setExtraRows([]);
  }, [rows, setExtraRows]);

  return null;
}
