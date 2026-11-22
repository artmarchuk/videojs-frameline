> **Superseded (22 Nov 2026). Do not run this file.** Frame links have since shipped in the `#t=<seconds>&tc=<timecode>` format, so section 2's note on the link format is out of date, and the delivery steps predate the branch rules in `CLAUDE.md`. The work is split into two new specs, API 0.1 step A (names and public surface) and step B (library build and package). They reuse section 1 (naming rules) and section 2 (the rename map) from this file.

# Public API 0.1 and the npm package

Frameline becomes installable: `npm install <package>` and one import, with a public API whose names follow one rule. Nobody installs Frameline yet, so names change outright, with no aliases and no deprecation layer. The playback stats join the debug readout.

Read first: `specs/PROJECT-OVERVIEW.md`, `NOTES.md`, `FEATURES.md`, `README.md`, `src/pro/index.ts`, `src/pro/frameline-skin.tsx`, `src/pro/features.ts`, `src/pro/api.ts`.

The repo is public. Commit messages, code comments and docs describe the change for an outside reader.

---

## 1. Naming rules

These rules decide every public name, now and later. Put them in the README under "API conventions".

1. **One noun per concept, the same everywhere.** A feature has the same noun in its flag, its event, its `apiRef` method and its exported type.
2. **Flags are nouns** for the feature as the user sees it: `range`, `cuts`, `markers`, `zoom`.
3. **Events:** `on<Noun>Change` when state changed (`onRangeChange`), `on<Noun><Verb>` when the user did something (`onMarkerSelect`, `onFrameGrab`).
4. **`apiRef` methods are verbs:** `set<Noun>` for state, a plain verb for actions (`seek`, `step`, `pan`).
5. **Exported types start with `Frameline`**, so they never clash with DOM or app types (`Range`, `Marker`, `Layout`).
6. **Ids use US spelling and plain characters.** A user-facing label may differ from its id.
7. **The UI words stay the same.** "In" and "Out" on screen, "Range" in code.

## 2. Renames

| Now | After | Why |
| --- | --- | --- |
| flag `inOut` | `range` | `apiRef.setRange` already uses the noun |
| `onInOutChange` | `onRangeChange` | Rule 1 |
| type `InOutRange` | `FramelineRange` | Rules 1 and 5 |
| flag `shotNav` | `cuts` | The UI and the shortcut help say "previous / next cut" |
| flag `copyTimecodeLink` | `copyLink` | Matches `onCopyLink` |
| flag `platformZones` | `zones` | Matches the `zones` field of `setGuides` and `onGuidesChange` |
| guide id `centre` | `center` | Rule 6. The menu label may keep its current text |
| flag `debug` | removed; the `debug` prop and `?debug` stay | One switch, not two |
| `Marker`, `FrameInfo`, `CopyLinkInfo`, `FrameGrabInfo`, `EffectiveGuides`, `Tier`, `Layout`, `Density`, `GuideId`, `CropId`, `ZoneId`, `ZoomLevel`, `FeatureFlags`, `FeatureOverrides`, `TimeDisplay`, `LoopMode`, `FrameClockSource`, `FrameClockPrecision` | the same names with the `Frameline` prefix (`FramelineMarker`…) | Rule 5 |

Keep the names that already follow the rules: `tier`, `features`, `fps`, `startTimecode`, `dropFrame`, `markers`, `layout`, `density`, `slots` (`toolbarStart`, `toolbarEnd`, `overlay`), `persist`, `apiRef`, `onMarkerSelect`, `onFrameChange`, `onCopyLink`, `onGuidesChange`, `onZoomChange`, `onFrameGrab`, and the `apiRef` methods `seek`, `step`, `setRange`, `setLoop`, `setGuides`, `setZoom`, `pan`, `grabFrame`.

Rename them everywhere: source, tests, browser checks, the configurator page (its checkboxes, its URL parameters, its live snippet, its event log), `FEATURES.md`, the README. The configurator's URL parameters follow the new flag names. An old parameter is ignored.

Remembered choices: if the stored value under `frameline:v1` holds the id `centre`, read it as `center`. This is the only compatibility code.

**Out of scope for this change:** the format of links to a frame (`#t=HH:MM:SS:FF`). Keep it as it is. The README says it changes in 0.2.0 to `#t=<seconds>&tc=<timecode>`, and that links in today's format will keep opening.

## 3. What is public

- **The package entry exports only the public surface:** `FramelineSkin`, its props and slots types, `FramelineApi`, the event payload types, the id and level types, and the constants `TIERS` and `GUIDE_IDS`. `TIER_DEFAULTS`, `resolveFeatures` and `resolveLayout` stay internal; the configurator page imports them from source.
- **Public tokens:** the eight `--media-*` tokens Video.js defines, plus `--fl-surface-0` to `--fl-surface-3`, `--fl-text`, `--fl-text-dim`, `--fl-font-ui`, `--fl-radius` and `--fl-frame-border`. Every other `--fl-*` token is internal: the README says so, and the token file marks the public block with a comment.
- Every public prop, event, method and type has a doc comment, and the README lists them all.

