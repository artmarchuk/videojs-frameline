# Frameline skin for Video.js

The skin's name is **Frameline** (display form: "Frameline — a Video.js skin for video creators").

Read this file at the start of every step, together with `NOTES.md` and that step's requirements file. It gives the big picture so that each step's decisions fit the whole.

## North star

**Frameline is a player skin for video creators.** It is a tool for people who make video, not a prettier consumer player. The author is Artem Marchuk, UX and product designer for tools that let people create and build things, and this project must read as exactly that.

## The product

One skin, two tiers. A developer building a video tool picks a tier and switches single features on or off.

| Tier | For | What it is |
| --- | --- | --- |
| **Viewer** | The creator's client or audience; how work leaves the tool | A clean player with overlay controls on the picture: play/pause, seek bar, time, volume/mute, captions, settings, fullscreen. Ships no pro code |
| **Studio** | The creator making, checking and reviewing video | A professional monitor: controls in a dock **below** the picture, a compact ruler timeline with draggable In/Out handles, frame-accurate transport, timecode, markers, guides and crop masks, frame grab, and zoom to check detail |

> **Viewer is for watching. Studio is for checking timing and framing.** Studio adds controls and overlays around the picture; it never processes the picture.

**Test for every decision** (feature, layout, copy, colour, demo content): does it help someone make, check, review or deliver a video? If yes, it earns its place in the Studio tier. If it only helps someone watch, it belongs in the Viewer tier or it is cut.

There are two tiers on purpose. Finer control comes from feature flags, so a host can turn a single feature on over Viewer or off over Studio.

### Customisation layers (coarse to fine)

1. **Tier**: `tier="viewer" | "studio"` sets the default bundle and layout.
2. **Feature flags**: override single features, such as `features={{ timecode: true, guides: ['title-safe','9:16'], zoom: false }}`.
3. **Guides menu and Zoom button (end user)**: show or hide the guides and zoom the developer allowed; guides are remembered per browser, zoom is not.
4. **Slots, events and a handle**: the host app adds its own controls (`slots={{ toolbarStart, toolbarEnd, overlay }}`), listens through callback props (`onInOutChange`, `onMarkerSelect`, `onFrameChange`, `onCopyLink`, `onGuidesChange`, `onZoomChange`, `onFrameGrab`) and drives the Studio tools from its own UI through `apiRef`.
5. **Tokens**: the 8 public `--media-*` tokens plus our own `--fl-*` tokens, and `density="comfortable" | "compact"`.

Only enabled modules load. Viewer must stay as light as a stock skin.

## Full feature list

Tiers in brackets. **[Scope]** means we build it first. **[Backlog]** means we consider building it later. Do not build [Backlog] items unless a step says so.

### Transport and time
- Timecode `HH:MM:SS:FF` with a frames/seconds toggle [Studio] [Scope]
- Frame step back/forward (`,` `.` and `←` `→` while paused) [Studio] [Scope]
- Jump ±N frames (default 10) [Studio] [Scope]
- In and out points: draggable handles on the timeline (always present, like a work-area bar), `I` / `O` at the playhead, arrow keys on a focused handle; loop range [Studio] [Scope]
- Previous / next cut, from markers or chapters [Studio] [Scope]
- Markers on the ruler: one pin type, optional end time; host data, shown and navigated by the skin [Studio] [Scope]
- Frame-accurate hover scrubbing with preview [Studio] [Scope, best effort with Mux storyboard thumbnails]
- Ping-pong loop, loop ±N seconds around the playhead [Studio] [Backlog]
- JKL shuttle 2×/4×/8× [Studio] [Backlog] (reverse is not supported in Chrome or Firefox; would be simulated)
- Playback stats: dropped frames, real fps [Studio] [Backlog]

### Guides and overlays
- Title-safe and action-safe zones [Studio] [Scope]
- Format centre crosshair [Studio] [Scope]
- Rule-of-thirds and proportional grids [Studio] [Scope]
- Aspect masks: 9:16, 4:5, 1:1, 2.39, 1.85 [Studio] [Scope]
- Platform UI zones for Shorts, Reels and TikTok (approximate, labelled so) [Studio] [Scope]
- Region of interest [Studio] [Backlog]

### Creator actions
- Grab frame (download PNG or copy; needs CORS, which Mux provides) [Studio] [Scope]
- Copy link at timecode (URL fragment plus an event) [Studio] [Scope]
- Time-coded comments: the skin shows markers and fires events; the host app stores comments [Studio] [Scope, markers and events only]

### Zoom
- Zoom and pan, 100% pixel view [Studio] [Scope]

### Compare and audio
- A/B wipe, side by side, onion skin, difference, compare two takes (needs two synced media elements) [Backlog]
- Drawing annotations on a frame [Backlog]
- Audio level meters; audio waveform under the timeline [Studio] [Backlog]

