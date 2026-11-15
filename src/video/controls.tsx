/** @jsxImportSource react */

import { Controls, Tooltip } from '@videojs/react';
import { useRef } from 'react';

import { useStacked } from './hooks/use-stacked';
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
export function VideoControls({ renderThumbnail }: ThumbnailSlot = {}) {
  const bar = useRef<HTMLDivElement>(null);
  const stacked = useStacked(bar);

  return (
    <Controls.Root>
      <BufferingIndicator />
      <Controls.Content className={'pro-controls'}>
        <Tooltip.Provider>
          <CenterPlayButton />
          <div ref={bar} className={'pro-bar'} data-layout={stacked ? 'stacked' : 'wide'}>
            {stacked && <TimeSlider renderThumbnail={renderThumbnail} />}
            <Controls.Group className={'pro-bar-row'}>
              <PlayButton />
              <Volume />
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