## 4. Playback stats in the debug readout

The debug readout (`debug` prop or `?debug`) gains:

- dropped frames and total frames, from `HTMLVideoElement.getVideoPlaybackQuality()`;
- the measured frame rate over the last second, from the frame clock's callbacks, next to the `fps` the host passed.

Update them at most twice a second, through the existing selectors, without re-rendering the skin per frame. Where an engine lacks the API, show "—". The readout stays in its own lazy chunk; the Viewer tier never loads it. No new prop and no new event.

## 5. Two small fixes

- **Firefox tab stops:** in Firefox the media element adds two tab stops of its own. Set `tabindex="-1"` on it, if the player's keyboard shortcuts still work when focus is anywhere else in the player. Check the tab order in all three engines.
- **The rendition note in Firefox:** it lags because Video.js's active rendition stays at the old value after a manual quality switch. Base the note on the decoded picture, `videoHeight`, in every engine. Rerun `zoom-rendition-note` in all three engines.

## 6. The npm package

- **Name:** `videojs-frameline` if `npm view videojs-frameline` shows it is free, otherwise `@artmarchuk/videojs-frameline`. Report which.
- **Version** `0.1.0`. Remove `"private": true`. Fill in `description`, `repository`, `homepage`, `bugs`, `keywords`, `license`, `author` ("Artem Marchuk").
- **A library build** separate from the site build, for example a second Vite config in library mode. It outputs ESM and type declarations. `npm run build` keeps building the site; add `npm run build:lib`.
- **The pro code stays a separate lazy chunk in the package.** A host that imports the skin with `tier="viewer"` downloads no pro code. This is the main thing to verify.
- **Styles:** the host gets them without extra configuration, or with one documented import. The Viewer path must not load Studio CSS. Pick the approach that holds both, and say why in `NOTES.md`.
- **Peer dependencies:** `react`, `react-dom`, `@videojs/react`, `@videojs/core` and `@videojs/utils` (the skin now imports it directly), in ranges that cover the versions tested (today 10.4.0 for Video.js). Nothing else as a runtime dependency, unless the skin really imports it at runtime.
- **`exports`, `types`, `files`, `sideEffects`** (CSS files have side effects), so the package holds only the build output, README, LICENSE and CHANGELOG.
- **`CHANGELOG.md`** with a 0.1.0 entry: the first public release and its API.
- **Don't publish.** The maintainer runs `npm publish` with his own account. Stop at `npm pack` and list what the tarball holds.

## 7. README

- An **Install** section at the top: `npm install <package>`, the peer dependencies, and a minimal example that imports from the package name. No `@/` path anywhere in the README.
- An **API conventions** section: the rules from section 1.
- **Props, Events, Driving the player, Feature flags, Tokens:** brought in line with sections 2 and 3, as complete reference tables (name, type, default, description).
- A **Versioning** line: "0.x: a breaking change bumps the minor version and is listed in CHANGELOG.md."
- The note on the frame link format from section 2.

## Verification

- Typecheck, unit tests, build, `build:lib` and the contrast script pass. All browser checks pass in Chromium. Rerun the Firefox and WebKit checks if they exist in the repo.
- `grep` finds none of the old names in `src/`, `apps/`, `scripts/`, the README and `FEATURES.md`: `inOut`, `InOutRange`, `onInOutChange`, `shotNav`, `copyTimecodeLink`, `platformZones`, `'centre'`.
- **Consumer check:** `npm pack`, install the tarball into a new Vite + React app outside the repo (a temp folder), and render `FramelineSkin` once with `tier="viewer"` and once with `tier="studio"`. Typecheck it against the published types. In a browser, confirm:
  - the Viewer requests no pro chunk and no Studio CSS;
  - Studio loads and works;
  - the styles apply.
  Keep the script in `scripts/` so the check can be rerun.
- `?debug` shows the dropped frames and the measured fps in Chromium, Firefox and WebKit, or "—" where the API is missing.
- The live configurator works with the new flag names. Deploy to production and check https://frameline.artmarchuk.me.
- Screenshots, opened and looked at: the debug readout in Studio; the consumer app in both tiers.
- One commit per change, with messages that say what changed. Push `main`. No git tag; the maintainer tags `v0.1.0` after publishing.

## Report

1. The package name, the `npm pack` file list, and the tarball size.
2. One line per section, and any differences from this file.
3. Bundle sizes in the consumer app: the Viewer path, and Studio.
4. The final commit hash and the deployment URL.
5. The exact commands for the maintainer to publish and tag.
6. What you could not verify.
