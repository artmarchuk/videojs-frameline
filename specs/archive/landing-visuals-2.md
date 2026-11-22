# Landing page visuals, round two: new icons, three better shots, a compact hero

Read first: `specs/landing-visuals.md` and its section in `NOTES.md`, `scripts/landing-shots.mjs`, `apps/preview/src/page/landing.css`, `apps/preview/src/page/tokens.css`, this file.

Continue on the branch `landing-visuals`, in its worktree (`../videojs-frameline-landing-visuals`). Deploy a **preview**, not production, as last time. The author merges after the report. Nothing under `src/` (the skin) changes. Commit messages are written for public readers.

## Why

The review of round one found four things. Six of the nine images show the player's old icons, which are now replaced on `main`. The zoom shot reads as a blurred blob, not as pixels. Rows 4 and 6 show the same frame with the same guides, and in row 6 the two images are too small to show what differs between them. And on a 1440 × 900 screen the first view ends inside the picture, so the staged range and the dock are not seen without scrolling.

## 0. Rebase

Rebase `landing-visuals` onto `main`. `main` now has the new icons, the narrow dock rows and the tooltip changes. Resolve conflicts in favour of `main` for anything under `src/`, and keep both sides' entries in `NOTES.md` and `FEATURES.md`. The branch has not been pushed, so a rebase is safe. Run typecheck, tests and the build before going on.

## 1. A compact hero

The hero stays centred. Two changes:

**Tighter type and spacing** (desktop only, 1200 px wide and up; the narrow layout is unchanged):

| What | Now | New |
|---|---|---|
| H1 size (`--size-h1`) | 72 px | 56 px |
| Space above the H1 (`.positioning` top padding) | 48 px | 24 px |
| Gap inside `.positioning` | 20 px | 12 px |
| Gap between `.positioning` and the player block (`--layout-hero-gap`) | 48 px | 32 px |

Keep the H1 on one line at 1200 px. Line height and tracking stay.

**The player's width follows the screen's height** (from 1200 px wide):

- Width = the height left on the first screen for the picture, times the picture's aspect (the reel's picture, 1920 × 1072, as `media.ts` already knows), within these limits: **at least 1100 px**, so the dock always keeps its full one-row layout, and at most the wrap's width (1280 px).
- "The height left" is the viewport height (`100svh`) minus everything above the player and the dock's own height, with a 16 px margin below the dock. Measure the dock in the browser; do not guess it.
- The player stays centred; the tier bar and Configure keep its width.

Targets to measure and report, in the staged state:

| Viewport | Player top | Player width | Dock bottom | Whole dock on screen? |
|---|---|---|---|---|
| 1440 × 900 | ≤ 320 px | 1100 | about 1,050 | no (accepted) |
| 1536 × 864 | | | | |
| 1920 × 1080 | | | ≤ 1064 | yes |
| 1440 × 1200 | | 1280 | | yes |

If any target can't be met without changing the skin, stop and report.

New or changed token values are named in the report so the Figma variables can follow.

## 2. Screenshots

Change three shots and the row 6 layout, then **regenerate all nine files** with `scripts/landing-shots.mjs`, so every shot shows the new icons.

### Shot 5, zoom

- Zoom to 400% on the **burned-in timecode** in the picture, panned so two or three of its digits fill the picture area of the crop. Use a frame where the burn-in is steady (the staged frame `00:00:06:00` works).
- Pan the way a user would (drag, or `Shift` `Alt` with the arrows).
- The Zoom button reading 400% stays in the crop, as now.
- Pass condition, checked by eye in the exported file: the edges of the digits show as square steps, 4 × 4 device pixels each. If they don't, report with the file; do not sharpen or rescale.

### Shot 4, guides

- A different moment and guide set from row 6: the **2.39:1 crop and rule of thirds**, nothing else, on the "Snow peak" section (start around `00:00:49:12`; pick the frame where the peak sits best against the thirds, and name it in the report). If Snow peak doesn't work with the crop, use "Courier greenscreen comp" and say why.
- Capture as now: the whole picture on a 760 px player, the Guides menu closed.
- The row's alt text names the crop and the guide.

### Shot 6, frame grab

- "On screen": the same dancer frame (`00:00:21:08`) with **Title safe, thirds and centre** on and no zones. Thirds and the centre cross draw as solid lines, which survive being shown small.
- "The saved PNG": unchanged, the file `G` actually saves.
- Both exported at 1120 × 700, like the other row shots.

### Row 6 layout

From 1100 px wide, row 6 places its pair **under the text**, not in the figure column: the pair starts at the claim column's left edge and ends at the row's right edge, two figures side by side with the row gap between them. Each figure is then about the same size as the other rows' figures. Captions stay under each image. Under 1100 px the pair stacks, as now.

## Also

- `NOTES.md`: "Seeked to 6 seconds" on load is accepted for now; it stays under Unverified with what was read and what was not heard.
- One line in the report on the duration: the shots read `of 00:00:56:01`, the live page read `00:00:56:02` this morning. Which is right, and why do they differ? Don't change anything for it.
- The Guides menu cut off on a 760 px player is not part of this work.

## Verify (real screenshots, opened and looked at)

1. The hero at the four viewports in the table, staged state, first screen only. Save under `design/screenshots/landing-visuals-2/`.
2. The hero at 1100, 900 and 390 px wide: unchanged from round one, apart from the new icons.
3. Each of the nine image files at full size: the new icons in all six that show the dock or the Viewer controls; no cursor or stray tooltip. Shot 5's squares checked by eye.
4. "What Studio checks" at 1440, 1100 and 390 px, with row 6's pair in its new place.
5. No layout shift when images load. The axe audit: zero serious or critical. Typecheck, tests, build.

## Report

- The preview URL.
- The hero table filled in, and the token changes.
- A table of the nine files: pixels and bytes.
- The frame used for shot 4, and what shot 5's squares look like.
- The duration line.
- Anything in this spec that the repo contradicts, and what you did.
