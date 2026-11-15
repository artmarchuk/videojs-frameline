# Video.js PRO: project overview for Claude Code

Read this file at the start of every step, together with `NOTES.md` and that step's requirements file. It gives the big picture so that each step's decisions fit the whole.

## North star

**Video.js PRO is a player skin for video creators.** It is a tool for people who make video, not a prettier consumer player. The author's brand is UX and product design for tools that let people create and build things, and this project must read as exactly that.

**Test for every decision** (feature, layout, copy, colour, demo content): does it help someone make, check, review or deliver a video? If yes, it earns its place. If it only helps someone watch, it belongs in the Share tier or it is cut.

## Ultimate goal

Place in the top three of the **Video.js Skins Design Challenge** on Contra (sponsor Mux; judges are the creators of Video.js and Plyr; prizes $5k / $3k / $2k).

- **Deadline:** Sunday 16 Nov 2026, 11:59 pm PST, which is Monday 17 Nov, 09:59 Nicosia time. Aim to submit by 09:00 Nicosia.
- **Submission:** a public URL showing the v10 player playing video, a visual, and a short design-thinking text. The author submits it manually on Monday morning.
- **Minimum gate (must pass or the entry is out):** it works, with the essential controls (play/pause, seek, time, volume/mute, fullscreen), it is responsive, and it is keyboard-operable. Licence: Apache 2.0.
- **Scoring (25 points):** visual design and originality 10, usability and interaction 5, accessibility 5, execution and polish 5.
- **Bonuses (+1 each):** the demo video is hosted on Mux (playback ID, kept live); a real live site (artoix.com) uses the skin.

What wins: a distinct point of view with real craft, not a restyle of a consumer player. Execution is only 5 points, but a half-built feature costs more than an absent one, so cut early.

## The product

One skin, three tiers. A developer building a video tool picks a tier and switches single features on or off.

| Tier | For | What it adds |
| --- | --- | --- |
| **Share** | The creator's client or audience; how work leaves the tool | A clean player: play/pause, seek bar, time, volume/mute, captions, settings, fullscreen. Ships no pro code |
| **Review** | The creator checking and reviewing work | Frame-accurate transport, timecode, in/out and loops, markers, guides and crop masks, frame grab |
| **Studio** | The creator inspecting the image | Channel view, gain/gamma, zoom to pixels (contest subset) |

### Customisation layers (coarse to fine)

1. **Tier**: `tier="share" | "review" | "studio"` sets the default bundle and layout.
2. **Feature flags**: override single features, such as `features={{ timecode: true, guides: ['title-safe','9:16'], scopes: false }}`.
3. **View menu (end user)**: show or hide the overlays and tools the developer allowed; remembered per browser.
4. **Slots and events**: host app adds its own controls (`toolbar-start`, `toolbar-end`, `overlay`) and listens to `inout:change`, `marker:select`, `frame:change`.
5. **Tokens**: the 8 public `--media-*` tokens plus our own `--pro-*` tokens, and `density="comfortable" | "compact"`.

Only enabled modules load. Share must stay as light as a stock skin.

## Full feature list

Tiers in brackets. **[Contest]** means we build it for the entry. **[Later]** means after the contest. Do not build [Later] items unless a step says so.

### Transport and time
- Timecode `HH:MM:SS:FF` with a frames/seconds toggle [Review] [Contest]
- Frame step back/forward (`,` `.` and `←` `→` while paused) [Review] [Contest]
- Jump ±N frames (default 10) [Review] [Contest]
- In and out points (`I` / `O`), play in-to-out, loop range [Review] [Contest]
- Previous / next cut, from markers or chapters [Review] [Contest]
- Markers and range markers on the timeline [Review] [Contest]
- Frame-accurate hover scrubbing with preview [Review] [Contest, best effort with Mux storyboard thumbnails]
- Ping-pong loop, loop ±N seconds around the playhead [Studio] [Later]
- JKL shuttle 2×/4×/8× [Studio] [Later] (reverse is not supported in Chrome or Firefox; would be simulated)
- Playback stats: dropped frames, real fps [Studio] [Later]

### Guides and overlays
- Title-safe and action-safe zones [Review] [Contest]
- Format centre crosshair [Review] [Contest]
- Rule-of-thirds and proportional grids [Review] [Contest]
- Aspect masks: 9:16, 4:5, 1:1, 2.39, 1.85 [Review] [Contest]
- Platform UI zones for Shorts, Reels and TikTok (approximate, labelled so) [Review] [Contest]
- Region of interest; info HUD (file, resolution, fps, rendition, take or version label) [Studio] [Later]

