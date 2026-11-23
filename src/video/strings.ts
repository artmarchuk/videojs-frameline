/**
 * Every string the skin itself adds, in one place so it can be translated.
 * Labels of the Video.js controls (Play, Mute, error messages and so on) are not here: they come from
 * Video.js's own i18n, which the host switches with its locale APIs.
 */
export const strings = {
  shortcutsTitle: 'Keyboard shortcuts',
  shortcutsMenuItem: 'Keyboard shortcuts',
  shortcutsClose: 'Close',
  shortcutsOr: 'or',
  /** The settings menu's button. Video.js has no text token for "More", so it is a skin string. */
  more: 'More',
  pictureInPicture: 'Picture-in-picture',
  mute: 'Mute',
  unmute: 'Unmute',
  retry: 'Retry',
  /** Announced when the pro code (the Studio tools) could not load and the player falls back to the Viewer. */
  proUnavailable: 'Studio tools could not load. The player works without them.',
  /** The settings menu's item for one more try. */
  proRetry: 'Retry loading Studio tools',
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
