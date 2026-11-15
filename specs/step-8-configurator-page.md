# Step 8: Configurator page, demo media, features doc, public repo

Step 8 builds the submission page and everything a judge touches around the player. The submission URL is the site root (`/`); `preview.html` stays as the developer page.

Read first: `specs/PROJECT-OVERVIEW.md`, the step 7 and 7b sections of `NOTES.md`, this file.

Tag: `step-8-configurator`. Do not start step 9. Items run in this order: 8.R, then 8.0–8.6.

---

## 8.R Rename: Video.js PRO becomes Frameline (do this first)

The skin gets its own name. "Frameline" comes from the framing guides in a camera viewfinder. The display form is **"Frameline — a Video.js skin for video creators"**. "PRO" read like an official paid edition of Video.js, so it goes everywhere.

- **Package and repo:** `name` in `package.json` becomes `videojs-frameline`.
- **Public component:** `ProSkin` becomes `FramelineSkin`, with no alias, since nothing has been published. Update every import, test, snippet and doc.
- **User-facing text:** page title, header, README, `FEATURES.md`, NOTES and `specs/PROJECT-OVERVIEW.md`. The tiers keep their names, Viewer and Studio.
- **CSS tokens:** rename `--pro-*` to `--fl-*` only if it is a mechanical rename that typecheck, tests and the contrast script all pass afterwards. Otherwise keep `--pro-*` and say so in the report.
- **Data attributes, file and folder names, internal identifiers** (`src/pro/…`, `data-pro-*`): leave them unless the rename is trivial. Internal names are not public.
- Search the repo for "Video.js PRO", "VideoJS PRO" and "PRO" as a product name, and report what is left.

## 8.0 Carry-over: 100% means the source

Today 100% is computed from the decoded `videoWidth` of the playing rendition, so the scale jumps when a higher rendition arrives mid-zoom.

