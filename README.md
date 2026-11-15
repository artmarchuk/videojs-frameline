# Video.js PRO

Video.js PRO is a player skin for Video.js v10 (React, plain CSS) built for the tools video creators use: editors, AI video generators, and review platforms. One skin has two tiers: **Viewer**, the clean player a creator's client or audience gets, and **Studio**, the creator's own monitor for making, checking and reviewing video. Finer control comes from feature flags: switch a single feature on over Viewer, or off over Studio.

**Live URL:** https://videojs-pro.vercel.app (host: Vercel; the player alone is at `/preview.html`)

## Quick start

```sh
npm install
npm run dev        # workbench at http://localhost:5173
npm run build      # production build into dist/
npm test           # unit tests (Vitest)
npm run deploy vercel   # deploy the workbench to Vercel (production URL)
```

## Use the skin

`ProSkin` is the entry point. Put it inside a Video.js player, with the media element as its child.

```tsx
import { MuxVideo } from '@videojs/react/media/mux-video';
import { VideoPlayer } from '@videojs/react/video';

import { ProSkin } from '@/pro';

<VideoPlayer>
  <ProSkin tier="studio" fps={24} features={{ grabFrame: false, guides: ['title-safe', '9:16'] }}>
    <MuxVideo src="https://stream.mux.com/….m3u8" playsInline crossOrigin="" />
  </ProSkin>
</VideoPlayer>;
```

With `tier="viewer"` (the default) and no flags, it is the clean Viewer player and downloads no pro code. Pro code is split into chunks that load only when a feature needs them.

**Status:** the Viewer tier and the Studio tier's transport, timeline, range handles, markers, capture tools and View menu (guides, crop masks, platform zones) are complete. The image tools (channels, gain and gamma, zoom) arrive in the next step.

### Tiers

| Tier | For | What it is |
| --- | --- | --- |
| `viewer` (default) | The creator's client or audience | Controls over the picture: seek bar, Play, mute and volume, time, captions, settings, picture-in-picture, fullscreen. Loads no pro code |
| `studio` | The creator | Controls in a dock below the picture: a compact ruler timeline with draggable In and Out handles, frame-by-frame transport, timecode, markers, guides and crop masks over the picture, and the Markers, Capture and View menus |

### Props

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `tier` | `'viewer' \| 'studio'` | `'viewer'` | The bundle of features to start from |
| `features` | partial flags (table below) | none | Single features on or off, on top of the tier |
| `fps` | `number` | `24` | Frame rate of the source. The browser does not expose it, so frame numbers depend on it. Pass `29.97` or `30000 / 1001` for NTSC rates |
| `startTimecode` | `string` | `'00:00:00:00'` | Timecode of the first frame |
| `dropFrame` | `boolean` | `false` | Drop-frame timecode; only for 29.97 and 59.94 |
| `markers` | `{ time, label, end?, id? }[]` | none | The host's markers, times in seconds. The skin shows and navigates them; it never creates or stores them |
| `layout` | `'dock' \| 'overlay'` | `'overlay'` for Viewer, `'dock'` for Studio | Where the controls sit: in a dock below the picture, or over it. See "Layout" |
| `density` | `'comfortable' \| 'compact'` | `'comfortable'` | Control spacing. Touch always gets comfortable, with 44 px targets |
| `debug` | `boolean` | `false` | Shows the debug readout. `?debug` in the page URL does the same |
| `slots` | `{ toolbarStart?, toolbarEnd?, overlay? }` | none | Host UI: in the control bar after the transport and time controls, in the control bar before the playback controls, and over the picture (visual only) |
| `onInOutChange` | `({ in, out }) => void` | none | The in or out point changed. Seconds, or `null` |
| `onMarkerSelect` | `(marker) => void` | none | The user selected a marker |
| `onFrameChange` | `({ frame, time }) => void` | none | The current frame number changed |
| `onCopyLink` | `({ url, frame, time }) => void` | none | A link to the current frame was copied |
| `onPosterFrame` | `({ frame, time, timecode }) => void` | none | The user chose the current frame as the poster. The host saves it; the skin stores nothing |
| `onViewChange` | `({ guides, crop, zones }) => void` | none | The guides that are drawn changed: `guides` is a list of ids, `crop` and `zones` an id or `null`. Not fired for the remembered set the player starts with |
| `persist` | `boolean \| string` | `true` | Remember the end user's View choices and the time display in `localStorage`. `true` uses the key `videojs-pro:v1`, a string uses that key, `false` turns it off |

