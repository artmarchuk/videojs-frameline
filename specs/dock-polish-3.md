# Dock polish, last fixes: menu notes on top, Space after a ruler click

Read first: `specs/dock-polish-2.md`, the "Dock polish" section of `NOTES.md`, this file.
Work on the `dock-polish` branch and deploy from it. Commit messages are written for public readers.

## 1. Notes go to the top of a menu

Dock menus open upwards, above their button. Today a note (the Zoom menu's "Drag the picture or press Shift+Alt…") sits at the bottom, between the options and the button, so the pointer has to cross it.

- In every dock menu, an explanatory note (`.pro-menu-note` and anything like it) moves to the **top** of the popup, above the first option, with the separator **below** it instead of above.
- The options keep their order (Fit first). Don't reverse lists.
- Actions are not notes: a menu footer that does something (the Guides menu's hide-all and bring-back) stays where it is.
- A note that belongs to one option (the rendition note "showing 720p" on the chosen zoom level) stays on that option.
- The note's text and its role don't change. Screen readers should still reach it before the options; check the reading order in the accessibility tree.
- Applies wherever such a menu opens above its button, in the dock and on the narrow dock. If a menu can open downwards (overlay layout near the top edge), keep the note on top there too. One rule is simpler than two.

## 2. Space plays after clicking the ruler

After a click on the ruler, focus is on the seek slider, and `Space` does nothing (7 of 7 in the last report). `Space` is the key people press most in an editor, and clicking the ruler then pressing `Space` is the most common move.

- While the Studio timeline's slider (or a range handle) has focus, `Space` toggles play and pause, the same as anywhere else in the player. Do not use `Space` on these controls for anything else; a slider has no standard use for it (arrows, `Home`, `End`, `Page Up`, `Page Down` stay as they are).
- Do the same for the Viewer's seek bar, if it has the same gap.
- Use the existing hotkey mechanism; don't add a second key handler. Check the Video.js docs for how the hotkeys treat a focused slider before choosing the fix, and say what you found.
- Keep `K` working as it does.
- Check: click the ruler, press `Space`, and playback starts; press `Space` again and it pauses. Do it 10 times by hand, also with a range handle focused, and in the Viewer.
- Add `Space` to the browser check that covers the keyboard, if one fits.

## Verify and report

- Screenshots, opened and looked at: the Zoom, Guides, Capture and Markers menus open on the wide dock, and the Zoom menu on the narrow dock.
- Typecheck, unit tests, build, the browser checks.
- Update `FEATURES.md` and `NOTES.md` (remove the Space item from the Backlog).
- Deploy from `dock-polish`. Report the URL and anything that differs from this file, with the reason.
