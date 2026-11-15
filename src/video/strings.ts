/**
 * Every string the skin itself adds, in one place so it can be translated.
 * Labels of the Video.js controls (Play, Mute, Settings, error messages and so on) are not here: they come from
 * Video.js's own i18n, which the host switches with its locale APIs.
 */
export const strings = {
  shortcutsTitle: 'Keyboard shortcuts',
  shortcutsMenuItem: 'Keyboard shortcuts',
  shortcutsClose: 'Close',
  shortcutsOr: 'or',
  pictureInPicture: 'Picture-in-picture',
  retry: 'Retry',
  transport: 'Transport',
  playback: 'Playback',
  shortcut: {
    playPause: 'Play or pause',
    mute: 'Mute or unmute',
    fullscreen: 'Fullscreen',
    captions: 'Captions on or off',
    seekShort: 'Seek 5 seconds',
    seekLong: 'Seek 10 seconds',
    volume: 'Volume up or down',
    percent: 'Jump to 0%–90%',
    startEnd: 'Go to start or end',
    speed: 'Slower or faster',
    help: 'Show this help',
  },
} as const;