### Always, in every tier
- Full keyboard operation; the YouTube keyboard map is kept in every tier. Pro shortcuts use only keys that don't conflict: `I`, `O`, `,`, `.`, `Shift+←/→`. The help dialog (`Shift+?`) lists the active map.
- Every pro control has a visible tooltip with its shortcut and an accessible name that matches.
- The configurator page (the submission URL, the site root): tier switch, feature checkboxes, layout switch, a live code snippet, an event log and six tasks to try. `FEATURES.md` lists every feature; every step updates it.

## Out of scope

- Image processing and analysis (channels, exposure, gamma, scopes, false colour): belongs to a grading or monitoring engine, not a player skin.

## Look

Calm and device-like: neutral dark surfaces (true greys, R = G = B; the dock is a dark matte body `#171717`, the timecode display and the timeline groove darker still at `#0C0C0C`), three kinds of control in the dock (raised keys for the transport and Loop, one recessed display for the timecode and its link, flat toolbar buttons for the rest), the system UI typeface (no webfont, no monospace, no slashed zeros) with tabular numerals for all changing numbers, and one soft blue accent (`#5B9DFF`) **reserved** for signals: set In/Out handles, the focus ring and a selected marker. The range band is one neutral grey band; the playhead shows the position inside it. Toggled-on states use a lighter graphite, Play is a neutral filled button, the playhead is white. Controls live in a **dock below the picture** in the Studio tier (never over it, also in fullscreen); the Viewer tier keeps an overlay. The main row follows the pro-monitor convention: timecode on the left with its link button, transport in the centre, Markers, Capture and Guides menus and the Zoom button, plus playback on the right. The picture gets the room; the timeline is compact (about 46 px) with a white playhead and no permanent bubble. The ruler uses compact seconds-first labels (`10s`, `1:30`); the full timecode shows in the toolbar field and in the hover bubble. Guides are white at reduced opacity with a dark outline so they read over any footage; verify every guide over bright footage. Treat the look as a creator's tool, not a media-site player.

## Hard rules

1. **Never invent Video.js APIs.** Check names, props, CSS variables and file paths against the installed package and official docs. The installed version wins over blog posts and old docs.
2. **Video.js v10 only** (`@videojs/react`, `@videojs/html`), never v8. Pin versions exactly.
3. **Browser floor:** Chrome and Edge 111, Firefox 121, Safari and iOS 16.4.
4. **Accessibility:** WCAG 2.2 AA. Targets at least 24 px (44 px on touch); text contrast 4.5:1; UI and focus 3:1; visible focus; reduced motion respected; overlays are `aria-hidden` and `pointer-events: none`, and toggling them is announced.
5. **Frame accuracy is best effort.** Read `mediaTime` from `requestVideoFrameCallback`; say so in the UI and docs where it matters. Do not claim guaranteed frame accuracy or true reverse playback.
6. **Unverified is a valid answer.** Tell the author what you could not check.
7. **Every step ends deployed**, with a working public URL. From step 2, the build is always submittable.
8. **Do not build anything marked [Backlog].** Put ideas in `NOTES.md` under "Backlog".

## Nine steps

1. Environment and pipeline: scaffold, git, skill, deploy. *(done)*
2. Skin foundation and Viewer tier: gate-proof player. **A submittable build exists after this step.** *(done)*
3. Pro core: config, state, frame clock. *(done)*
4. Review transport: timecode, frame step, in/out, loop, grab frame, copy link, previous/next cut. *(done; its controls are rearranged in step 6)*
5. Ruler timeline, and 5b: dock layout and restyle. *(done; the timeline and toolbar are reworked in step 6)*
6. Viewer and Studio rework, then the Guides menu (called View until step 7b) and guides (`step-6-viewer-studio-rework-and-guides.md`), with the fixes of 6c and 6d: two tiers, compact timeline, range handles, one marker pin, new main row; then guides, crop masks, platform zones, remembered choices. *(done)*
7. Studio zoom: Fit, 100%, 200%, pan, rendition notes (`step-7-studio-zoom.md`), and 7b: View split into a Guides menu and a Zoom button with five levels (`step-7b-guides-and-zoom-buttons.md`). *(done)*
8. Configurator page, demo media entries, `FEATURES.md`, the rename to Frameline (`step-8-configurator-page.md`). *(done; the reel's playback ID and files are still placeholders)*
9. Hardening and audit: keyboard, phone, bright and dark footage, reduced motion, Firefox and Safari, deploy.

Then Monday 07:00 to 09:00 Nicosia: the author polishes, embeds on artmarchuk.me and submits.

## Open items the author decides

- Demo video: generation tool and editor, music source, title. It is a 40 to 60 second, 24 fps, 1920×1080 file hosted on Mux.
- Mux asset and playback ID, and the artmarchuk.me stack for the live-site bonus.
- `J` / `K` / `L` meaning across tiers: postponed; keep the YouTube map in every tier for now.
