# Step 7b: Split View into Guides and Zoom

The View menu grew too large once Zoom joined it. Split it into two controls, each with one job. No other new features. Do not start step 8.

Read first: `specs/PROJECT-OVERVIEW.md`, the step 7 section of `NOTES.md`, this file.

Tag: `step-7b-zoom-button`.

---

## G1. "View" becomes "Guides"

- **Rename everywhere:**
  - the button's label and tooltip ("Guides (Shift+V)");
  - the menu's accessible name;
  - announcements;
  - the help dialog;
  - README, NOTES and `specs/PROJECT-OVERVIEW.md`;
  - prop and event names where they say "view": `onViewChange` → `onGuidesChange`. Keep no alias: nothing has been published.
- **New icon:** a frame with an inset dashed frame inside it (the safe-area idea), drawn in the existing icon style (stroke width, corner radius, 20 px grid). Do not reuse the old View icon.
- **Badge:** the count of active guides stays on the button.
- **Menu contents** (unchanged apart from zoom): Safe areas, Composition, Crop, Platform zones, footer "Hide guides Shift+V". Remove the Zoom group and its help text from this menu.
- **Focus:** opening still focuses "Title safe". The reading-order check from step 6c must still pass.
- **`guides: false`:** the Guides button disappears entirely. It no longer stays just for Zoom.

## G2. Zoom button

### Placement and look
- In the main row, directly after Guides and before Captions.
- A small text button that shows the current level: **"Fit"**, **"100%"**, **"150%"**, **"200%"**, **"400%"**. Use tabular numerals, the same height as the icon buttons, and a fixed minimum width, so the row does not shift when the label changes (fit the widest label, "400%").
- Its accessible name is "Zoom, Fit" or "Zoom, 200%". The tooltip is "Zoom (Z)".
- While zoomed (not Fit), the button uses the existing toggled-on graphite style (`--pro-on`), not the accent.

### Menu
- It opens a small menu upward, a radio group in this order: **Fit, 100%, 150%, 200%, 400%**.
- Under the group, one line of help: "Drag the picture or press Shift+Alt and an arrow to move around. Grabbed frames are always the whole picture."
- The rendition note from step 7 moves here unchanged, e.g. "100% · showing 720p" on the selected item and in the announcement.

### Levels
- 100% keeps its step 7 definition (one video pixel per device pixel). 150%, 200% and 400% are multiples of it.
- `image-rendering: pixelated` applies from 200% up.
- A level smaller than Fit (possible for a small video, or at 100% on a high-density screen) still applies exactly, and the label stays true.

### Shortcuts
- `Z`: next level (Fit → 100% → 150% → 200% → 400% → Fit).
- `Shift+Z`: previous level.
- **Pan moves from Alt+arrows to Shift+Alt+arrows.** Alt+←/→ is the browser's Back/Forward on Windows and Linux and must not be taken over. Register pan only while zoomed, as now.
- Check Shift+Z and Shift+Alt+arrows for conflicts and report. Update the help dialog and tooltips.

### Flag
`zoom: false` removes the Zoom button and its shortcuts. Guides and Zoom are now fully independent.

## G3. Rendition while zoomed (try, report)

The HLS engine caps the rendition to the player's size, so at 100% a creator may be looking at upscaled pixels.

- **Check the installed package:** can `capRenditionToPlayerSize` (or its equivalent) be changed at runtime on a live source?
- **If yes:** while zoom is above Fit and Quality is Auto, lift the cap so the engine may choose a higher rendition by bandwidth; restore it at Fit. Do not force a specific rendition, and do not touch a quality the user picked by hand.
- **If no:** do nothing here. Step 8 will set the cap off on the demo source. Report it.
- Either way, the rendition note keeps telling the truth.

## Layout check

- The main row gains one text button. Measure the new one-row minimum and the two-row threshold.
- If they move from 1040 / 640, report the new numbers rather than dropping controls.
- On narrow and touch layouts, Zoom sits next to Guides in the menu-buttons row.
- Screenshots at 1440, 1040 (or the new threshold), 1024, 390 and 320.

## Verification

- Typecheck, unit tests and build pass.
- **Unit tests:** the level list and the Z / Shift+Z cycle, the multiples of 100%, and the flags (`guides: false` with zoom on, `zoom: false` with guides on).
- **Browser checks:**
  - update `zoom.js` for the new levels and Shift+Alt pan;
  - Alt+→ on the seek slider behaves as before step 7;
  - the Guides menu still focuses "Title safe".
- **Viewer:** gate checks on the public URL. The Viewer still requests no pro chunk, and its DOM is unchanged.
- **Screenshots** in `design/screenshots/step-7b/`:
  - the Guides menu;
  - the Zoom menu;
  - the Zoom button at each level;
  - the layout widths above.
  Open them and look at them.
- **Commits:** one commit per group (G1, G2, G3), with the attribution lines from your session instructions.
- **Deploy** and tag `step-7b-zoom-button`.

## Report (short)

1. URL, screenshot folder.
2. One line per item, and any differences from this file.
3. Shortcut conflicts and keys chosen.
4. G3: whether the cap can change at runtime, and what you did.
5. The new breakpoint numbers.
6. What remains unverified.
