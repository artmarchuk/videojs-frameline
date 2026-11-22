# Landing page visuals, round three: a headline scale, clean crops, no black rows

Read first: `specs/landing-visuals-2.md`, the landing section of `NOTES.md`, `apps/preview/src/page/tokens.css`, `scripts/landing-shots.mjs`, this file.

Continue on `landing-visuals` in its worktree. Deploy a preview; the author merges. Nothing under `src/` changes.

## 1. Headline scale

Round two made the H1 smaller from 1200 px (56 px) but left it at 72 px from 760 to 1199 px, so a narrower window got a bigger headline. Rule from now on: **no hero value is larger on a narrower screen.**

| Token | Phone (< 760) | Desktop (760–1199) | Wide (≥ 1200) |
|---|---|---|---|
| `--size-h1` | 32 | 44 | 56 |
| `--layout-hero-top` | 16 | 24 | 24 |
| `--layout-hero-text-gap` | 8 | 12 | 12 |
| `--layout-hero-gap` | 20 | 24 | 24 |

- Set the Desktop values in `:root`; Wide then only overrides `--size-h1`. Drop the other Wide overrides that become equal to Desktop.
- The H1 is at most two lines at 390 and 760 px, and one line from 1100 px. Report the line count at 390, 760, 900, 1100 and 1200 px.
- The Figma variables already have these values, in a new **Wide** mode of the "Frameline page layout" and "Frameline page type" collections; `size/player-min`, `size/dock` and `size/figure` are now in Figma too. Update the header comment in `tokens.css` to name the three modes.

## 2. Crops that cut no control

In the zoom shot the crop's left edge cuts the Play button in half; the frame-step shot cuts the next-cut button at its right edge.

- Rule for every shot that shows the dock: **no button, field or menu chevron is cut by the crop's edge.** The ruler, the track and the picture may run off the edge.
- Move the region, never resize it: shift it left or right to the nearest position where every control inside it is whole. Keep each shot's own condition (zoom: the burned-in timecode in the picture and the Zoom button reading 400%; range: both handles and Loop).
- Add the check to the script: after choosing a region, it fails if any dock control's box crosses the region's left or right edge.

## 3. No black rows, and the range shot follows the hero

- The reel's picture is 1920 × 1072 inside a 1920 × 1080 file. The landing page's hero already covers those 4 black rows top and bottom. Check that the monitor page (`preview.html`), where the shots are taken, does the same. If it doesn't, apply the same shaping there from `media.ts` (page code only), then re-shoot.
- The hero now opens on `00:00:03:18` with the range `00:00:03:02` to `00:00:07:10`. The range shot must show the hero's state: have the script read the staged frame and range from `media.ts` instead of its own `AT` values, and update the range shot's alt text.
- `grab-file` stays exactly the PNG the skin saves, rows included: that is the frame as encoded. Mention it in the report if the rows show next to the covered "On screen" image.

Regenerate all nine files.

## Verify (real screenshots, opened and looked at)

1. The hero at 390, 760, 900, 1100, 1200 and 1440 px wide: the H1 never gets bigger as the window gets narrower. Save under `design/screenshots/landing-visuals-3/`.
2. Each image at full size: no control cut at an edge, no black rows (except in `grab-file`), new icons.
3. The range shot reads `00:00:03:18` between `00:00:03:02` and `00:00:07:10`.
4. Axe audit, no layout shift, typecheck, tests, build.

## Report

The preview URL, the H1 line counts, a table of the nine files (pixels, bytes), and anything the repo contradicted.
