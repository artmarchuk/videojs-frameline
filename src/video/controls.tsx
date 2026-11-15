/** @jsxImportSource react */

import { Controls, Tooltip } from '@videojs/react';
import type { ReactNode } from 'react';

import { ProSlot } from './pro-slots';
import { CaptionsToggle } from './shared/captions-button';
import { CenterPlayButton, PlayButton } from './shared/play-button';
import { FullscreenButton, PiPButton } from './shared/screen-controls';
import { SettingsMenu } from './shared/settings-menu';
import { TimeGroup } from './shared/time';
import { TimeSlider, type ThumbnailSlot } from './shared/time-slider';
import { BufferingIndicator } from './shared/video-feedback';
import { Volume } from './shared/volume';
import { strings } from './strings';

export interface VideoControlsProps extends ThumbnailSlot {
  toolbarStart?: ReactNode;
  toolbarEnd?: ReactNode;
  /** Studio controls: the timeline row and the three-column main row, whose slots the lazily loaded pro module fills. */
  pro?: boolean;
  /** Dock layout: the bar is a panel below the picture. It never hides, and there is no centre play button. */
  dock?: boolean;
}

/**
 * The control bar.
 *
 * Viewer: the seek bar on its own row, then Play, mute and volume, time, a spacer, captions, settings,
 * picture-in-picture, fullscreen.
 *
 * Studio (`pro`): the timeline row, then the main row in three columns, as on a professional monitor. Left: the
 * timecode. Centre: transport (cut and step either side of Play), Loop and Reset range. Right: the Markers, Capture
 * and Guides menus, then playback (captions, settings, mute and volume, fullscreen). Everything pro is portalled into
 * the slots by the lazily loaded module; only the Viewer controls are rendered here.
 *
 * The children are rendered in the order they appear, so the focus order always matches the visual order.
 */
export function VideoControls({ renderThumbnail, toolbarStart, toolbarEnd, pro = false, dock = false }: VideoControlsProps = {}) {
  return (
    <Controls.Root visibility={dock ? 'always' : 'auto'}>
      {!dock && <BufferingIndicator />}
      <Controls.Content className={'pro-controls'}>
        <Tooltip.Provider>
          {!dock && <CenterPlayButton />}
          {/* `data-interactive` keeps the player's tap gestures off the dock: a click between buttons does nothing. */}
          <div className={'pro-bar'} data-interactive={dock ? '' : undefined}>
            {pro ? <ProSlot name="timeline" /> : <TimeSlider renderThumbnail={renderThumbnail} />}
            {pro ? (
              <Controls.Group className={'pro-bar-row pro-main-row'}>
                <div className={'pro-main-left'}>
                  <ProSlot name="time" />
                  {toolbarStart}
                </div>
                <div className={'pro-main-centre'}>
                  <div className={'pro-transport'} role="group" aria-label={strings.transport}>
                    <ProSlot name="transport-start" />
                    <PlayButton />
                    <ProSlot name="transport-end" />
                  </div>
                  <ProSlot name="range" />
                </div>
                <div className={'pro-main-right'}>
                  <ProSlot name="range-narrow" />
                  <ProSlot name="tools" />
                  {toolbarEnd}
                  <span className={'pro-main-divider'} aria-hidden="true" />
                  <div className={'pro-playback'} role="group" aria-label={strings.playback}>
                    <CaptionsToggle />
                    <SettingsMenu />
                    <Volume />
                    <FullscreenButton />
                  </div>
                </div>
              </Controls.Group>
            ) : (
              <Controls.Group className={'pro-bar-row'}>
                <PlayButton />
                <Volume />
                {toolbarStart}
                <TimeGroup />
                <span className={'pro-bar-spacer'} />
                {toolbarEnd}
                <CaptionsToggle />
                <SettingsMenu />
                <PiPButton />
                <FullscreenButton />
              </Controls.Group>
            )}
          </div>
        </Tooltip.Provider>
      </Controls.Content>
    </Controls.Root>
  );
}
