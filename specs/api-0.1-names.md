# API 0.1, step A: public names, the link API, debug stats

The first half of making Frameline installable: every public name follows one rule, the host can decide what Copy link copies, and the public surface is marked. Step B (a separate spec) adds the library build and the npm package. Nobody installs Frameline yet, so names change outright, with no aliases in the skin.

Read first: `CLAUDE.md`, `specs/PROJECT-OVERVIEW.md`, `NOTES.md`, `FEATURES.md`, `README.md`, and sections 1 to 5 of `specs/public-api-and-package.md`. That file is superseded as a whole, but this spec uses its sections 1 to 5, with the changes below.

The repo is public: commit messages, comments and docs are written for an outside reader.

## Delivery: preview only, no merge yet

Work on a new branch, `api-names`, in your own folder. **Don't merge into `main` until the author says so**, and deploy previews only (`npm run preview:vercel`). The Video.js challenge results are announced on 24 Nov 2026. Other sessions deploy production from `main`, so a merge would reach the live site before then.

---

## 0. Docs follow-up (first commit)

Small fixes left over from the docs clean-up. Comments and docs only, no behaviour change:

1. Four comments point at `NOTES.md` for content that now lives in `docs/history/NOTES-2026-11.md`: in `src/pro/studio/guides/platform-zones.ts`, `src/styles/tokens.css`, `src/video/skin.css` and `scripts/contrast.mjs`. Point them at the right file and section.
2. `FEATURES.md` says "The Viewer bar becomes two rows under 640 px". Check it against the code and correct whichever text is stale (FEATURES or `NOTES.md`).
3. `CLAUDE.md`, "What this is": the last sentence still describes a contest entry. Replace it with: "It started as an entry in the Video.js Skins Design Challenge (submitted 17 Nov 2026) and continues as a side project."
4. `CLAUDE.md` rule 6 ("do not rewrite another session's" lines) contradicts the rule at the top of `NOTES.md` ("replace any line its change makes untrue"). Reword rule 6 so that both say the same: a session may replace a line its own change makes untrue, whoever wrote it; it leaves every other session's lines alone, and never commits another session's uncommitted change.
5. Move `specs/docs-and-repo-cleanup.md` to `specs/archive/`.
6. `specs/PROJECT-OVERVIEW.md`, principle 5: replace "Markers, comments, peaks and links come from the host" with "Markers, chapters and the link a host wants shared come from the host".
7. `NOTES.md`, "URLs and deploys": add that https://artmarchuk.me/videojs-frameline-skin.html (linked from the home page) embeds `/embed.html?tier=studio&fps=24&mux=…`. Fetch that page's raw HTML (`curl`) and record the iframe's `allow` attribute word for word. If it lacks `clipboard-write`, say so in the report: Copy link and Copy frame image fail there, and the author fixes his own page.

## 1. Names

Apply the naming rules (old spec, section 1) and the rename map (old spec, section 2) as written, with these changes:

- **The paragraph headed "Out of scope for this change"** in section 2 no longer applies: links are already `#t=<seconds>&tc=<timecode>`. Don't add the "changes in 0.2.0" note to the README.
- **New names** from section 2 of this spec: `linkUrl`, `FramelineLinkUrl`, `FramelineLinkPosition`. `CopyLinkInfo` becomes `FramelineCopyLinkInfo`, and gains a `timecode` field (section 2.3).
- **The configurator's URL parameters follow the new flag names.** On the site only (not in the skin), an old parameter name is also read as its new name: `inOut`, `shotNav`, `copyTimecodeLink` and `platformZones`. These URLs were shared with the challenge's judges and on social posts, and they must keep working. The site writes only the new names. That's about ten lines in `apps/preview/src/page/`, with a unit test.
- **Remembered choices:** as in the old spec, a stored `centre` reads as `center`.

## 2. The link API: `linkUrl`

The host owns the link. One prop covers every case.

### 2.1 The prop

```ts
type FramelineLinkUrl = string | ((position: FramelineLinkPosition) => string | null);
linkUrl?: FramelineLinkUrl;
```

- **Not given** (default): the same as today. The current page's URL (origin, path and query) plus the position in the hash, keeping the page's other hash keys (`withLinkPosition`).
- **A string**: the base URL to share. The position goes into its hash the same way, keeping the base's own hash keys. The string is resolved against the page (`new URL(value, location.href)`), so a relative path works. If it isn't a valid URL, the skin uses the default and gives one development warning.
- **A function**: called with the position when the user copies. Its return value is:
  - **a string**: the full URL, copied as it is (the host builds the whole link, for example for a hash router);
  - **`null`**: the host handled it, for example by opening its own share dialog. The skin copies nothing, announces nothing, shows no check on the link button, and doesn't fire `onCopyLink`.
  - If the function throws, or returns anything else, the skin copies nothing, announces the copy failure the way it does for a refused clipboard, and gives a development warning.
- **The function is synchronous.** A clipboard write must happen within the user's gesture, and Safari refuses one that arrives after an `await`. Say so in its doc comment.

### 2.2 `FramelineLinkPosition`

What the function receives. The format is ours; hosts shouldn't rebuild it.

| Field | Type | Holds |
| --- | --- | --- |
| `fragment` | `string` | The finished pair without `#`: `t=62.104&tc=00:01:02:02`. A host appends it to its own hash (`#${fragment}`, or `&${fragment}` after its own keys) |
| `frame` | `number` | The frame index from 0 |
| `time` | `number` | The frame's start time in seconds, as in `onFrameChange` |
| `timecode` | `string` | The timecode on screen (start offset and drop-frame applied) |

