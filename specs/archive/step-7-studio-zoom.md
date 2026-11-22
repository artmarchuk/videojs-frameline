# Step 7: Studio zoom, and the scope cut

Step 7 used to be "Studio image tools". It is now **zoom only**, plus two small rendition notes. Channels, exposure, gamma, the info readout and the "image adjusted" pill are dropped for good: they process or diagnose the image, which is a grading or monitoring engine's job, not a skin's. The rule for Studio is now:

> **Viewer is for watching. Studio is for checking timing and framing.** Studio adds controls and overlays around the picture; it never processes the picture.

Zoom fits that rule: it changes how closely you look, not what you see.

If the old `step-7-studio-image-tools.md` is in the repo, delete it.

Read first: `specs/PROJECT-OVERVIEW.md`, `NOTES.md` (the step 6–6d sections), this file, and the View menu code from step 6b (the `extra` slot under Platform zones).

Tag: `step-7-zoom`.

---

## Z1. Update the overview and the flags (do this first)

Edit `specs/PROJECT-OVERVIEW.md`:

- **Tiers:**
  - Anywhere it still says "three tiers", change it to two.
  - In the Studio row, replace "and (step 7) image inspection" with "and zoom to check detail".
  - Under the table, add the rule quoted above.
- **Customisation layers:** the View menu line becomes "show or hide the guides and zoom the developer allowed; guides are remembered per browser, zoom is not".
- **Feature list:**
  - Rename the "Image inspection" section to "Zoom".
  - Keep only "Zoom and pan, 100% pixel view [Studio] [Scope]".
  - Move channel view, gain/exposure, gamma, zebra/false colour, scopes, pixel probe and snapshot compare to a new line under **Out of scope**: "Image processing and analysis (channels, exposure, gamma, scopes, false colour): belongs to a grading or monitoring engine, not a player skin."
  - Make sure "Use frame as poster" is gone (step 6d removed it); if it is not, remove it.
  - In the guides section, drop "info HUD" from the "Region of interest" line, and keep the rest of that line as [Backlog].
- **Steps:**
  - Step 7 becomes "Studio zoom: Fit, 100%, 200%, pan, rendition notes".
  - Mark steps 6 (with 6c and 6d) as done.
- **Live site:**
  - Replace every mention of artoix.com with **artmarchuk.me**. The project lives on the author's product design portfolio, not the art site.
  - The Monday line reads: "the author polishes, embeds on artmarchuk.me and submits."

**Flags in code:**
- Remove `channels`, `gainGamma` and `infoHud` from the feature types, the defaults, `resolveFeatures`, tests, the preview page and the README.
- Keep `zoom`.
- If any code for the removed flags exists, delete it.

Commit this as its own group.

## Z2. Zoom

### Controls
- **View menu:** a new **Zoom** radio group in the `extra` slot under Platform zones: **Fit**, **100%**, **200%**. Keep reading order and the step 6c focus behaviour: opening the menu still focuses "Title safe".
- **Shortcuts:**
  - `Z` cycles Fit → 100% → 200% → Fit.
  - `Alt+arrows` pan while zoomed.
  - Check both against the existing map and the Video.js hotkeys. Report any conflict and propose another key; do not override.
  - Add them to the help dialog and the tooltips.
- **Flag:** `zoom`, on in Studio by default. The Viewer never loads it.
- **Not remembered:** zoom always starts at Fit. It is not persisted, unlike the guides.
- **Announcements:** "Zoom 100%", "Zoom 200%", "Zoom fit".

### The picture wrapper
- Put the `<video>` and the guides overlay inside one **picture wrapper**, and apply the zoom transform (`translate` + `scale`) to the wrapper. Guides then follow the picture with no re-measuring.
- The stage clips the overflow.
- The picture rectangle from step 6b keeps describing the unzoomed picture. The overlay is sized from it inside the wrapper, so the guides maths does not change.
- The Viewer's DOM and styles must not change. If the wrapper has to exist in both tiers, it must be inert in the Viewer, and the gate checks must still pass.

### Levels
- **Fit:** the current behaviour, no transform.
- **100%:** one video pixel per device pixel. Scale = (videoWidth / picture width in CSS px) / devicePixelRatio.
- **200%:** twice the 100% scale.
- If 100% is smaller than Fit (a small video on a large screen), apply it exactly anyway, so the label stays true.
- At 200% and above, set `image-rendering: pixelated` so pixels are visible. Leave the default rendering at Fit and 100%.
- Recompute on resize, `loadedmetadata`, `resize` of the media, and `fullscreenchange`.

### Pan
- **Default position:** on entering a level, centre on the picture's centre.
- **Pointer:** a drag on the picture pans while zoomed, with a grab cursor (grabbing while dragging). A drag longer than 3 px must not trigger click-to-play or double-click-to-fullscreen.
- **Touch:** a one-finger drag pans when zoomed. No pinch-zoom.
- **Keyboard:** Alt+arrows pan by 10% of the visible area.
- **Limits:** clamp the pan so the picture always covers the stage; no empty edges when the zoomed picture is larger than the stage.

### Unaffected
- **Grab frame** (G) and **Copy frame image** always capture the full, unzoomed frame at full resolution. Prove this with a browser check at 200% with a pan.
- **Copy link at timecode** is unaffected.

## Z3. Rendition notes

Adaptive streams (Mux HLS) may play a lower rendition than the source. A 100% check is then misleading, so make that visible in the two places that already exist. **Only if the installed Video.js (or its HLS engine) exposes the playing rendition's height.** Check the package; do not estimate from `videoHeight` alone unless you can show it reflects the playing rendition. If nothing reliable exists, skip Z3 and say so in the report.

- **Settings → Quality:** under Auto, show what is playing: "Auto · 1080p". Update it on rendition change.
- **Zoom:** while zoomed and the playing rendition's height is below the highest available rendition, show a quiet note next to the zoom level in the View menu item text and in the announcement, e.g. "100% · showing 540p". There is no on-picture badge.

## Verification

- Typecheck, unit tests and build pass.
- **Unit tests:** zoom scale at devicePixelRatio 1 and 2, the 100%-smaller-than-Fit case, pan clamping, the Z cycle, and the flag turning zoom off.
- **Browser checks** in `scripts/browser-checks/`:
  - a frame grabbed at 200% with a pan matches a frame grabbed at Fit;
  - the guides overlay's box transforms with the picture at 200%;
  - a 10 px drag does not change the paused state;
  - Alt+arrows stop at the picture's edges.
- **Viewer:** re-run the gate checks on the public URL. The Viewer still requests no pro chunk, and its DOM is unchanged.
- **Screenshots** in `design/screenshots/step-7/`, opened and looked at:
  - Fit, 100% and 200% with title safe and thirds on;
  - a panned 200%;
  - the View menu with the Zoom group at 1440 and 390;
  - Settings → Quality with the Auto label (if Z3 is done).
- **Commits:** one commit per group (Z1, Z2, Z3), with the attribution lines from your session instructions.
- **Deploy** and tag `step-7-zoom`.

## Report (short)

1. URL, screenshot folder, method.
2. One line per item, and any difference from this file and why.
3. Shortcut conflicts found and keys chosen.
4. Z3: whether the rendition height was available, from which API, or why it was skipped.
5. Bundle sizes before and after (Viewer path and Studio).
6. What remains unverified.

Do not start step 8.
