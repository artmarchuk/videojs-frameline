# Frameline skin for Video.js

The skin's name is **Frameline** (display form: "Frameline — a Video.js skin for video creators"). Live: https://frameline.artmarchuk.me. Repo: https://github.com/artmarchuk/videojs-frameline (Apache 2.0). Author: Artem Marchuk.

Read this file at the start of every step, together with `NOTES.md` (the current state) and that step's spec in `specs/`. It gives the big picture so that each step's decisions fit the whole. It describes where the project is going; `FEATURES.md` describes what exists today.

## North star

**Frameline is a player skin for video creators.** It is a tool for people who make video, not a prettier consumer player. It is for the tools people make video with: web editors, AI video generators, review and approval platforms.

**Test for every decision** (feature, layout, copy, colour, demo content): does it help someone make, check, review or deliver a video? If it only helps someone watch, it belongs in the Viewer tier or it is cut.

## The product

One skin, two tiers. A developer building a video tool picks a tier and switches single features on or off.

| Tier | For | What it is |
| --- | --- | --- |
| **Viewer** | The creator's client or audience; how work leaves the tool | A clean player with overlay controls on the picture: play/pause, seek bar, time, volume, captions, settings, fullscreen. Ships no pro code |
| **Studio** | The creator making, checking and reviewing video | A preview monitor: controls in a dock **below** the picture, a compact ruler timeline with In/Out handles, frame-accurate transport, timecode, markers, guides and crop masks, frame grab, copy link to a frame, and zoom to check detail |

> **Viewer is for watching. Studio is for checking timing and framing.** Studio adds controls and overlays around the picture; it never processes the picture.

### Customisation layers (coarse to fine)

1. **Tier**: `tier="viewer" | "studio"` sets the default bundle and layout.
2. **Feature flags**: override single features over a tier (`features={{ zoom: false }}`).
3. **End-user choices**: the Guides menu and the Zoom button; guides are remembered per browser, zoom is not.
4. **Slots, events and a handle**: the host adds its own controls (`slots`), listens through callback props, and drives Studio from its own UI through `apiRef`.
5. **Tokens**: the public `--media-*` tokens plus the skin's `--fl-*` tokens, and `density`.

Only enabled modules load. The exact names of flags, events and types are in the README; they change once, in the API 0.1 step (see Roadmap).

## Principles

1. **Around the picture, never on it.** Studio adds controls and overlays; it never processes the picture (no channels, exposure, gamma, scopes, blending).
2. **Dark by design.** The player and the page around it are dark; neutral greys (R = G = B) keep judgements of colour and exposure honest.
3. **Keyboard first.** Every action works from the keyboard, is announced, and is listed in the help dialog.
4. **Pay for what you use.** The Viewer ships no pro code; Studio code and CSS load only when a feature needs them.
5. **Host data, skin draws.** Markers, chapters and the link a host wants shared come from the host; the skin shows them and fires events. It stores nothing of the host's.

## Look

Calm and device-like: neutral dark surfaces (true greys; the dock is a dark matte body `#171717`, the timecode display and the timeline groove darker still at `#0C0C0C`). Three kinds of control in the dock: raised keys (the transport as one keybed of butted tiles, and Loop), one recessed display (the timecode and its link), and flat toolbar buttons for the rest. The system UI typeface (no webfont, no monospace) with tabular numerals for every changing number. One soft blue accent (`#5B9DFF`) **reserved** for signals: set In/Out handles, the focus ring, a selected marker, and the light of a mode that is on in the dock. The range band is one neutral grey band. Play is a neutral filled button, the playhead is white. In Studio the controls live in a dock below the picture, never over it, also in fullscreen; the Viewer keeps an overlay. Guides are white at reduced opacity with a dark outline so they read over any footage. Treat the look as a creator's tool, not a media-site player. The values live in `src/styles/tokens.css`; `NOTES.md` records why.

## Hard rules

