# Landing page: a staged hero, six feature rows, and screenshots

Read first: `specs/PROJECT-OVERVIEW.md`, `NOTES.md` (the landing page and demo sections), `apps/preview/index.html`, `apps/preview/src/page/main.tsx`, `apps/preview/src/frame/media.ts`, `scripts/og-image.mjs`, this file.

Work on a new branch, `landing-visuals`, from `main`. The working tree is currently on `mobile-dock-rows` with uncommitted changes: do not commit, stash or discard them. Use a separate worktree (`git worktree add ../videojs-frameline-landing-visuals -b landing-visuals main`) and copy this spec file into it. The author merges after the report. Commit messages are written for public readers.

Deploy a **preview**, not production: the commands of `deploy:vercel` without `--prod`. The live site must not change until the branch is merged. If a preview deployment can't be made, stop and report; do not deploy to production.

Nothing under `src/` (the skin) changes in this work. If a requirement seems to need a skin change, stop and report it.

## Why

The page says "the player is the proof", but the proof and the claims are far apart. The player loads on the leader at `00:00:00:00` with no range and no guide, so a visitor sees none of the Studio tools before touching it. The feature rows start about 1,300 px below the player and are text only, so a visitor who scans never sees a range, a guide or a zoom. Review, one of the three host types, has no row at all.

Three parts, in this order. Report after each.

## 1. Stage the hero

A first-time visitor, in Studio, with no frame link in the URL, sees this before touching anything:

- **Range:** In `00:00:04:12`, Out `00:00:10:02`. At 24 fps these are frames 108 and 242. Keep them as frame numbers in `media.ts` beside the reel's other data (the staged state belongs to the source, not to the page) and convert to seconds there. Check that the In and Out handles report exactly these two timecodes.
- **Playhead:** paused inside the range on `00:00:06:00` (frame 144). Never autoplay.
- **Poster:** the reel's `posterTime` shows the same frame, so the picture does not jump when the stream is ready.
- **Guide:** Title safe on. If the skin restores a remembered set of guides for a returning visitor, the remembered set wins; report how this behaves.
- **Loop:** on (the Studio default).

Rules:

- A frame link in the hash (`#t=…`) wins: the page seeks there, paused, and still sets the range and the guide.
- Staging applies once, when the Studio player first has a handle. It is not re-applied after the visitor changes or clears the range, or after a tier switch back to Studio.
- Viewer has no range; opening the page with `?tier=viewer` stages nothing.
- Staging does not move focus, scroll the page, or write to the event log, and it produces no screen-reader announcements on load. If `setRange` or `setGuides` announce, report it; do not silence the skin.
- A source without staged data (`?media=plain` and the other variants) loads as it does today.

## 2. Feature rows

### Content

"What Studio checks" has six rows, in this order. Rows 1 to 4 and their tasks exist; change only what is listed.

| # | Keys | Claim (h3) | Task |
|---|---|---|---|
| 1 | `I` `O` | A range that plays only itself. | `range` (unchanged) |
| 2 | `,` `.` | One frame at a time, in timecode. | `step` (unchanged) |
| 3 | `S` | Point at an exact moment. | `review` (new) |
| 4 | `Shift` `V` | Guides for delivery. | `guides` (unchanged) |
| 5 | `Z` | Zoom that is true to the source. | `zoom` (unchanged) |
| 6 | `G` | A frame grab is the frame as encoded. | `grab` (unchanged) |

- Row 3 detail: "The host's markers show as pins on the ruler and in the Markers menu. S copies a link to the frame on screen, as timecode. Opening the link lands on that frame, paused."
- Row 3 task `review`: seek to the marker with id `hold` (read its time from the loaded markers, do not hard-code it), paused, and set the status line to "On the marker "Director: hold the pose two frames longer". Press S to copy a link to this frame." The task does not write to the clipboard. Button name: "Show me: go to a review marker".
- Row 6 replaces "The picture is never touched." Detail: "G saves the frame on screen as a PNG, at the video's own size and with no guides in it. Studio draws around the picture and never changes its pixels."
- The section lead becomes: "Six things other players leave out. Each one has a key, and each row does it in the player above."
- The keyboard and accessibility note stays last, unchanged.

Check every key and behaviour named above against `FEATURES.md` and the README before writing it. The repo wins; report any difference.

### Layout

Each feature row gains a figure. From 1100 px wide:

```
[ keys 120 ] [ claim                     ] [ figure 560 × 350 ]
             [ detail                    ]
             [ Show me                   ]
```

- Grid: `120px minmax(0, 1fr) 560px`, the existing row gap, text block aligned to the top of the figure.
- Under 1100 px: one column in this order: claim, detail, figure (full width, same 8:5 shape), then keys and Show me on one line.
- The figure: `border-radius` and hairline as the player's own frame, on the player's surround colour. No shadow, no caption inside the image.
- The note row has no figure and keeps its current layout.
- Use the tokens in `apps/preview/src/page/tokens.css`. Add a token only if a value is new, and name it in the report so the Figma variables can follow.

"Built to be hosted" gains one figure pair (shot 7 below) between the section heading and the two columns.

## 3. Screenshots

### The set

Seven shots. Each one is a crop of the detail its row claims, never a second whole player (shot 7 is the one exception).