An invalid `fps`, an unknown tier or an unknown feature name logs one warning in development and falls back to the default. Nothing throws.

`startTimecode` and `dropFrame` shape the timecode display and links.

### Feature flags

| Flag | Viewer | Studio |
| --- | --- | --- |
| `timecode`, `frameStep`, `inOut`, `loop`, `markers`, `shotNav`, `grabFrame`, `copyTimecodeLink`, `posterFrame` | off | on |
| `guides` | off | all |
| `platformZones` | off | on |
| `channels`, `gainGamma`, `zoom`, `infoHud` | off | on (no UI yet) |
| `debug` | off | off |

A host can turn any single feature on over Viewer or off over Studio, for example `<ProSkin tier="viewer" features={{ timecode: true, frameStep: true }} />`.

`guides` takes `false`, `true` (all) or a list of ids: `title-safe`, `action-safe`, `thirds`, `centre`, `9:16`, `4:5`, `1:1`, `2.39`, `1.85`. `platformZones` offers the zone sets `shorts`, `reels` and `tiktok`. See "The View menu".

### Studio shortcuts

These are added to the YouTube map in the Studio tier. Each works only while its feature is on, and `Shift+?` lists what is live.

| Keys | Action |
| --- | --- |
| `,` `.` | Step one frame back or forward (pauses first) |
| `←` `→` while paused | Step one frame. While playing they seek 5 s, as in Viewer |
| `Shift+←` `Shift+→` | Jump 10 frames |
| `I` `O` | Set In, set Out at the current frame |
| `Shift+I` `Shift+O` | Unset In, unset Out |
| `R` | Loop on or off: the range when one is set, otherwise the whole video |
| `[` `]` | Previous cut, next cut (chapters, or `markers` when there are no chapters) |
| `←` `→` on an In or Out handle | Move the handle one frame; `Shift` ten; `Home` `End` to its limits; `Delete` unsets it |
| `G` | Grab the current frame as a PNG |
| `Shift+V` | Hide every guide, or show them again |

### Layout

**Dock** (the default in Studio): the picture has its own stage and the controls are a panel below it. They never cover the picture, never hide, and stay in fullscreen, because the whole component goes fullscreen.

- **The aspect ratio applies to the stage, not to the component.** The component's height is the stage plus the dock. Set the ratio with `--pro-stage-ratio` (default `16 / 9`).
- The dock is about 117 px tall (comfortable density, wide player) and about 180 px on narrow players and touch devices, where the main row becomes two rows. Size the host's layout as stage plus dock.
- If you give the component a fixed height or a `max-height`, the dock keeps its height and the stage takes the rest, with the picture letterboxed.
- Bubbles and menus open upward from the dock, over the bottom edge of the picture.
- `--pro-frame-border: 1` draws a hairline and a 10 px radius around the component. The default is none.

**Overlay** (the default in Viewer): the controls sit over the picture and hide while idle.

```tsx
<ProSkin tier="studio" layout="overlay" />  {/* Studio controls over the picture */}
<ProSkin tier="viewer" layout="dock" />      {/* the Viewer player with a dock */}
```

### Controls

The Studio dock has two rows.

1. **Timeline:** the ruler, the track with the range band and its two handles, the marker pins.
2. **Main row**, in three columns, as on an editor's monitor:
   - **Left:** the **timecode** of the current frame (press it to switch to seconds) and the duration beside it.
   - **Centre:** **transport** (previous cut, step back, Play, step forward, next cut), then **Loop** and, only while a range is set, a small **Reset range** button.
   - **Right:** the **Markers**, **Capture** and **View** menus, then **playback**: captions, settings, mute with a short volume slider, fullscreen. Picture-in-picture is in the settings menu.

The menus open upward and are real menus: arrow keys, Enter, Escape, and focus returns to the button.