1. **Never invent Video.js APIs.** Check names, props, CSS variables and file paths against the installed package and the official docs. The installed version wins over blog posts and old docs.
2. **Video.js v10 only** (`@videojs/react`, `@videojs/html`), never v8. Pin versions exactly in the repo; peer ranges cover only tested versions.
3. **Browser floor:** Chrome and Edge 111, Firefox 121, Safari and iOS 16.4. Nothing beyond it without a fallback.
4. **Accessibility:** WCAG 2.2 AA. Targets at least 24 px (44 px on touch); text contrast 4.5:1; UI and focus 3:1; visible focus; reduced motion respected; overlays are `aria-hidden` and `pointer-events: none`, and toggling them is announced.
5. **Frame accuracy is best effort.** Read `mediaTime` from `requestVideoFrameCallback`; say so in the UI and docs where it matters. Never claim guaranteed frame accuracy or true reverse playback.
6. **Unverified is a valid answer.** Say what you could not check; list it in `NOTES.md` under "Unverified".
7. **Every step ends deployed:** a preview for a branch; production once it is merged into `main` and the author asks. `CLAUDE.md` has the branch and deploy rules.
8. **Build only what the step spec asks.** Ideas go into the report under "Backlog proposals"; the author keeps the backlog outside the repo.
9. **The embed page is in use.** `artmarchuk.me` embeds `/embed.html` in an iframe. Any change that touches `apps/preview/embed.html`, `apps/preview/src/embed/` or anything the embed loads is checked inside a cross-origin iframe (playback, fullscreen, Copy link) and called out in the report.

## Out of scope, by decision

- Image processing and analysis: channels, exposure, gamma, scopes, false colour. That belongs to a grading or monitoring engine, not a player skin.
- Difference and onion-skin compare (they blend pixels).
- Using a frame as the host's poster or thumbnail (Grab frame gives the host the image).
- A light theme, for the player or the page.

## Status (22 Nov 2026)

- Submitted to the Video.js Skins Design Challenge on 17 Nov 2026. **The winners are announced on 24 Nov 2026.** Until then, production keeps what the judges may have bookmarked: the configurator's URL parameters, the demo media and its Mux playback ID. Work that changes them stays on a preview.
- In production: both tiers, the Studio dock, ruler timeline and range, frame-accurate transport, markers and cuts, guides and platform zones, Grab frame, Copy link (`#t=<seconds>&tc=<timecode>`), zoom, the configurator landing page, the embed page. `FEATURES.md` has the full list.
- The npm package `videojs-frameline` 0.1.0 is built and checked in a separate host app (`npm run check:consumer`), not yet published. The Viewer loads 4.1% more JS and CSS (gzip) than the stock Video.js skin.
- CI on GitHub Actions since 24 Nov: typecheck, tests, builds, the consumer check and the browser checks (Chromium) on every pull request and push to `main`.

## Roadmap

**Now: engineering foundation**
1. Docs and repo clean-up (this overview, the `NOTES.md` split, archived step specs).
2. API 0.1, step A: one naming rule for flags, events, methods and types; the public surface; playback stats in the debug readout; two Firefox fixes. Preview only until the winners are announced.
3. API 0.1, step B: a library build (ESM and types) that keeps Studio JS and CSS out of the Viewer path, checked in a separate consumer app; the Viewer's weight measured against the stock Video.js skin.
4. Before publishing: dependency ranges, CI on GitHub Actions, CSS isolation from the host page.
5. Publish `0.1.0` on npm.

**Next: product**
- Copy link and Grab frame inside an embed: what a shared link should point to, and how the host supplies it.
- Go to a timecode by typing it into the timecode field.
- Range links (`#t=<In>,<Out>&tc=<In>,<Out>`), and the Viewer opening frame links.

**Later** is decided case by case, on evidence from real hosts: the package grows when someone builds on it.

## Where things are

- `src/`: the skin. `src/video/skin.tsx` is the entry point; `src/pro/` holds the Studio tier.
- `apps/preview/`: the site (landing page with the configurator, `/preview.html` monitor page, `/embed.html`, the CLI's workbench).
- `FEATURES.md`: every feature and where to try it.
- `NOTES.md`: the current state: versions, URLs, architecture, decisions, how to run the checks, what is unverified. `docs/history/` holds the full step-by-step build log.
- `specs/`: current specs. `specs/archive/` holds the specs of finished steps.
- `scripts/browser-checks/`: Playwright checks, run in Chromium, Firefox and WebKit.
