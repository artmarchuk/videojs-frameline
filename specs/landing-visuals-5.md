# Landing page, round five: a Studio-first hero, Configure as a quiet row

Read first: `specs/landing-visuals-4.md` and its report in `NOTES.md`, `apps/preview/index.html`, `landing.css`, `tokens.css`, `main.tsx`, this file.

Continue on `landing-visuals` in its worktree. Deploy a preview; the author merges. Page code only: nothing under `src/` changes, and the screenshots are not re-shot.

## Why

The hero sells Studio; Viewer is the by-product, and the two tiers are already shown side by side in "Built to be hosted". So the hero drops the tier switch and the two tier lines, and says what Studio does in the line under the headline.

## 1. Hero copy and spacing

- The line under the H1 (`.descriptor`) becomes: **"A Video.js skin for checking timing and framing, in the tools people make video with."**
- Remove the two lines "Viewer is for watching." and "Studio is for checking timing and framing." (`.two-lines`) and their styles.
- New spacing (the Figma variables already have these values):

| Token | Phone (< 760) | Desktop (760–1199) | Wide (≥ 1200) |
|---|---|---|---|
| `--layout-hero-top` | 24 | 40 | 40 |
| `--layout-hero-text-gap` | 12 | 16 | 16 |
| `--layout-hero-gap` | 24 | 32 | 32 |

- Update the hero's player-width formula for the removed lines. Report the player top and dock bottom at 1440 × 900 and 1920 × 1080.
- The descriptor wraps to at most two lines at 390 px and stays on one line from 1100 px. Report its line count at 390, 760, 1100 and 1440.

## 2. No tier switch under the player

- Remove the hero's Viewer / Studio switch and its hint. The tier is chosen only in Configure.
- The hint text moves into Configure, as the hint under its Tier switch, still changing with the tier ("Studio: the controls sit in a dock below the picture, never over it." / "Viewer: the controls sit over the picture.").
- Keep `holdInPlace` for the Tier and Layout radios in Configure: a tier or layout change still moves the panel.

## 3. Configure as one quiet row

Under the player, one row (the gap above it stays `--space-24`):

- **Left:** the summary ("Studio · Dock · 11 of 11 features on"), dim, as a status line. It stays the button's accessible description.
- **Right:** the "Configure the player" button, styled as a page control: outlined (1 px `--control` border, no fill, no raised or pressed key look), text and chevron in the text colour, 44 px tall. It must not look like a dock key.
- Under 760 px: the summary on line one, the button on line two, full width.
- The panel stays closed by default and opens below the row, full width, as now.

## 4. The player's corner

Round four set the skin's `--media-border-radius` to 8 px on this page so the shadow could follow the box. The page should show the skin as it ships: remove that override, and make the page's wrapper follow the skin's own 10 px corner instead (Figma `radius/player` is 10). Keep `--media-border-color: transparent`.

## Unchanged

The rim and shadow values, the reserved dock height and its check, the feature rows, the screenshots, Configure's contents (apart from the moved hint).

## Verify (real screenshots, opened and looked at)

1. The hero at 1920 × 1080, 1440 × 900, 1100, 760 and 390 px. Save under `design/screenshots/landing-visuals-5/`.
2. The Configure row closed and open, at 1440 and 390 px; the player's corner with its rim and shadow at 1440 (one corner, one radius).
3. A tier change and a layout change from Configure: the radio's position before and after.
4. Layout shift on first load at 390, 760, 1100 and 1440: still under 0.01.
5. Axe audit (zero serious or critical), heading order, typecheck, tests, build, the landing check.

## Report

The preview URL, the player top and dock bottom, the descriptor line counts, the layout-shift table, anything the repo contradicted.
