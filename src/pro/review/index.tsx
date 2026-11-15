/** @jsxImportSource react */

import './review.css';
import { Menu, selectPiP, selectPlayback, useHotkey, usePlayer } from '@videojs/react';
import { useEffect, useId, useMemo, type ComponentProps, type ReactElement, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

import { cn } from '@/lib/resolve-class-name';

import { PipEnterIcon } from '../../video/icons';
import { useProSlot } from '../../video/pro-slots';
import { Button } from '../../video/shared/button';
import { useShortcutsDialog, type ShortcutRow } from '../../video/shared/shortcuts-dialog';
import { ButtonTooltip } from '../../video/shared/tooltip';
import { useProStore, useProStoreApi } from '../context';
import type { FeatureFlags } from '../features';
import type { Marker } from '../store';
import { formatTimecode, framesFromSeconds, secondsFromFrames } from '../timecode';
import { AnnouncerProvider, useAnnounce } from './announcer';
import { useReviewController, type CopyLinkInfo, type PosterFrameInfo, type ReviewController } from './controller';
import {
  ClearRangeIcon,
  CopyImageIcon,
  GrabFrameIcon,
  LinkIcon,
  LoopIcon,
  MarkInIcon,
  MarkOutIcon,
  MoreIcon,
  NextCutIcon,
  PlayRangeIcon,
  PosterIcon,
  PreviousCutIcon,
  StepBackIcon,
  StepForwardIcon,
} from './icons';
import { reviewStrings as t } from './strings';
import { useCuts } from './use-cuts';

export interface ReviewLayerProps {
  features: Readonly<FeatureFlags>;
  fps: number;
  startFrames: number;
  dropFrame: boolean;
  markers: readonly Marker[];
  video: HTMLVideoElement | null;
  onCopyLink?: ((info: CopyLinkInfo) => void) | undefined;
  onPosterFrame?: ((info: PosterFrameInfo) => void) | undefined;
}

/**
 * Review tier: frame-by-frame transport, timecode, in/out and loop, and frame actions. Loaded lazily, only when a
 * Review feature is on. The controls are portalled into the control bar's slots, so they sit in the bar's layout and
 * focus order.
 */
export default function ReviewLayer(props: ReviewLayerProps) {
  return (
    <AnnouncerProvider>
      <Review {...props} />
    </AnnouncerProvider>
  );
}

function Review({ features, fps, startFrames, dropFrame, markers, video, onCopyLink, onPosterFrame }: ReviewLayerProps) {
  const announce = useAnnounce();
  const cuts = useCuts(video, features.shotNav ? markers : NO_MARKERS, fps);
  const controller = useReviewController({ video, fps, startFrames, dropFrame, cuts, announce, onCopyLink, onPosterFrame });
  const paused = usePlayer(selectPlayback)?.paused ?? true;

  const transportStart = useProSlot('transport-start');
  const transportEnd = useProSlot('transport-end');
  const time = useProSlot('time');
  const tools = useProSlot('tools');

  const hasCuts = cuts.length > 0;
  const range = features.inOut || features.loop;
  const actions = features.grabFrame || features.copyTimecodeLink || features.posterFrame;

  return (
    <>
      <ReviewHotkeys controller={controller} features={features} paused={paused} />
      <HelpRows features={features} />

      {transportStart &&
        createPortal(
          <div className={'pro-group'} data-pro-group="transport-start">
            {features.shotNav && (
              <ToolButton
                label={t.previousCut}
                shortcut="["
                icon={<PreviousCutIcon />}
                disabled={!hasCuts}
                disabledReason={t.noCuts}
                onClick={() => controller.goToCut('previous')}
              />
            )}
            {features.frameStep && (
              <ToolButton label={t.stepBack} shortcut="," icon={<StepBackIcon />} onClick={() => controller.step(-1)} />
            )}
          </div>,
          transportStart
        )}

      {transportEnd &&
        createPortal(
          <div className={'pro-group'} data-pro-group="transport-end">
            {features.frameStep && (
              <ToolButton label={t.stepForward} shortcut="." icon={<StepForwardIcon />} onClick={() => controller.step(1)} />
            )}
            {features.shotNav && (
              <ToolButton
                label={t.nextCut}
                shortcut="]"
                icon={<NextCutIcon />}
                disabled={!hasCuts}
                disabledReason={t.noCuts}
                onClick={() => controller.goToCut('next')}
              />
            )}
          </div>,
          transportEnd
        )}

      {time && features.timecode && createPortal(<TimecodeDisplay controller={controller} fps={fps} dropFrame={dropFrame} />, time)}

      {tools &&
        (range || actions) &&
        createPortal(
          <>
            {range && <RangeGroup controller={controller} features={features} fps={fps} />}
            {actions && <ActionsGroup controller={controller} features={features} />}
            <MoreMenu controller={controller} features={features} fps={fps} />
          </>,
          tools
        )}
    </>
  );
}

const NO_MARKERS: readonly Marker[] = [];

/** A control-bar button with an accessible name and a tooltip that shows its shortcut, or why it is disabled. */
function ToolButton({
  label,
  shortcut,
  hint,
  icon,
  onClick,
  pressed,
  disabled = false,
  disabledReason,
  className,
}: {
  label: string;
  shortcut?: string;
  hint?: string;
  icon: ReactElement;
  onClick: () => void;
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
        className={cn('pro-tool', className)}
        aria-label={disabled && disabledReason ? `${label}. ${disabledReason}` : label}
        aria-keyshortcuts={shortcut}
        aria-pressed={pressed}
        aria-disabled={disabled || undefined}
        data-pressed={pressed ? '' : undefined}
        onClick={disabled ? undefined : onClick}
      >
        <span className={'media-button-icon pro-tool-icon'}>{icon}</span>
      </Button>
    </ButtonTooltip>
  );
}

/**
 * `00:00:42:12 / 00:03:20:00`. Pressing it switches between timecode and seconds. It re-renders when the frame
 * number changes and at no other time. It is not a live region: the value is read on focus, and steps and seeks are
 * announced separately.
 */
function TimecodeDisplay({ controller, fps, dropFrame }: { controller: ReviewController; fps: number; dropFrame: boolean }) {
  const frame = useProStore((state) => state.frame);
  const display = useProStore((state) => state.timeDisplay);
  const duration = useProStore((state) => state.duration);
  const approximate = useProStore((state) => state.clockPrecision === 'approximate');
  const valueId = useId();
  const seconds = display === 'seconds';

  const current = seconds ? secondsFromFrames(frame, fps).toFixed(3) : controller.timecode(frame);
  // The total is a length, so the start-timecode offset does not apply to it.
  const total = seconds ? duration.toFixed(3) : formatTimecode(framesFromSeconds(duration, fps), fps, { dropFrame });

  const tip = (
    <span>
      {seconds ? t.switchToTimecode : t.switchToSeconds}
      {approximate ? `. ≈ ${t.approximate}` : ''}
    </span>
  );

  return (
    <ButtonTooltip label={tip}>
      <TimecodeButton pressed={seconds} describedBy={valueId}>
        <span id={valueId} className={'pro-timecode-values'} data-pro-timecode>
          <span className={'pro-timecode-current'}>
            {approximate && <span className={'pro-timecode-approx'}>≈</span>}
            {current}
          </span>
          <span className={'pro-timecode-separator'} aria-hidden="true">
            /
          </span>
          <span className={'pro-visually-hidden'}>{t.of}</span>
          <span className={'pro-timecode-total'}>{total}</span>
        </span>
      </TimecodeButton>
    </ButtonTooltip>
  );
}

function TimecodeButton({
  pressed,
  describedBy,
  children,
  ...props
}: {
  pressed: boolean;
  describedBy: string;
  children: ReactNode;
} & ComponentProps<'button'>) {
  const store = useProStoreApi();
  return (
    <button
      {...props}
      type="button"
      className={cn('pro-timecode', props.className)}
      aria-label={t.timeInSeconds}
      aria-pressed={pressed}
      aria-describedby={describedBy}
      onClick={(event) => {
        props.onClick?.(event);
        store.toggleTimeDisplay();
      }}
    >
      {children}
    </button>
  );
}

function useRangeState() {
  const inPoint = useProStore((state) => state.inPoint);
  const outPoint = useProStore((state) => state.outPoint);
  const looping = useProStore((state) => state.loopMode === 'range');
  return { inPoint, outPoint, looping, hasRange: inPoint !== null || outPoint !== null };
}

function RangeReadout({ controller, fps }: { controller: ReviewController; fps: number }) {
  const { inPoint, outPoint } = useRangeState();
  const code = (time: number | null) => (time === null ? t.unset : controller.timecode(framesFromSeconds(time, fps)));
  return (
    <span className={'pro-range-readout'} aria-live="off">
      <span className={'pro-range-label'}>{t.rangeIn}</span> {code(inPoint)} <span aria-hidden="true">→</span>{' '}
      <span className={'pro-range-label'}>{t.rangeOut}</span> {code(outPoint)}
    </span>
  );
}

/** Set In, Set Out, Loop, Play range and the range readout. Shown inline on wide players; in More when narrow. */
function RangeGroup({ controller, features, fps }: { controller: ReviewController; features: Readonly<FeatureFlags>; fps: number }) {
  const { inPoint, outPoint, looping, hasRange } = useRangeState();

  return (
    <div className={'pro-group pro-group-inline'} data-pro-group="range">
      {features.inOut && (
        <>
          <ToolButton label={t.setIn} shortcut="I" icon={<MarkInIcon />} className={inPoint !== null ? 'pro-tool-set' : undefined} onClick={controller.setIn} />
          <ToolButton label={t.setOut} shortcut="O" icon={<MarkOutIcon />} className={outPoint !== null ? 'pro-tool-set' : undefined} onClick={controller.setOut} />
        </>
      )}
      {features.loop && (
        <>
          <ToolButton
            label={t.loop}
            shortcut="R"
            icon={<LoopIcon />}
            pressed={looping}
            disabled={!hasRange}
            disabledReason={t.needRange}
            onClick={controller.toggleLoop}
          />
          <ToolButton
            label={t.playRange}
            icon={<PlayRangeIcon />}
            className={'pro-tool-xl'}
            disabled={!hasRange}
            disabledReason={t.needRange}
            onClick={controller.playRange}
          />
        </>
      )}
      {features.inOut && <RangeReadout controller={controller} fps={fps} />}
    </div>
  );
}

function ActionsGroup({ controller, features }: { controller: ReviewController; features: Readonly<FeatureFlags> }) {
  return (
    <div className={'pro-group pro-group-inline'} data-pro-group="actions">
      {features.grabFrame && (
        <ToolButton label={t.grab} hint={t.grabHint} shortcut="G" icon={<GrabFrameIcon />} onClick={controller.grabFrame} />
      )}
      {features.copyTimecodeLink && <ToolButton label={t.copyLink} icon={<LinkIcon />} onClick={controller.copyLink} />}
      {features.posterFrame && <ToolButton label={t.poster} icon={<PosterIcon />} onClick={controller.usePoster} />}
    </div>
  );
}

function MoreItem({
  icon,
  label,
  shortcut,
  onSelect,
  disabled,
  collapsed = false,
  className,
}: {
  icon: ReactElement;
  label: string;
  shortcut?: string;
  onSelect: () => void;
  disabled?: boolean;
  /** Only shown while the inline groups are collapsed (narrow players). */
  collapsed?: boolean;
  className?: string;
}) {
  return (
    <Menu.Item
      className={cn('media-menu-item', collapsed && 'pro-more-collapsed', className)}
      disabled={disabled}
      onSelect={onSelect}
    >
      <span className={'media-menu-icon'}>{icon}</span>
      <span>{label}</span>
      {shortcut && (
        <span className={'media-menu-hint'}>
          <kbd className={'pro-kbd'}>{shortcut}</kbd>
        </span>
      )}
    </Menu.Item>
  );
}

/**
 * The More menu. It always holds the less-used actions (Play range, Clear range, Copy frame image). On narrow
 * players it also holds everything from the Range and Actions groups, which are hidden there.
 */
function MoreMenu({ controller, features, fps }: { controller: ReviewController; features: Readonly<FeatureFlags>; fps: number }) {
  const { hasRange, looping } = useRangeState();
  const pip = usePlayer(selectPiP);

  return (
    <Menu.Root side="top" align="end">
      <ButtonTooltip label={<span>{t.more}</span>}>
        <Menu.Trigger render={<Button />} className={'pro-tool pro-more-button'} aria-label={t.more}>
          <span className={'media-button-icon pro-tool-icon'}>
            <MoreIcon />
          </span>
        </Menu.Trigger>
      </ButtonTooltip>
      <Menu.Popup keepMounted className={cn('media-popup', 'media-menu-popup', 'pro-more-popup')}>
        <Menu.Content className={'media-menu-content'}>
          {features.inOut && (
            <div className={'pro-more-readout pro-more-collapsed'}>
              <RangeReadout controller={controller} fps={fps} />
            </div>
          )}
          {features.inOut && <MoreItem collapsed icon={<MarkInIcon />} label={t.setIn} shortcut="I" onSelect={controller.setIn} />}
          {features.inOut && <MoreItem collapsed icon={<MarkOutIcon />} label={t.setOut} shortcut="O" onSelect={controller.setOut} />}
          {features.loop && (
            <MoreItem
              collapsed
              icon={<LoopIcon />}
              label={looping ? t.loopOn : t.loop}
              shortcut="R"
              disabled={!hasRange}
              onSelect={controller.toggleLoop}
            />
          )}
          {features.loop && (
            <MoreItem
              className={'pro-more-below-xl'}
              icon={<PlayRangeIcon />}
              label={t.playRange}
              disabled={!hasRange}
              onSelect={controller.playRange}
            />
          )}
          {features.inOut && <MoreItem icon={<ClearRangeIcon />} label={t.clearRange} disabled={!hasRange} onSelect={controller.clearRange} />}
          {features.grabFrame && <MoreItem collapsed icon={<GrabFrameIcon />} label={t.grab} shortcut="G" onSelect={controller.grabFrame} />}
          {features.grabFrame && <MoreItem icon={<CopyImageIcon />} label={t.copyImage} onSelect={controller.copyFrameImage} />}
          {features.copyTimecodeLink && <MoreItem collapsed icon={<LinkIcon />} label={t.copyLink} onSelect={controller.copyLink} />}
          {features.posterFrame && <MoreItem collapsed icon={<PosterIcon />} label={t.poster} onSelect={controller.usePoster} />}
          {pip?.pictureInPictureAvailability === 'available' && (
            <MoreItem
              className={'pro-more-below-xl'}
              icon={<PipEnterIcon />}
              label={t.pictureInPicture}
              onSelect={() => {
                const request = pip.isPictureInPicture ? pip.exitPictureInPicture() : pip.requestPictureInPicture();
                request.catch(() => {});
              }}
            />
          )}
        </Menu.Content>
      </Menu.Popup>
    </Menu.Root>
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
    if (features.shotNav) list.push({ keys: ['[', ']'], label: t.help.cuts });
    if (features.grabFrame) list.push({ keys: ['G'], label: t.help.grab });
    return list;
  }, [features]);

  useEffect(() => {
    setExtraRows(rows);
    return () => setExtraRows([]);
  }, [rows, setExtraRows]);

  return null;
}
