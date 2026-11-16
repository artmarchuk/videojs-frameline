import type { KeyboardEvent as ReactKeyboardEvent } from 'react';

/**
 * `Space` on a focused slider plays and pauses, as it does anywhere else in the player.
 *
 * The Video.js hotkeys leave `Space` and `Enter` to a focused button, link or slider (`isInteractiveActivation` in
 * `@videojs/utils`; the Hotkey reference: "Space or Enter still activates focused buttons, links, and sliders
 * normally"), and there is no option to change that. A slider has no use for `Space`, so the key press is handed on to
 * the player's own hotkeys: the same key is dispatched on the player container, which is where they listen, and the
 * `Space` → `togglePaused` binding handles it with its own rules (held-key repeats ignored, its disabled state, the
 * input feedback). There is no second play and pause handler. Only a plain `Space`: with a modifier it is left alone.
 *
 * Returns whether the key was handed on, so the caller stops there.
 */
export function passSpaceToPlayer(event: KeyboardEvent | ReactKeyboardEvent): boolean {
  if (event.key !== ' ' || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return false;
  const slider = event.currentTarget;
  if (!(slider instanceof Element)) return false;
  const container = slider.closest('.media-container');
  if (!container || container === slider) return false;
  event.stopPropagation();
  const copy = new KeyboardEvent('keydown', { key: ' ', code: event.code, repeat: event.repeat, cancelable: true });
  // A handled hotkey prevents the copy's default; then the page must not scroll either.
  if (!container.dispatchEvent(copy)) event.preventDefault();
  return true;
}
