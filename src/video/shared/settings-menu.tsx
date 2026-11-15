/** @jsxImportSource react */
import { audioText, captionsText, qualityText, settingsText, speedText } from '@videojs/core/i18n/text/menu';
import { Text as TextPrimitive } from '@videojs/react';
import { Menu, selectPiP, selectVolume, usePlayer } from '@videojs/react';
import { AudioTrackRadioGroup } from '@videojs/react/ui/audio-track-radio-group';
import { CaptionsRadioGroup } from '@videojs/react/ui/captions-radio-group';
import { PlaybackRateRadioGroup } from '@videojs/react/ui/playback-rate-radio-group';
import { QualityRadioGroup } from '@videojs/react/ui/quality-radio-group';

import { cn } from '@/lib/resolve-class-name';

import {
  AudioTrackIcon,
  CaptionsOffIcon,
  ChevronIcon,
  KeyboardIcon,
  PipEnterIcon,
  QualityIcon,
  SettingsIcon,
  SpeedIcon,
  VolumeHighIcon,
  VolumeMutedIcon,
} from '../icons';
import { useProSettingsItems } from '../pro-slots';
import { strings } from '../strings';
import { Button } from './button';
import { RadioItem } from './menu-item';
import { useShortcutsDialog } from './shortcuts-dialog';
import { ButtonTooltip } from './tooltip';

function MenuChevron({ back = false }: { back?: boolean } = {}) {
  return <ChevronIcon className={cn('media-menu-icon', back ? 'media-menu-back-chevron' : 'media-menu-forward-chevron')} />;
}

function QualityMenu() {
  return (
    <Menu.Root>
      <QualityRadioGroup.Root>
        <Menu.Trigger className={'media-menu-item'}>
          <QualityIcon className={'media-menu-icon'} />
          <TextPrimitive token={qualityText.key}>{qualityText.text}</TextPrimitive>
          <span className={'media-menu-hint'}>
            <QualityRadioGroup.Value className={'media-menu-hint-label'} />
            <MenuChevron />
          </span>
        </Menu.Trigger>
        <Menu.Content className={'media-menu-content'}>
          <Menu.Item className={'media-menu-item media-menu-back-item'}>
            <MenuChevron back />
            <TextPrimitive token={qualityText.key}>{qualityText.text}</TextPrimitive>
          </Menu.Item>
          <Menu.Separator className={'media-menu-separator'} />
          <QualityRadioGroup.Options
            className={'media-menu-radio-group'}
            renderItem={(props, item) => (
              <RadioItem {...props}>
                <span>
                  <span>{item.label}</span>
                  {item.tier ? <sup className={'media-menu-tier'}>{item.tier}</sup> : null}
                </span>
                {item.badge ? <span className={'media-menu-badge'}>{item.badge}</span> : null}
              </RadioItem>
            )}
          ></QualityRadioGroup.Options>
        </Menu.Content>
      </QualityRadioGroup.Root>
    </Menu.Root>
  );
}

function AudioTrackMenu() {
  return (
    <Menu.Root>
      <AudioTrackRadioGroup.Root>
        <Menu.Trigger className={'media-menu-item'}>
          <AudioTrackIcon className={'media-menu-icon'} />
          <TextPrimitive token={audioText.key}>{audioText.text}</TextPrimitive>
          <span className={'media-menu-hint'}>
            <AudioTrackRadioGroup.Value className={'media-menu-hint-label'} />
            <MenuChevron />
          </span>
        </Menu.Trigger>
        <Menu.Content className={'media-menu-content'}>
          <Menu.Item className={'media-menu-item media-menu-back-item'}>
            <MenuChevron back />
            <TextPrimitive token={audioText.key}>{audioText.text}</TextPrimitive>
          </Menu.Item>
          <Menu.Separator className={'media-menu-separator'} />
          <AudioTrackRadioGroup.Options
            className={'media-menu-radio-group'}
            renderItem={(props, item) => (
              <RadioItem {...props}>
                <span>{item.label}</span>
              </RadioItem>
            )}
          ></AudioTrackRadioGroup.Options>
        </Menu.Content>
      </AudioTrackRadioGroup.Root>
    </Menu.Root>
  );
}