| # | File name | Placed in | What it shows | Reel moment |
|---|---|---|---|---|
| 1 | `range` | Row 1 | The timeline and dock with the staged range: both handles, the band, the playhead inside it, Loop on | Staged state, `00:00:06:00` |
| 2 | `frame-step` | Row 2 | The burned-in timecode in the picture and the dock's timecode field in one crop, reading the same frame | The marker `flash`, after stepping to it |
| 3 | `markers` | Row 3 | The ruler with marker pins, the pin of `hold` hovered with its label and timecode showing, the link button beside the timecode | Marker `hold` |
| 4 | `guides` | Row 4 | The picture with the 9:16 crop mask and the TikTok zones, the "approximate" label visible | "Dancer on the street" |
| 5 | `zoom` | Row 5 | The picture at 400% with single pixels visible as squares, and the Zoom button reading 400% | "Sneaker color correction", on an edge with contrast |
| 6 | `grab-screen`, `grab-file` | Row 6 | A pair in one figure: the player with guides on, and the PNG that `G` saved from that frame, without guides | Same frame as shot 4 |
| 7 | `tier-viewer`, `tier-studio` | Host | A pair: the whole player in Viewer and in Studio on the same frame and at the same width | "Courier greenscreen comp" |

Stop conditions, report instead of shipping the shot:

- **Shot 2:** if the burned-in timecode and the skin's timecode differ on the captured frame, even by one frame, do not ship it. Report both readings on five frames across the reel. The poster at 3 s was seen showing `00:00:02:23`, so check this first.
- **Shot 5:** capture only when the best rendition is playing. If the skin's lower-rendition note is showing, wait or retry; do not crop it out.
- **Shot 6:** `grab-file` is the actual downloaded file, scaled to fit. Take its pixel size from the `onFrameGrab` event and use it in the caption.

### Capture

- A script, `scripts/landing-shots.mjs`, modelled on `scripts/og-image.mjs`, run against the built site (`npm run build && npm run preview`). Running it again regenerates every file. No hand cropping, no retouching, no compositing beyond placing a capture on the surround colour.
- Reach each state the way a user would: keys, clicks, hover, and `#t=` links on the monitor page (`preview.html`). If a state can't be reached that way, add a query-string hook to the monitor page only, and report it.
- Chromium, device scale factor 2, dark.
- **Legibility sets the crop:** every shot is a 700 × 437.5 CSS px region, exported at 1120 × 700, so text in the image is shown at 80% of its real size on the page. Shots 1, 2, 3 and 5 crop a 1280 px wide player. Shot 4 uses a 760 px wide player (the dock stays in its one-row arrangement) and crops the picture, centred. Shot 6 `grab-file` is the PNG fitted into the same region on the surround colour.
- Shot 7 is exempt from the fixed shape: the whole player at 760 px wide in each tier, exported at 2x, shown side by side from 900 px and stacked below. The two images differ in height; align their tops.
- Nothing baked in: no cursor, arrows, callouts, text labels, browser or device frame. No focus ring and no tooltip, except the marker's hover label in shot 3.
- Define a crop by an element's box plus padding, not by fixed page coordinates.

### Files and markup

- Output to `apps/preview/public/shots/`: AVIF and WebP for each shot. Encoding may add one dev dependency, pinned exactly; name it in the report. Target under 120 KB per file; report the real sizes, and say so if a shot needs more to stay sharp.
- `<figure>` with `<picture>`, AVIF first, WebP fallback. `width` and `height` set, `loading="lazy"`, `decoding="async"`. Nothing is preloaded: the player still loads first.
- Alt text states what is shown and the state it is in, from the real capture, for example: "The Studio timeline with a range from 00:00:04:12 to 00:00:10:02, the playhead inside it and Loop on."
- Pairs (shots 6 and 7) get visible captions in HTML under each image: "On screen" and "The saved PNG, <width> × <height>"; "Viewer" and "Studio".
- Build the figure so a short clip can replace the image later without a layout change: the box has a fixed aspect ratio, and the image is what a `<video poster>` would be. Do not add any video now.

## Unchanged

- The skin, its shortcuts, announcements and tokens.
- The hero's headline, the tier switch, the configurator, the three cue rows, "What Frameline won't do", the footer.
- The page's motion rule: nothing animates on load or on scroll.

## Verify (real screenshots, opened and looked at)

1. The page at 1440, 1100, 900 and 390 px wide: first screen, the feature rows, the host section. Save under `design/screenshots/landing-visuals/`.
2. The hero on first load: range handles reading `00:00:04:12` and `00:00:10:02`, playhead on `00:00:06:00`, Title safe drawn, paused, event log empty.
3. The hero opened with `#t=00:00:27:15`: on that frame, range and guide still staged.
4. `?tier=viewer` and `?media=plain`: nothing staged, no errors in the console.
5. Each of the nine image files opened at full size: sharp, no cursor, no stray tooltip, text readable.
6. All six Show me buttons and the three cue rows, in Studio and starting from Viewer.
7. `scripts/browser-checks/axe-audit.js` on the page: zero serious or critical violations. Heading order still h1, h2, h3.
8. No layout shift when the images load (the row height before and after an image loads is the same).
9. `npm run typecheck`, `npm test`, `npm run build`.

## Report

- The preview URL.
- For part 1: how a remembered guide set and the announcements behaved.
- For shot 2: the two timecode readings on five frames.
- A table of the image files with pixel size and bytes.
- Anything in this spec that the repo contradicts, and what you did.
- `NOTES.md` updated (decisions, Unverified). `FEATURES.md` updated only where "where to try it" changes.
