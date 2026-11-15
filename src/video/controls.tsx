/** @jsxImportSource react */

import { Controls, Tooltip } from '@videojs/react';
import { useRef, type ReactNode } from 'react';

import { useStacked } from './hooks/use-stacked';
import { ProSlot } from './pro-slots';
import { CaptionsToggle } from './shared/captions-button';
import { CenterPlayButton, PlayButton } from './shared/play-button';
import { FullscreenButton, PiPButton } from './shared/screen-controls';
import { SettingsMenu } from './shared/settings-menu';
import { CurrentTime, DurationTime, TimeGroup } from './shared/time';
import { TimeSlider, type ThumbnailSlot } from './shared/time-slider';
import { BufferingIndicator } from './shared/video-feedback';
import { Volume } from './shared/volume';
import { strings } from './strings';

export interface VideoControlsProps extends ThumbnailSlot {
  toolbarStart?: ReactNode;
  toolbarEnd?: ReactNode;
  /** Pro tiers: the row is grouped (Transport, then host and pro slots, then Playback) and pro modules fill the slots. */
  pro?: boolean;
  /** Dock layout: the bar is a panel below the picture. It never hides, and there is no centre play button. */
  dock?: boolean;
}

/**
 * The control bar.
 *
 * Share, by the bar's own width:
 * - wide: one row. Play, volume, elapsed, seek bar, total, captions, settings, PiP, fullscreen.
 * - stacked (medium and narrow, and always in the dock): the seek bar gets its own full-width row above the buttons.
 *
 * Pro tiers: timeline row, then the main row (Transport, timecode, Tools, spacer, Playback), then the Tools tray.
 * Everything pro is portalled into the slots by lazily loaded modules; only the Share controls are rendered here.
 *
 * The children are rendered in the order they appear, so the focus order always matches the visual order.
 */
export function VideoControls({ renderThumbnail, toolbarStart, toolbarEnd, pro = false, dock = false }: VideoControlsProps = {}) {
  const bar = useRef<HTMLDivElement>(null);
  const narrow = useStacked(bar);
  const stacked = pro || dock || narrow;

  return (
    <Controls.Root visibility={dock ? 'always' : 'auto'}>
      {!dock && <BufferingIndicator />}
      <Controls.Content className={'pro-controls'}>
        <Tooltip.Provider>
          {!dock && <CenterPlayButton />}
          {/* `data-interactive` keeps the player's tap gestures off the dock: a click between buttons does nothing. */}
          <div ref={bar} className={'pro-bar'} data-layout={stacked ? 'stacked' : 'wide'} data-interactive={dock ? '' : undefined}>
            {pro ? <ProSlot name="timeline" /> : stacked && <TimeSlider renderThumbnail={renderThumbnail} />}
            <Controls.Group className={'pro-bar-row'}>
              {pro ? (
                <>
                  <ProSlot name="time-start" />
                  <div className={'pro-transport'} role="group" aria-label={strings.transport}>
                    <ProSlot name="transport-start" />
                    <PlayButton />
                    <ProSlot name="transport-end" />
                  </div>
                  <ProSlot name="time" />
                  {toolbarStart}
                  <span className={'pro-bar-break'} />
                  <ProSlot name="tools" />
                  {/* The tray follows its button in the focus order; the styles lay it out as a row of its own below. */}
                  <ProSlot name="tray" />
                  <span className={'pro-bar-spacer'} />
                  {toolbarEnd}
                  <div className={'pro-playback'} role="group" aria-label={strings.playback}>
                    <Volume />
                    <CaptionsToggle />
                    <SettingsMenu />
                    <PiPButton />
                    <FullscreenButton />
                  </div>
                </>
              ) : (
                <>
                  <PlayButton />
                  <Volume />
                  {toolbarStart}
                  {stacked ? (
                    <>
                      <TimeGroup />
                      <span className={'pro-bar-spacer'} />
                    </>
                  ) : (
                    <>
                      <CurrentTime />
                      <TimeSlider renderThumbnail={renderThumbnail} />
                      <DurationTime />
                    </>
                  )}
                  {toolbarEnd}
                  <CaptionsToggle />
                  <SettingsMenu />
                  <PiPButton />
                  <FullscreenButton />
                </>
              )}
            </Controls.Group>
          </div>
        </Tooltip.Provider>
      </Controls.Content>
    </Controls.Root>
  );
}