`fragment` comes from the same function that builds today's links (`formatLinkPosition`), so the two can never disagree. A unit test asserts that the default URL equals the page URL plus `#` plus `fragment`.

### 2.3 `onCopyLink`

It fires only when the skin itself copied a link. Its payload, `FramelineCopyLinkInfo`, is `{ url, frame, time, timecode }`.

### 2.4 Announcements

When the skin copies, nothing changes: the button's check, or the toast with the timecode. When the host takes over (`null`), the skin is silent. The README says, in the `linkUrl` section: "When your function returns `null`, Frameline announces nothing. Your own control must tell the user what it did, for example by opening a dialog that takes focus, or through a live region."

### 2.5 The embed page

`/embed.html` passes no `linkUrl`. It copies its own URL with its query (which names the media and the tier) plus the position. That is the agreed behaviour (option (a)), with no change in code. **Test it explicitly in a cross-origin iframe:**

1. A test page on one origin (for example the production build served on `localhost:4173`) holds an iframe of `/embed.html?tier=studio&fps=24&mux=<the reel's playback ID>` from another origin (for example `127.0.0.1:4174`), with `allow="fullscreen; clipboard-write"`. A small HTML file under `scripts/browser-checks/fixtures/` is enough.
2. Step three frames inside the iframe, press `S`, and read the clipboard (Chromium).
3. The copied URL is the **embed** URL. Its query is unchanged (same `mux`, `tier` and `fps`), and its hash is the frame.
4. Open that URL in a new tab: the same video, paused on the same frame.
5. The same iframe without `clipboard-write`: Copy link fails, and the failure is announced. Record which engines refuse.

Save this as a browser check, `embed-link.js`, and run it in all three engines (WebKit and Firefox as far as their clipboard allows, as `dock-polish.js` already handles). This is also the embed check that hard rule 8 asks for: playback, fullscreen (stubbed, as in `fullscreen-focus.js`) and Copy link.

### 2.6 Backlog proposals, not built

Option (c), a postMessage handshake so a page that embeds the iframe can supply its own link, waits until a real host asks. Don't build it.

## 3. Public surface, stats and fixes

Apply the old spec's section 3 (what is public), section 4 (playback stats in the debug readout) and section 5 (Firefox tab stops; the rendition note from `videoHeight`), with one change. Section 3's "package entry" is `src/pro/index.ts` in this step: it exports only the public surface, and the site imports `TIER_DEFAULTS`, `resolveFeatures` and `resolveLayout` from their source files. The package build itself is step B.

For section 5's rendition note: after the change, rerun `zoom-rendition-note.js` in all three engines. The note has also lagged in Chromium since 19 Nov; report whether basing it on `videoHeight` fixes that too.

## 4. Copy link over the Viewer: report only

Product decision: Copy link stays off in the Viewer by default, and a host can turn it on (`copyLink: true` over `tier="viewer"`). Every action needs a visible control with its shortcut, so we need to know what happens today. Reading the code, the flag switches the whole bar to the Studio bar (`proBar` in `frameline-skin.tsx`), which replaces the Viewer's seek bar with the ruler-timeline slot.

**Don't change it.** Report, with screenshots that you open and look at (1440 and 390 px, overlay layout):
- the bar with the flag on, next to the plain Viewer;
- whether a visible link control exists, and where;
- whether `S` works and is listed in the help dialog.

The product preference is an item in the Viewer's Settings menu, with no change to the bar. The UX & UI chat decides the details. It will be its own small step.

## 5. README

- **API conventions:** section 1 of the old spec, as a short list.
- **Props, Events, Driving the player, Feature flags, Tokens:** complete reference tables (name, type, default, description) with the new names.
- **Links:** the existing link section, plus `linkUrl` (2.1), `FramelineLinkPosition` (2.2), the announcement rule (2.4), and the embed behaviour (2.5): an embedded player copies its own embed URL, and a page that embeds it needs `allow="clipboard-write"`.
- No Install section yet: that comes with the package in step B.

## Verification

- Typecheck, unit tests, build and the contrast script pass. New unit tests cover `linkUrl` (default, string, relative string, invalid string, function returning a string, `null`, throwing, returning a non-string), `fragment` against the default URL, the old configurator parameters, and the stored `centre`.
- `git grep` finds none of the old names in `src/`, `apps/`, `scripts/`, `README.md` and `FEATURES.md`: `inOut`, `InOutRange`, `onInOutChange`, `shotNav`, `copyTimecodeLink`, `platformZones`, `'centre'`, `CopyLinkInfo`. The exceptions are the configurator's mapping of old parameters and the stored-value migration, each with a comment.
- Every browser check passes in Chromium on the preview build; the Firefox and WebKit runs match the known failures in `NOTES.md`, and anything new is reported. That includes the new `embed-link.js`.
- **The embed (hard rule 8):** `embed-link.js` passes, and the report says so.
- `?debug` shows dropped frames and the measured fps in all three engines, or "—" where an API is missing. Screenshot it.
- The configurator: an old URL such as `/?tier=studio&inOut=0&shotNav=0` opens with the range and cuts off, and the address bar then shows the new names.
- Update `FEATURES.md` and `NOTES.md` (the affected sections and one Log line).
- Deploy a preview. No merge, no production deploy (see Delivery).

## Report

1. One line per section (0 to 5), and anything that differs from this spec, with the reason.
2. The `allow` attribute on artmarchuk.me (0.7).
3. The `embed-link.js` results per engine (2.5).
4. The Viewer with Copy link on (section 4): the screenshots and your answers.
5. Whether the rendition note's Chromium lag is fixed.
6. The branch's last commit and the preview URL.
7. What you could not verify, and backlog proposals.