### Creator actions
- Grab frame (download PNG or copy; needs CORS, which Mux provides) [Review] [Contest]
- Use frame as poster (emits an event with the time; host app saves it) [Review] [Contest]
- Copy link at timecode (URL fragment plus an event) [Review] [Contest]
- Time-coded comments: the skin shows markers and fires events; the host app stores comments [Review] [Contest, markers and events only]

### Image inspection
- Channel view: R, G, B, luma (SVG `feColorMatrix`, no pixel reading) [Studio] [Contest]
- Display gain/exposure and gamma, view only (SVG or CSS filters) [Studio] [Contest]
- Zoom and pan, 100% pixel view [Studio] [Contest]
- Zebra / false colour, scopes (waveform, vectorscope, histogram), pixel probe, snapshot compare [Studio] [Later] (WebGL or canvas; needs CORS)

### Compare and audio
- A/B wipe, side by side, onion skin, difference, compare two takes (needs two synced media elements) [Later]
- Drawing annotations on a frame [Later]
- Audio level meters; audio waveform under the timeline [Studio] [Later]

### Always, in every tier
- Full keyboard operation; the YouTube keyboard map is kept in every tier. Pro shortcuts use only keys that don't conflict: `I`, `O`, `,`, `.`, `Shift+←/→`. The help dialog (`Shift+?`) lists the active map.
- Every pro control has a visible tooltip with its shortcut and an accessible name that matches.
- The configurator page (the submission URL): tier switch, feature checkboxes, density switch, and a live code snippet.

## Look

Calm and macOS-like: graphite surfaces, the system UI typeface (no webfont, no monospace, no slashed zeros) with tabular numerals for all changing numbers, and one soft blue accent (`#5B9DFF`) **reserved** for the most important indications: the played part of the range band, the In/Out handles, the focus ring and a selected marker. Toggled-on states use a lighter graphite, Play is a neutral filled button, the playhead is white. Controls live in a **dock below the picture** in the Review and Studio tiers (never over it, also in fullscreen); the Share tier keeps an overlay. Secondary tools (Range, Capture, View) sit behind one disclosure control, so the default view stays quiet. The timeline is a ruler with compact seconds-first labels (`10s`, `1:30`) and a white playhead with a full-timecode bubble. Guides are white at reduced opacity with a dark outline so they read over any footage; verify every guide over bright footage. Treat the look as a creator's tool, not a media-site player.

## Hard rules

1. **Never invent Video.js APIs.** Check names, props, CSS variables and file paths against the installed package and official docs. The installed version wins over blog posts and old docs.
2. **Video.js v10 only** (`@videojs/react`, `@videojs/html`), never v8. Pin versions exactly.
3. **Browser floor:** Chrome and Edge 111, Firefox 121, Safari and iOS 16.4.
4. **Accessibility:** WCAG 2.2 AA. Targets at least 24 px (44 px on touch); text contrast 4.5:1; UI and focus 3:1; visible focus; reduced motion respected; overlays are `aria-hidden` and `pointer-events: none`, and toggling them is announced.
5. **Frame accuracy is best effort.** Read `mediaTime` from `requestVideoFrameCallback`; say so in the UI and docs where it matters. Do not claim guaranteed frame accuracy or true reverse playback.
6. **Unverified is a valid answer.** Tell the author what you could not check.
7. **Every step ends deployed**, with a working public URL. From step 2, the build is always submittable.
8. **Do not build anything marked [Later].** Put ideas in `NOTES.md` under "Later".

## Nine steps

1. Environment and pipeline: scaffold, git, skill, deploy.
2. Skin foundation and Share tier: gate-proof player. **A submittable build exists after this step.**
3. Pro core: config, state, frame clock.
4. Review transport: timecode, frame step, in/out, loop, grab frame, copy link, previous/next cut.
5. Ruler timeline: ticks, timecode bubble, in/out range, markers.
6. View menu and guides: safe areas, grids, masks, platform zones.
7. Studio subset: channels, gain/gamma, zoom.
8. Configurator page and demo video.
9. Hardening and audit: keyboard, phone, bright and dark footage, reduced motion, deploy.

Then Monday 07:00 to 09:00 Nicosia: the author polishes, embeds on artoix.com and submits.

## Open items the author decides

- Demo video: generation tool and editor, music source, title. It is a 40 to 60 second, 24 fps, 1920×1080 file hosted on Mux.
- Mux asset and playback ID, and the artoix.com stack for the live-site bonus.
- `J` / `K` / `L` meaning across tiers: postponed; keep the YouTube map in every tier for now.