- **Markers** lists the host's markers with their timecodes, and the media's chapters under a second heading. Choosing one seeks to it.
- **Capture:** Grab frame (downloads a PNG, `G`), Copy frame image, Copy link at timecode, Use frame as poster.
- **View:** guides, crop masks and platform zones. See "The View menu".

The row follows the player's own width. It is one row down to 640 px, shedding in this order: the volume slider (under 1040 px), the duration text (980), the captions button (880; `C` and the settings menu remain), the menu chevrons (840), the count badges (740). **Under 640 px, and on any touch device**, it is two rows: the timecode, step back, step forward, Play, previous cut, next cut; then a segmented **In, Out, Loop** control and Capture, View, Settings, Fullscreen. In and Out appear as buttons there because touch has no keyboard: they set the point at the playhead. Mute and the markers are then in the settings menu. Under 350 px the cut buttons step aside (`[` `]` and the markers list still work) and In, Out, Loop take a row of their own.

### The timeline

In the Studio tier the seek bar is a compact ruler timeline, about 46 px tall. It is still the Video.js `TimeSlider`, so it is a normal slider for the keyboard, the pointer and assistive technology; its value is read as timecode.

- **Ruler:** tick intervals follow the duration, the width and `fps`. Labels are compact and seconds-first (`10s`, `1:30`, `1:00:00`).
- **Playhead:** a white line with a small head on the ruler. There is no permanent time bubble: the current timecode is in the main row. A small bubble with the full timecode (and the storyboard thumbnail, when the media has one) appears while the pointer hovers the timeline or drags something.
- **Seeking snaps to frames.** Every seek lands in the middle of a frame, the same rule frame stepping uses. Best effort, like all frame numbers here.
- **Keys on the focused seek slider:** `←` `→` step one frame while paused and seek 5 s while playing; `Shift+←` `Shift+→` jump 10 frames; `Home`, `End`, `PageUp`, `PageDown` as on any Video.js slider.
- **Chapters** show as gaps in the track and feed previous/next cut.

### The range: In and Out

The range lives on the timeline, like the work-area bar of an editor. **Two handles are always there**, one at each end of the track. While a point is not set its handle is neutral and the range is the whole video; move a handle and it takes the accent, and a band shows the range, brighter where it has played.

- **Drag** a handle to set the point. It snaps to frames, and magnetically to the playhead and to markers when it comes within 5 px of them. Drag it back to its end of the track, or **double-click** it, to unset the point.
- **Keyboard:** each handle is a slider named "In point" or "Out point". Focused: `←` `→` move it one frame, `Shift+←` `Shift+→` ten, `Home` `End` go to its limits, `Delete` or `Backspace` unsets it.
- **`I` and `O`** set In and Out at the current frame from anywhere in the player; `Shift+I` and `Shift+O` unset them.
- **Touch and narrow players** also get In and Out buttons.

**Why both.** On most timelines a pixel covers more than one frame (60 s at 24 fps is 1440 frames across about 1250 px), so dragging is the coarse tool. For an exact frame, step to it and press `I` or `O`, or focus a handle and nudge it with the arrow keys.

`onInOutChange` fires when a drag is released, not while it moves, with `{ in, out }` in seconds; a point that is not set is `null`. In is always before Out: a handle dragged past the other swaps the two, and both points cannot sit on one frame. **Loop** (`R`) loops the range when one is set and the whole video otherwise.

### Markers

```tsx
<ProSkin
  tier="studio"
  markers={[
    { id: 'logo', time: 8.4, label: 'Logo too small' },
    { id: 'grade', time: 34, end: 44, label: 'Check the grade' }, // with an end time
  ]}
  onMarkerSelect={(marker) => openComment(marker.id)}
>
```

| Field | Type | Meaning |
| --- | --- | --- |
| `time` | `number` | Position in seconds |
| `label` | `string` | Shown in the tooltip and the Markers menu |
| `end` | `number`, optional | Adds a thin line along the ruler from the pin to this time |
| `id` | `string`, optional | Your own identifier, passed back in `onMarkerSelect` |

