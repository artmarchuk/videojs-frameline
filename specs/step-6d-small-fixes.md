# Step 6d: Small fixes and one removal

Four short items from the review of step 6c. No new features. Do not start step 7.

Read first: `PROJECT-OVERVIEW.md`, `NOTES.md` (the step 6c section), `step-6c-fixes.md`.

---

## D1. Wider touch timeline: put the handle targets over the dock padding

On narrow and touch layouts, the timeline lost 17% of its width (270 px at 390, against 326 in the mockup) to the 29 px margins that keep the 44 px handle targets inside the player.

- Let each handle's touch target reach into the dock's own side padding (12–15 px), so the timeline margin only has to make up the rest. Aim for a timeline of about 300 px or more at 390.
- Every target stays at least 44×44 px and stays inside the player's box. No target may extend past the player's edge, where the page would receive the touches.
- The visible handle must still be fully drawn at 0 and at the end, never clipped.
- Nothing changes on desktop (12 px margin).

**Done when:** at 390 and 320 px with touch emulation, the timeline is wider than now, a handle at 0 and one at the end are each fully visible with a 44×44 target inside the player, and a drag starting on the padding moves the handle. Report the new widths.

## D2. Handle focus ring: the pointer mark must clear on keyboard use

The handle marks itself on a pointer press so the ring is hidden after a drag. The mark must not hide the ring from someone who then switches to the keyboard.

- Clear the mark on the next `keydown` while the handle has focus, and on `blur`.
- Sequence to check: click or drag a handle, then press an arrow key, and the ring appears and the handle moves one frame. Click a handle, Tab away, Shift+Tab back, and the ring shows.
- Add these sequences to the browser check scripts in `scripts/browser-checks/`.

**Done when:** both sequences pass in the browser script on the production build.

## D3. Fullscreen after the container change

Since step 6c the container is no longer a Tab stop, and fullscreen targets the container. Headless Chrome cannot enter real fullscreen, so check what you can in code and leave the rest to the hand test:

- Confirm against the installed Video.js package that its fullscreen request does not depend on the container being focusable or focused.
- Confirm that F works from any focused control and after a click on the picture, and that Escape leaving fullscreen does not leave focus on `body` (it should stay inside the player). If focus is lost, return it to the fullscreen button.
- List in the report what you checked in code and what remains for the hand test.

## D4. Remove "Use frame as poster" completely

Setting a poster or thumbnail is the host product's job, with real back-end work behind it; it is not a skin feature. Remove it everywhere, not just from the menu:

- The Capture menu item, its shortcut hint, its handler and any announcement.
- The `posterFrame` feature flag, the `onPosterFrame` (or similarly named) event and prop, and their types.
- Their tests, the preview page controls, README, NOTES.md and `PROJECT-OVERVIEW.md` (the feature list, the flags list and the Capture menu description).
- Any icon used only by it.

The Capture menu keeps Grab frame (G), Copy frame image and Copy link at timecode.

**Done when:** a search of the repo for `poster` finds only the native `<video poster>` attribute (if used) and nothing from this feature. Typecheck, tests and build pass.

---

## Verification, deploy, tag

- Typecheck, unit tests and build pass. Re-run the Viewer gate checks on the public URL. The Viewer still requests no pro chunk.
- Screenshots in `design/screenshots/step-6d/`: 390 and 320 px timelines with the handles at 0 and at the end, the Capture menu. Open them and look at them.
- One commit per item (D1–D4), with the attribution lines from your session instructions.
- Deploy and tag `step-6d-small-fixes`.

## Report (short)

1. URL and screenshot folder.
2. One line per item: done or not, and anything that differs from this file.
3. D1: the new timeline widths at 390 and 320.
4. D3: what was checked in code, what is left for the hand test.
5. D4: the files touched and the search result.