- Redefine 100% as one pixel of the **highest available rendition** per device pixel. Take its width and height from the rendition list (`videoRenditionList` or the engine's equivalent). For a non-adaptive source, use `videoWidth`.
- 150%, 200% and 400% stay multiples of it.
- The scale must not change when the playing rendition changes. A lower rendition is simply upscaled, and the "showing 720p" note explains it.
- Update the unit tests and `zoom-rendition-cap.js`. The check: zoom to 100%, force a rendition switch, and the scale and pan stay the same.

## 8.1 Demo media in one place

- Create `src/demo/media.ts` (or the repo's equivalent) with one entry per source:
  - URL or Mux playback ID;
  - fps;
  - captions file, chapters file, markers file;
  - poster image;
  - `capRenditionToPlayerSize: false`.
- The current test stream stays as the active entry. Add a second entry, `reel`, with:
  - a placeholder playback ID, `REEL_PLAYBACK_ID`;
  - `fps: 24`;
  - placeholder files in `public/demo/reel/` (`captions.vtt`, `chapters.vtt`, `markers.json`), each holding two or three sample cues so the code paths run.
- Switching the active source is a one-line change. Document it in the README. The author will send the real playback ID and files later tonight.
- fps always comes from the source entry, never from a hard-coded number in the page.

## 8.2 The configurator page (`/`)

Build it with plain HTML and CSS around the player, in the same repo and on the same deploy. No new UI framework.

### Structure, in reading order
1. **Header:** "Frameline", subtitle "A Video.js skin for video creators", and links to Source (github.com/<author>/videojs-frameline; leave the link as a placeholder until the author gives the URL), Features (8.4) and the author's site (artmarchuk.me).
2. **Player:** up to 1280 px wide on desktop, so the full single row and the centred transport show. Full width on smaller screens.
3. **Configure** panel below the player:
   - **Tier:** a segmented control, Viewer / Studio.
   - **Features:** grouped checkboxes for every public flag (Transport: timecode, frameStep, loop, shotNav; Range: inOut, markers; Capture: grabFrame, copyTimecodeLink; Guides: guides, platformZones; Zoom: zoom). Defaults follow the chosen tier. Turning a pro flag on over Viewer is allowed and shows the feature added to Viewer.
   - **Layout:** Dock / Overlay.
   - Every change applies live to the player.
4. **Code:** a read-only snippet of the current configuration as JSX, e.g. `<FramelineSkin tier="studio" fps={24} features={{ zoom: false }} />`, with a Copy button. It lists only the props that differ from the tier's defaults.
5. **Event log:** the last 20 events from the player's public events (In/Out change, guides change, marker select, frame grab, copy link, zoom change, if each exists as an event). Each line shows the event name, its payload in short, and the player timecode. It has a Clear button. The log is not a live region. Its heading says it is there for developers.
6. **Try this:** six short tasks, each with a "Show me" button that drives the player through its public API (seek, set guides, set a range). The button must not take over the keyboard. The tasks:
   - Frame-step to the exact frame: press `,` and `.`.
   - Set a range with I and O, or drag the handles, then loop it with R.
   - Turn on 9:16 and TikTok zones.
   - Check title safe.
   - Zoom to 200% and pan.
   - Grab a frame with G.
   Write the copy so it stays true with the placeholder stream. The author will adjust timings to the reel.
7. **About:** placeholder text the author will replace:
   - a three-sentence pitch;
   - the line "Dark by design: a neutral dark surround keeps judgements of exposure and contrast honest.";
   - "By Art Marchuk · artmarchuk.me";
   - "Apache 2.0".

### Page behaviour
- **URL state:** the configuration is mirrored in the query string (`?tier=studio&zoom=0…`), so a judge can share a setup. On load, the query wins over the defaults. Use `history.replaceState`, never a page reload.
- **Theme:** the page follows the OS light or dark setting (`prefers-color-scheme`). The player stays dark in both. Use a calm neutral page palette that sits well with the player's graphite. The player's accent blue may appear on the page only for links and focus.
- **Accessibility:**
  - landmarks (`header`, `main`, `footer`) and a proper heading order;
  - every control labelled, with a visible focus ring;
  - contrast checked in both themes (extend `scripts/contrast.mjs`);
  - works at 320 px;
  - the segmented control is a radio group;
  - the checkboxes are real checkboxes.
- **Meta:**
  - a page title;
  - a description;
  - `og:image` and `twitter:image`, a 1200×630 screenshot of Studio with a range and guides on, generated by a script into `public/`;
  - a favicon drawn from the skin's icon style.

## 8.3 Verify the open items in the features list

The author's feature list was written from your reports. Check each of these in the code and report the answer:
1. The exact public event names and their payloads.
2. The captions shortcut (is it C?).
3. Which touch gestures the Viewer supports.
4. What `[` and `]` do: previous/next cut, previous/next marker, or both.
5. Whether a `density` prop exists and is public.
6. Whether slots (`toolbar-start`, `toolbar-end`, `overlay`) exist. If not, say so; do not add them now.

## 8.4 `FEATURES.md`

Write `FEATURES.md` in the repo root from the code, not from memory.

- **Headings:** Principles; Tiers and configuration; Viewer; Studio: transport; Studio: timeline and range; Studio: capture; Studio: guides; Studio: zoom; Responsive and touch; Accessibility; Performance; Out of scope.
- **Columns:** Feature | Tier | How to try (shortcut or place) | Since (tag).
- **Out of scope:** list image processing and analysis, setting a poster or thumbnail, and an OS-driven light theme, each with its one-line reason.
- Link it from the README and the page header.
- From now on, every step updates it.

## 8.5 README for developers

Make sure the README covers:
- what it is;
- install and run;
- a minimal usage snippet for each tier;
- the props table;
- the flags table;
- the events table;
- the public tokens (`--media-*`, `--pro-*`);
- keyboard shortcuts (or a link to the help dialog's list);
- browser support as tested so far;
- how to switch the demo source;
- the licence.

Add a `LICENSE` file with the Apache 2.0 text if it is missing.

## 8.6 Public GitHub repo (only if the author says yes in the prompt)

- If the author's prompt says to publish: use `gh` (check `gh auth status` first) to create a **public** repo named `videojs-frameline` under the authenticated account, add it as `origin`, and push the main branch and all tags.
- Check that no secrets, `.env` files or large binaries are committed.
- Set the repo description to "A Video.js v10 skin for video creators: Viewer and Studio tiers." and the homepage to the Vercel URL.
- If the prompt does not say yes, or `gh` is not authenticated, do nothing here and say so.

## Verification

- Typecheck, unit tests and build pass.
- Re-run the Viewer gate checks on the public URL, now on `/` with the Viewer tier selected, and on `preview.html`. The Viewer still requests no pro chunk.
- Browser checks for the page:
  - switching tier changes the player and the snippet;
  - a flag checkbox changes both;
  - the query string round-trips;
  - each "Show me" button does what it says;
  - the event log receives a range change and a frame grab.
- Screenshots in `design/screenshots/step-8/`, opened and looked at:
  - the full page at 1440 in light and dark;
  - 1024, 390 and 320;
  - the event log with entries;
  - the `og:image`.
- One commit per item (8.R, 8.0–8.6), with the attribution lines from your session instructions.
- Deploy and tag `step-8-configurator` (push the tag too if 8.6 ran).

## Report (short)

1. URLs (page, preview, repo if created), screenshot folder.
2. One line per item, and any differences.
3. 8.3: the six answers.
4. Bundle sizes; the page's own JS and CSS separately.
5. What remains unverified.