**Markers are the host's data.** They come from the `markers` prop; chapters come from the media's chapter track. The skin displays and navigates them and reports clicks. It never creates or stores them: comments, notes and versions live in your app.

There is **one visual**: a small pin on the ruler at the marker's time. No count badges and no clusters; pins that are close together overlap, later ones on top. Hovering a pin shows its label and timecode; clicking it seeks to the marker's frame and calls `onMarkerSelect`. The selected marker's pin takes the accent until the playhead moves away. Pins are not tab stops: for the keyboard and screen readers every marker is an item in the **Markers** menu, and `[` `]` move between cuts (chapters, or markers when the media has no chapters). About 200 markers is the design limit.

### The View menu

Guides are drawn **on the picture**, never on letterbox bars, and never over the controls. They are white lines with a dark edge, so they read over bright and dark footage alike; the layer is `aria-hidden` and ignores the pointer. Grabbed frames never include them.

| Section | Items | Behaviour |
| --- | --- | --- |
| Safe areas | Title safe (`title-safe`), Action safe (`action-safe`) | Independent. Broadcast 16:9 figures: the central 90% and 93% of the picture (EBU R95, ITU-R BT.1848) |
| Composition | Rule of thirds (`thirds`), Centre cross (`centre`) | Independent |
| Crop | None, 2.39:1 (`2.39`), 1.85:1 (`1.85`), 1:1, 4:5, 9:16 | One at a time. Dims the picture outside a centred crop of that ratio |
| Platform zones | None, YouTube Shorts (`shorts`), Instagram Reels (`reels`), TikTok (`tiktok`) | One at a time. Shows where the app's own interface covers a vertical video: a top bar, captions and profile, and the buttons on the right |
| Footer | Hide guides / Show guides, `Shift+V` | Switches everything off, and brings the same set back |

- Toggling keeps the menu open, so several guides can be switched in one visit. Escape closes it and focus returns to the View button, whose badge counts what is on (its accessible name says "View, 3 guides on").
- **Platform zones are approximate**, and the menu says so on every platform. Apps change their layouts, and the layout depends on the caption and on whether the video is an ad; check the platform's current guidance before you deliver. The numbers are in one file, `src/pro/studio/guides/platform-zones.ts`, in percent of the 9:16 frame.
- Zones are drawn inside the 9:16 frame: the whole picture when the video is 9:16, otherwise a centred 9:16 crop. So **choosing a platform turns on the 9:16 crop**, and choosing another crop clears the zones.
- Labels (Title safe, Action safe, the zone names) are hidden on a picture narrower than 480 px.

**What the host controls.** `features.guides` restricts the menu: with `guides: ['title-safe', '9:16']` only those two are offered, a section with nothing left disappears, and `guides: false` removes the View button. `platformZones: false` removes that section.

```tsx
<ProSkin
  tier="studio"
  features={{ guides: ['title-safe', 'action-safe', '9:16'], platformZones: false }}
  persist="my-app:monitor"
  onViewChange={({ guides, crop, zones }) => analytics.track('view', { guides, crop, zones })}
>
```

**Remembered choices.** The guides, the crop, the zones and the timecode/seconds choice are remembered per browser (`persist`). The range, Loop and the playhead are not. What is read back is validated: unknown ids, ids the current `features` do not allow, wrong types and broken JSON are dropped silently. **The host's `features` always win** over a remembered value, and the skin works the same when storage is blocked, full or empty.

### Links to a frame

Copy link writes the position into the page URL's hash as `#t=HH:MM:SS:FF`, the timecode on screen, and keeps anything else the host app has in the hash. A page opened with such a hash seeks to that frame, paused. Plain seconds (`#t=12.5`) are also read.

### Grabbing frames

Grab frame (in the Capture menu, or `G`) saves the raw frame at the video's own resolution, without guides or adjustments. The browser only allows this when the video is loaded with CORS: set `crossOrigin` on the media element and serve CORS headers (Mux does). Otherwise the skin says the host does not allow frame capture.

### Styling hooks