function PlaybackRateMenu() {
  return (
    <Menu.Root>
      <PlaybackRateRadioGroup.Root>
        <Menu.Trigger className={'media-menu-item'}>
          <SpeedIcon className={'media-menu-icon'} />
          <TextPrimitive token={speedText.key}>{speedText.text}</TextPrimitive>
          <span className={'media-menu-hint'}>
            <PlaybackRateRadioGroup.Value className={'media-menu-hint-label'} />
            <MenuChevron />
          </span>
        </Menu.Trigger>
        <Menu.Content className={'media-menu-content'}>
          <Menu.Item className={'media-menu-item media-menu-back-item'}>
            <MenuChevron back />
            <TextPrimitive token={speedText.key}>{speedText.text}</TextPrimitive>
          </Menu.Item>
          <Menu.Separator className={'media-menu-separator'} />
          <PlaybackRateRadioGroup.Options
            className={'media-menu-radio-group'}
            renderItem={(props, item) => (
              <RadioItem {...props}>
                <span>{item.label}</span>
              </RadioItem>
            )}
          ></PlaybackRateRadioGroup.Options>
        </Menu.Content>
      </PlaybackRateRadioGroup.Root>
    </Menu.Root>
  );
}

function CaptionsMenu() {
  return (
    <Menu.Root>
      <CaptionsRadioGroup.Root>
        <Menu.Trigger className={'media-menu-item'}>
          <CaptionsOffIcon className={'media-menu-icon'} />
          <TextPrimitive token={captionsText.key}>{captionsText.text}</TextPrimitive>
          <span className={'media-menu-hint'}>
            <CaptionsRadioGroup.Value className={'media-menu-hint-label'} />
            <MenuChevron />
          </span>
        </Menu.Trigger>
        <Menu.Content className={'media-menu-content'}>
          <Menu.Item className={'media-menu-item media-menu-back-item'}>
            <MenuChevron back />
            <TextPrimitive token={captionsText.key}>{captionsText.text}</TextPrimitive>
          </Menu.Item>
          <Menu.Separator className={'media-menu-separator'} />
          <CaptionsRadioGroup.Options
            className={'media-menu-radio-group'}
            renderItem={(props, item) => (
              <RadioItem {...props}>
                <span>{item.label}</span>
                {item.badge ? <span className={'media-menu-badge'}>{item.badge}</span> : null}
              </RadioItem>
            )}
          ></CaptionsRadioGroup.Options>
        </Menu.Content>
      </CaptionsRadioGroup.Root>
    </Menu.Root>
  );
}

/** Mute as a menu item. CSS shows it only where the mute button is hidden: the narrow Studio dock. */
function MuteMenuItem() {
  const volume = usePlayer(selectVolume);
  if (!volume || volume.mutedAvailability !== 'available') return null;

  return (
    <Menu.Item className={'media-menu-item pro-menu-item-dock-narrow'} onSelect={() => volume.setMuted(!volume.muted)}>
      {volume.muted ? <VolumeMutedIcon className={'media-menu-icon'} /> : <VolumeHighIcon className={'media-menu-icon'} />}
      <span>{volume.muted ? strings.unmute : strings.mute}</span>
      <span className={'media-menu-hint'}>
        <kbd className={'pro-kbd'}>M</kbd>
      </span>
    </Menu.Item>
  );
}

/** Picture-in-picture as a menu item. CSS shows it only where the PiP button is hidden. */
function PiPMenuItem() {
  const pip = usePlayer(selectPiP);
  if (!pip || pip.pictureInPictureAvailability !== 'available') return null;

  return (
    <Menu.Item
      className={'media-menu-item pro-menu-item-narrow'}
      onSelect={() => {
        const request = pip.isPictureInPicture ? pip.exitPictureInPicture() : pip.requestPictureInPicture();
        request.catch(() => {});
      }}
    >
      <PipEnterIcon className={'media-menu-icon'} />
      <span>{strings.pictureInPicture}</span>
    </Menu.Item>
  );
}

export function SettingsMenu() {
  const shortcuts = useShortcutsDialog();
  const proItems = useProSettingsItems();

  return (
    <Menu.Root side="top" align="end">
      <ButtonTooltip label={<TextPrimitive token={settingsText.key}>{settingsText.text}</TextPrimitive>}>
        <Menu.Trigger render={<Button />} className={'media-settings-button'}>
          <SettingsIcon className={'media-button-icon'} />
          <TextPrimitive className={'media-settings-button-label'} token={settingsText.key}>
            {settingsText.text}
          </TextPrimitive>
        </Menu.Trigger>
      </ButtonTooltip>
      <Menu.Popup keepMounted className={cn('media-popup', 'media-menu-popup')}>
        <Menu.Content className={'media-menu-content'}>
          <PlaybackRateMenu />
          <QualityMenu />
          <CaptionsMenu />
          <AudioTrackMenu />
          <MuteMenuItem />
          {proItems}
          <PiPMenuItem />
          <Menu.Item className={'media-menu-item'} onSelect={() => shortcuts.setOpen(true)}>
            <KeyboardIcon className={'media-menu-icon'} />
            <span>{strings.shortcutsMenuItem}</span>
            <span className={'media-menu-hint'}>
              <kbd className={'pro-kbd'}>?</kbd>
            </span>
          </Menu.Item>
        </Menu.Content>
      </Menu.Popup>
    </Menu.Root>
  );
}
