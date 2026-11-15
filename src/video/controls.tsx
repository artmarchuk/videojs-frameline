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

/**
 * The control bar. Two layouts, chosen by the bar's own width:
 *
 * - wide: one row. Play, volume, elapsed, seek bar, total, captions, settings, PiP, fullscreen.
 * - stacked (medium and narrow): the seek bar gets its own full-width row above the buttons, where it is far easier
 *   to hit than a short bar squeezed between buttons.
 *
 * The children are rendered in the order they appear, so the focus order always matches the visual order.
 */
export function VideoControls({
  renderThumbnail,
  toolbarStart,
  toolbarEnd,
  forceStacked = false,
  timelineSlot = false,
}: ThumbnailSlot & { toolbarStart?: ReactNode; toolbarEnd?: ReactNode; forceStacked?: boolean; timelineSlot?: boolean } = {}) {
  const bar = useRef<HTMLDivElement>(null);
  const narrow = useStacked(bar);
  // Pro tiers add too many controls for one row, so they always give the seek bar its own row.
  const stacked = forceStacked || narrow;

  return (
    <Controls.Root>
      <BufferingIndicator />
      <Controls.Content className={'pro-controls'}>
        <Tooltip.Provider>
          <CenterPlayButton />
          <div ref={bar} className={'pro-bar'} data-layout={stacked ? 'stacked' : 'wide'}>
            {/* Pro tiers put their ruler timeline here, in place of the seek bar. */}
            {timelineSlot ? <ProSlot name="timeline" /> : stacked && <TimeSlider renderThumbnail={renderThumbnail} />}
            <Controls.Group className={'pro-bar-row'}>
              <ProSlot name="transport-start" />
              <PlayButton />
              <ProSlot name="transport-end" />
              <Volume />
              <ProSlot name="time" />
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
              <ProSlot name="tools" />
              {toolbarEnd}
              <CaptionsToggle />
              <SettingsMenu />
              <PiPButton />
              <FullscreenButton />
            </Controls.Group>
          </div>
        </Tooltip.Provider>
      </Controls.Content>
    </Controls.Root>
  );
}