The player container carries `data-tier`, `data-density`, `data-layout`, `data-bar="pro"` while pro controls are in the bar, `data-dock-size` (`wide` or `narrow`) in the Studio tier, one attribute per guide that is drawn, such as `data-guide-title-safe` or `data-guide-9-16` (`:` and `.` become `-`), `data-crop="9-16"` and `data-zones="tiktok"`. The picture's rectangle inside the stage is published as `--pro-picture-x`, `--pro-picture-y`, `--pro-picture-w` and `--pro-picture-h` (CSS pixels); the overlay layer, and with it the `overlay` slot, is sized to it in the Studio tier. The look is driven by the `--pro-*` tokens in `src/styles/tokens.css` and the public `--media-*` tokens.

**The look:** calm graphite surfaces and the system UI typeface (no webfont), with tabular numerals for every changing number. One soft blue accent (`--pro-accent`, or `--media-accent-color`) is reserved for the played part of the range, the In/Out handles once they are set, the focus ring and a selected marker. The Viewer's progress bar is white. Toggled-on controls use a lighter graphite (`--pro-on`), Play is a neutral filled button, and the playhead is white.

### Frame accuracy

Frame numbers are best effort. Where the browser has `requestVideoFrameCallback`, the skin reads the media time of each presented frame; elsewhere it samples `currentTime`, which is approximate. Both depend on the `fps` you pass. The skin does not guarantee frame accuracy.

## Develop

```sh
npm run dev
```

The workbench opens your skin in a slimmed-down version of the Video.js sandbox. The page it frames, `/preview.html`, is a monitor: a top bar with the tier and density switches and the player as large as the window allows. It opens in Studio; `?tier=viewer`, `?density=compact`, `?layout=dock|overlay`, `?guides=title-safe,9:16` (the host's guide list; `?guides=0` for none), `?zones=0` and `?debug` (debug readout and event log) set its state. It plays NASA's Cosmic Dawn trailer from Mux, with chapters; change the media in `apps/preview/src/frame/media.ts`. The options panel sets the player's width and aspect ratio, the color scheme, text direction, and language, and playback options such as autoplay, muted, loop, and preload. The arrow button opens the preview on its own. The settings live in the URL, so a link such as `/?width=384&ratio=9:16&dir=rtl&locale=ar` opens the workbench in that state, and `/preview.html#width=384&ratio=9:16` opens the preview alone.

## Deploy

```sh
npm run deploy
```

This project deploys to **Vercel** with `npm run deploy vercel` (Netlify is the fallback: `npm run deploy netlify`). Without a host name, the script asks where to deploy the workbench: Vercel, Netlify, or Cloudflare Pages. The first time, the host's CLI signs you in and creates the project, then every run prints the URL. In this project `deploy:vercel` already passes `--prod`, because Vercel's preview URLs ask visitors to log in by default. Netlify still deploys to a preview URL; add `--prod` to `deploy:netlify` if you switch hosts.

To deploy on every push instead, put the project on GitHub and import it on Vercel or Netlify; `vercel.json` and `netlify.toml` already describe the build. The build uses relative URLs, so `dist/` also works on any static host, including in a subfolder.

## Where things live

- `src/`: the skin.
  - `src/pro/`: `ProSkin`, feature flags, the pro store, the frame clock and timecode utilities. The Studio controls load lazily from `studio/`.
  - `src/video/`: the skin component and its parts.
  - `src/styles/`: theme tokens and shared styles the skin imports, when it started from a packaged skin.
  - `src/skin.css`: global styles for the skin.
- `apps/preview/`: the workbench that previews the skin. You don't need to change it.
  - `src/shell/`: the Shadcn shell.
  - `src/frame/`: the page the shell frames. `player` mounts your skin in a player and sets the media it plays.
  - `public/`: files the preview serves, such as the chapters track.
- `vercel.json`, `netlify.toml`: how those hosts build the workbench.
- `skin.json`: what this skin is built from. Keep it; it records the Video.js version the skin was created with.

## Learn more

- [Build your own skin](https://videojs.org/docs/framework/react/guides/build-your-own-skin)
- [Customize skins](https://videojs.org/docs/framework/react/guides/customize-skins)
- [UI components](https://videojs.org/docs/framework/react/guides/ui-components)
