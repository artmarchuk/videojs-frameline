# Frameline — a Video.js skin for video creators

Frameline is a player skin for Video.js v10 (React, plain CSS) built for the tools video creators use: editors, AI video generators, and review platforms. One skin has two tiers: **Viewer**, the clean player a creator's client or audience gets, and **Studio**, the creator's own monitor for making, checking and reviewing video. Finer control comes from feature flags: switch a single feature on over Viewer, or off over Studio.

**Live:** https://frameline.artmarchuk.me is the configurator page: pick a tier, switch features, copy the snippet. The player alone, as a monitor, is at [`/preview.html`](https://frameline.artmarchuk.me/preview.html).

**What it does:** see [FEATURES.md](FEATURES.md) for the full list, with where to find each thing. **Author:** Artem Marchuk, [artmarchuk.me](https://artmarchuk.me). **Licence:** Apache 2.0.

## Install and run

Node 24 (the version the host builds with; newer versions also build) and npm.

```sh
npm install
npm run dev        # http://localhost:5173: the configurator; /preview.html: the monitor; /workbench.html: the CLI's workbench
npm run typecheck
npm test           # unit tests (Vitest)
npm run build      # production build into dist/
npm run deploy vercel   # deploy to Vercel (production URL)
```

The skin is the source in `src/`. It is not published to npm: copy `src/` into your app (it imports nothing from `apps/`) and install `@videojs/react` 10.4.0.

## Use the skin

`FramelineSkin` is the entry point. Put it inside a Video.js player, with the media element as its child.

```tsx
import { MuxVideo } from '@videojs/react/media/mux-video';
import { VideoPlayer } from '@videojs/react/video';

import { FramelineSkin } from '@/pro';

<VideoPlayer>
  <FramelineSkin tier="studio" fps={24} features={{ grabFrame: false, guides: ['title-safe', '9:16'] }}>
    <MuxVideo src="https://stream.mux.com/….m3u8" playsInline crossOrigin="" />
  </FramelineSkin>
</VideoPlayer>;
```

The two tiers, at their smallest:

```tsx
// Viewer: the clean player for a client or an audience. Loads no pro code.
<VideoPlayer>
  <FramelineSkin>
    <MuxVideo src="https://stream.mux.com/….m3u8" playsInline />
  </FramelineSkin>
</VideoPlayer>

// Studio: the creator's monitor. Give it the source's frame rate, and CORS so frames can be grabbed.
<VideoPlayer>
  <FramelineSkin tier="studio" fps={24}>
    <MuxVideo src="https://stream.mux.com/….m3u8" playsInline crossOrigin="" />
  </FramelineSkin>
</VideoPlayer>
```

With `tier="viewer"` (the default) and no flags, it is the clean Viewer player and downloads no pro code. Pro code is split into chunks that load only when a feature needs them.

### Tiers

| Tier | For | What it is |
| --- | --- | --- |
| `viewer` (default) | The creator's client or audience | Controls over the picture: seek bar, Play, mute and volume, time, captions, settings, picture-in-picture, fullscreen. Loads no pro code |
| `studio` | The creator | Controls in a dock below the picture: a compact ruler timeline with draggable In and Out handles, frame-by-frame transport, timecode, markers, guides and crop masks over the picture, zoom to check detail, and the Markers, Capture and Guides menus |

Viewer is for watching. Studio is for checking timing and framing: it adds controls and overlays around the picture and never processes the picture.

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
| `onGuidesChange` | `({ guides, crop, zones }) => void` | none | The guides that are drawn changed: `guides` is a list of ids, `crop` and `zones` an id or `null`. Not fired for the remembered set the player starts with |
| `onZoomChange` | `(level) => void` | none | The zoom level changed: `'fit'`, `'100'`, `'150'`, `'200'` or `'400'` |
| `onFrameGrab` | `(info) => void` | none | A frame was grabbed. See "Events" |
| `apiRef` | `Ref<FramelineApi>` | none | A handle for driving the Studio tools from your own UI. See "Driving the player" |
| `persist` | `boolean \| string` | `true` | Remember the end user's Guides choices and the time display in `localStorage`. `true` uses the key `frameline:v1`, a string uses that key, `false` turns it off |

An invalid `fps`, an unknown tier or an unknown feature name logs one warning in development and falls back to the default. Nothing throws.

`startTimecode` and `dropFrame` shape the timecode display and links.

### Events

Events are callback props. The skin dispatches no DOM events.

| Prop | Payload | Fires when |
| --- | --- | --- |
| `onInOutChange` | `{ in: number \| null, out: number \| null }`, seconds | The In or Out point changes: on `I` and `O`, when a handle drag is released, on Reset range, on `apiRef.setRange` |
| `onMarkerSelect` | the marker: `{ time, label, end?, id? }` | The user selects a marker: a pin, the Markers menu, or previous/next cut landing on one |
| `onFrameChange` | `{ frame: number, time: number }` | The current frame number changes. Every frame while playing, so keep the handler light |
| `onCopyLink` | `{ url: string, frame: number, time: number }` | A link to the current frame was copied |
| `onGuidesChange` | `{ guides: string[], crop: string \| null, zones: string \| null }` | The guides that are drawn change. Not fired for the remembered set the player starts with |
| `onZoomChange` | `'fit' \| '100' \| '150' \| '200' \| '400'` | The zoom level changes |
| `onFrameGrab` | `{ frame, time, timecode, width, height, target: 'file' \| 'clipboard', fileName? }` | A frame was downloaded as a PNG or copied as an image |

### Driving the player

`apiRef` gives your own UI a handle on the Studio tools: a comment that jumps to its range, a "check the safe area" button.

```tsx
const frameline = useRef<FramelineApi>(null);

<FramelineSkin tier="studio" fps={24} apiRef={frameline}>…</FramelineSkin>

frameline.current?.setRange({ in: 12, out: 16 });
frameline.current?.setGuides({ guides: ['title-safe'], crop: null, zones: null });
```

| Method | What it does |
| --- | --- |
| `seek(time)` | Seeks to the frame that contains `time` (seconds) |
| `step(frames)` | Steps that many frames from the current one; negative steps back. Pauses first. Needs `frameStep` |
| `setRange({ in, out })` | Sets In and Out in seconds; `null` leaves that side open. Needs `inOut` |
| `setLoop(on)` | Loop on or off; it is on from the start. Needs `loop` |
| `setGuides({ guides?, crop?, zones? })` | Sets what is drawn. `guides` is the full list of checkbox guides to have on; fields left out are not changed |
| `setZoom(level)` | `'fit'`, `'100'`, `'150'`, `'200'` or `'400'`. Needs `zoom` |
| `pan(direction)` | Moves the zoomed view a tenth of what is visible: `'left'`, `'right'`, `'up'`, `'down'` |
| `grabFrame()` | Downloads the current frame as a PNG. Needs `grabFrame` |

The handle is `null` in the Viewer tier and until the pro code has loaded. A call for a feature that is switched off does nothing. Calls are not announced to screen readers: your own control should say what it did. The matching event fires as it does for the user's own action.

### Feature flags

| Flag | Viewer | Studio |
| --- | --- | --- |
| `timecode`, `frameStep`, `inOut`, `loop`, `markers`, `shotNav`, `grabFrame`, `copyTimecodeLink` | off | on |
| `guides` | off | all |
| `platformZones` | off | on |
| `zoom` | off | on |
| `debug` | off | off |

A host can turn any single feature on over Viewer or off over Studio, for example `<FramelineSkin tier="viewer" features={{ timecode: true, frameStep: true }} />`.

`guides` takes `false`, `true` (all) or a list of ids: `title-safe`, `action-safe`, `thirds`, `centre`, `9:16`, `4:5`, `1:1`, `2.39`, `1.85`. `platformZones` offers the zone sets `shorts`, `reels` and `tiktok`. See "The Guides menu".

### Keyboard shortcuts

Both tiers keep the YouTube map: `Space` or `K` play and pause (`Space` also with focus on a seek bar or a range handle), `←` `→` seek 5 s, `J` `L` seek 10 s, `↑` `↓` volume, `M` mute, `C` captions, `F` fullscreen, `0`–`9` seek to a tenth, `Home` `End`, `<` `>` speed. `Shift+?` opens the help dialog, which lists the keys that are live in the current configuration.

These are added to the YouTube map in the Studio tier. Each works only while its feature is on, and `Shift+?` lists what is live.

| Keys | Action |
| --- | --- |
| `,` `.` | Step one frame back or forward (pauses first) |
| `←` `→` while paused | Step one frame. While playing they seek 5 s, as in Viewer |
| `Shift+←` `Shift+→` | Jump 10 frames |
| `I` `O` | Set In, set Out at the current frame |
| `Shift+I` `Shift+O` | Unset In, unset Out |
| `R` | Loop off or on. It is on from the start: the range loops when one is set, otherwise the whole video |
| `[` `]` | Previous cut, next cut (chapters, or `markers` when there are no chapters) |
| `←` `→` on an In or Out handle | Move the handle one frame; `Shift` ten; `Home` `End` to its limits; `Delete` unsets it |
| `G` | Grab the current frame as a PNG |
| `Shift+G` | Copy the current frame to the clipboard as an image |
| `S` | Copy a link to the current frame ("share") |
| `Shift+V` | Hide every guide, or show them again |
| `Z` | Zoom: the next level (Fit, 100%, 150%, 200%, 400%, and Fit again) |
| `Shift+Z` | Zoom: the previous level |
| `Shift+Alt+←` `→` `↑` `↓` | Move around the zoomed picture, a tenth of the visible area per press. Only while zoomed. `Alt` + arrows alone are left to the browser (Back and Forward on Windows and Linux) |

### Layout

**Dock** (the default in Studio): the picture has its own stage and the controls are a panel below it. They never cover the picture, never hide, and stay in fullscreen, because the whole component goes fullscreen.

- **The aspect ratio applies to the stage, not to the component.** The component's height is the stage plus the dock. Set the ratio with `--fl-stage-ratio` (default `16 / 9`).
- The dock is about 117 px tall (comfortable density, wide player) and about 180 px on narrow players and touch devices, where the main row becomes two rows. Size the host's layout as stage plus dock.
- If you give the component a fixed height or a `max-height`, the dock keeps its height and the stage takes the rest, with the picture letterboxed.
- Bubbles and menus open upward from the dock, over the bottom edge of the picture.
- `--fl-frame-border: 1` draws a hairline and a 10 px radius around the component. The default is none.

**Overlay** (the default in Viewer): the controls sit over the picture and hide while idle.

```tsx
<FramelineSkin tier="studio" layout="overlay" />  {/* Studio controls over the picture */}
<FramelineSkin tier="viewer" layout="dock" />      {/* the Viewer player with a dock */}
```

### Controls

The Studio dock has two rows.

1. **Timeline:** the ruler, the track with the range band and its two handles, the marker pins.
2. **Main row**, in three columns, as on an editor's monitor:
   - **Left:** the **timecode** of the current frame (press it to switch to seconds), joined to a **link** button that copies a link to that frame (`S`), and the duration beside them.
   - **Centre:** **transport** (previous cut, step back, Play, step forward, next cut), then **Loop** and, only while a range is set, a small **Reset range** button.
   - **Right:** the **Markers**, **Capture** and **Guides** menus and the **Zoom** button, then **playback**: captions, settings, mute with a short volume slider, fullscreen. Picture-in-picture is in the settings menu.

The menus open upward and are real menus: arrow keys, Enter, Escape, and focus returns to the button.

- **Markers** lists the host's markers with their timecodes, and the media's chapters under a second heading. Choosing one seeks to it.
- **Capture:** the image actions. Grab frame (downloads a PNG, `G`) and Copy frame image (`Shift+G`). The button is not shown with `grabFrame: false`.
- **Guides:** guides, crop masks and platform zones. See "The Guides menu".
- **Zoom:** a text button that shows the level ("Fit", "150%") and opens the list of levels. See "Zoom".

The row follows the player's own width. It is one row down to 740 px, shedding in this order: the volume slider (under 1100 px), the duration text (1040), the captions button (940; `C` and the settings menu remain), the menu chevrons (900), the count badges (820). **Under 740 px, and on any touch device**, it is two rows. Row one: the timecode, step back, step forward, Play, previous cut, next cut (under 350 px the cut buttons step aside; `[` `]` and the Markers menu still work). Row two is one row of equal cells, each a 44 px target: **Markers, Loop, Capture, Link, Guides, Zoom, Settings, Fullscreen**. There are no In and Out buttons there: the range is set with the handles on the timeline, and `I` and `O` still work from a keyboard. Mute is in the settings menu. Eight cells need a 382 px player, so the row folds: under 382 px the Zoom button is not shown (`Z`, `Shift+Z` and `apiRef.setZoom` still zoom), and under 340 px the Link button is not shown and "Copy link at timecode" is an item of the settings menu. Under 300 px the side padding is 12 px instead of 15, and under 288 px the cells are 40 px wide (still 44 px tall), so the six cells fit down to a 264 px player.

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
- **Touch and narrow players** set the range with the handles, which are 44 px targets there.

**Why both.** On most timelines a pixel covers more than one frame (60 s at 24 fps is 1440 frames across about 1250 px), so dragging is the coarse tool. For an exact frame, step to it and press `I` or `O`, or focus a handle and nudge it with the arrow keys.

`onInOutChange` fires when a drag is released, not while it moves, with `{ in, out }` in seconds; a point that is not set is `null`. In is always before Out: a handle dragged past the other swaps the two, and both points cannot sit on one frame.

**A set range confines playback.** A range is set when In, Out or both are set: only In runs to the end, only Out from the start.

- **Loop** (`R`) is on from the start. With a range it loops the range; without one, the whole video. `R`, the button and `setLoop` switch it off and on.
- **At Out**, playback goes back to In with Loop on, and pauses on the Out frame with Loop off. Out counts as reached half a frame early, so expect the Out frame to show for an instant at the loop point.
- **Starting playback** in any way (Space, `K`, Play, a click on the picture, `apiRef`, the media element's own `play()`) from outside the range, or from the Out frame, starts at In.
- **Setting or moving the range** past a playing head (`I`, `O`, a handle, `setRange`) sends playback to In; setting Out at the playhead counts as reaching Out.
- **A seek to outside the range while playing** (the ruler, a frame step, a cut, `Home`, `End`, `0`–`9`, the arrow seeks) goes there and pauses; the next play starts at In. Seeks inside the range keep playing.
- **Clearing the range** (`Shift+I`, `Shift+O`, Reset range, `Delete` on a handle) frees playback again; Loop stays as it was.

Hosts with `loop: false` get the same behaviour with Loop off: playback pauses on the Out frame. The Viewer tier has no range.

### Markers

```tsx
<FramelineSkin
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

### The Guides menu

Guides are drawn **on the picture**, never on letterbox bars, and never over the controls. They are white lines with a dark edge, so they read over bright and dark footage alike; the layer is `aria-hidden` and ignores the pointer. Grabbed frames never include them.

| Section | Items | Behaviour |
| --- | --- | --- |
| Safe areas | Title safe (`title-safe`), Action safe (`action-safe`) | Independent. Broadcast 16:9 figures: the central 90% and 93% of the picture (EBU R95, ITU-R BT.1848) |
| Composition | Rule of thirds (`thirds`), Centre cross (`centre`) | Independent |
| Crop | None, 2.39:1 (`2.39`), 1.85:1 (`1.85`), 1:1, 4:5, 9:16 | One at a time. Dims the picture outside a centred crop of that ratio |
| Platform zones | None, YouTube Shorts (`shorts`), Instagram Reels (`reels`), TikTok (`tiktok`) | One at a time. Shows where the app's own interface covers a vertical video: a top bar, captions and profile, and the buttons on the right |
| Footer | Hide guides / Show guides, `Shift+V` | Switches everything off, and brings the same set back |

- Toggling keeps the menu open, so several guides can be switched in one visit. Escape closes it and focus returns to the Guides button, whose badge counts what is on (its accessible name says "Guides, 3 guides on").
- **Platform zones are approximate**, and the menu says so on every platform. Apps change their layouts, and the layout depends on the caption and on whether the video is an ad; check the platform's current guidance before you deliver. Where sources disagree, the largest unsafe margin is used, so a guide never promises space the app may cover. The numbers are in one file, `src/pro/studio/guides/platform-zones.ts`, in percent of the 9:16 frame.
- Zones are drawn inside the 9:16 frame: the whole picture when the video is 9:16, otherwise a centred 9:16 crop. So **choosing a platform turns on the 9:16 crop**, and choosing another crop clears the zones.
- Labels (Title safe, Action safe, the zone names) are hidden on a picture narrower than 480 px.

**What the host controls.** `features.guides` restricts the menu: with `guides: ['title-safe', '9:16']` only those two are offered, a section with nothing left disappears, and `guides: false` removes the Guides button. `platformZones: false` removes that section. Zoom is a separate control with its own flag.

```tsx
<FramelineSkin
  tier="studio"
  features={{ guides: ['title-safe', 'action-safe', '9:16'], platformZones: false }}
  persist="my-app:monitor"
  onGuidesChange={({ guides, crop, zones }) => analytics.track('guides', { guides, crop, zones })}
>
```

**Remembered choices.** The guides, the crop, the zones and the timecode/seconds choice are remembered per browser (`persist`). The range, Loop and the playhead are not. What is read back is validated: unknown ids, ids the current `features` do not allow, wrong types and broken JSON are dropped silently. **The host's `features` always win** over a remembered value, and the skin works the same when storage is blocked, full or empty.

### Zoom

Zoom changes how closely you look at the picture, never the picture itself. The **Zoom button** sits after Guides: it shows the current level, takes the "on" fill while zoomed, and opens a menu of the levels. `Z` goes to the next level and `Shift+Z` to the previous one.

| Level | What it shows |
| --- | --- |
| Fit | The whole picture in the stage. No transform |
| 100% | One pixel of the source on one device pixel: scale = the source's width / the picture's width in CSS pixels / `devicePixelRatio`. The source is the largest rendition the stream offers (Video.js's `videoRenditionList`), or the decoded `videoWidth` when there is no rendition list, so the scale does not change when the player switches rendition; a lower rendition is drawn larger and the menu says "showing 720p". On a small video, or on a high-density screen, this can be smaller than Fit, and it is applied as it is |
| 150%, 200%, 400% | Multiples of 100%. From 200% up the picture is drawn with `image-rendering: pixelated`, so single pixels are visible |

- **Pan** while the zoomed picture is larger than the stage: drag it (mouse, pen or one finger), or press `Shift+Alt` and an arrow. The pan stops at the picture's edges, so the stage never shows an empty band. A drag longer than 3 px is not a click: it neither plays nor pauses. There is no pinch zoom.
- Entering a level starts from the centre of the picture. Zoom **always starts at Fit**: unlike the guides it is not remembered.
- **Guides zoom with the picture** (they are in the same box), with their lines and labels kept at the same size on screen.
- **Grab frame and Copy frame image always capture the whole frame** at the video's own resolution, whatever the zoom and pan. Copy link is not affected either.
- The scale is recomputed when the player or the window changes size, in fullscreen, and when the media reports new dimensions.
- `features.zoom` is on in Studio; `zoom: false` removes the button and its shortcuts. Guides and zoom are independent: either works without the other. The flag adds one wrapper element (`.pro-picture`) around the media and the overlay layer; without it (the Viewer tier) that element does not exist. The container carries `data-zoom="100"`, `"150"`, `"200"` or `"400"` while zoomed.
- Captions drawn by the browser belong to the video element and are scaled with it.

**Which rendition you are looking at.** An adaptive stream (HLS) may play a smaller rendition than the source: the engine picks one for the connection and, by default, for the player's size. 100% then means 100% of *that* rendition. Two places say so. Settings → Quality shows what Auto is playing ("Auto (720p)", from Video.js). And while zoomed with a rendition below the best one the stream offers, the chosen level in the Zoom menu and the announcement add it: "100% · showing 720p". While zoomed with Quality on Auto, the skin lifts that player-size cap (`capRenditionToPlayerSize` in the media's `source`, a Video.js option) so the engine may pick a higher rendition by bandwidth, and puts the host's value back at Fit; it never selects a rendition itself and leaves a quality picked by hand alone. This changes what is fetched from then on: **a frame you paused on keeps the rendition it was buffered in** until playback or a seek fetches it again, and the note says which one that is. To be sure of the source's own pixels, pick the top rendition in Settings → Quality.

### Links to a frame

The link button beside the timecode (or `S`) copies the page URL with the position in its hash as `#t=HH:MM:SS:FF`, the timecode on screen, and keeps anything else the host app has in the hash. The button shows a check for a moment and the copy is announced with the timecode; `onCopyLink` reports it. `copyTimecodeLink: false` removes the button and the key. A page opened with such a hash seeks to that frame, paused. Plain seconds (`#t=12.5`) are also read.

### Grabbing frames

Grab frame (in the Capture menu, or `G`) saves the raw frame at the video's own resolution, without guides or adjustments. The browser only allows this when the video is loaded with CORS: set `crossOrigin` on the media element and serve CORS headers (Mux does). Otherwise the skin says the host does not allow frame capture.

### Styling hooks

The player container carries `data-tier`, `data-density`, `data-layout`, `data-bar="pro"` while pro controls are in the bar, `data-dock-size` (`wide` or `narrow`) in the Studio tier, one attribute per guide that is drawn, such as `data-guide-title-safe` or `data-guide-9-16` (`:` and `.` become `-`), `data-crop="9-16"`, `data-zones="tiktok"`, and `data-zoom="100"`, `"150"`, `"200"` or `"400"` while zoomed. The picture's rectangle inside the stage is published as `--fl-picture-x`, `--fl-picture-y`, `--fl-picture-w` and `--fl-picture-h` (CSS pixels); the overlay layer, and with it the `overlay` slot, is sized to it in the Studio tier. The look is driven by the `--fl-*` tokens in `src/styles/tokens.css` and the public `--media-*` tokens.

**The look:** calm, truly neutral dark surfaces (R = G = B, so the surround adds no cast to the picture; the dock is macOS's dark window grey) and the system UI typeface (no webfont), with tabular numerals for every changing number. One soft blue accent (`--fl-accent`, or `--media-accent-color`) is reserved for the played part of the range, the In/Out handles once they are set, the focus ring and a selected marker. The Viewer's progress bar is white. Toggled-on controls use a lighter grey (`--fl-on`), Play is a neutral filled button, and the playhead is white.

**Tactile, in the dock only.** The keys you press while checking timing (the transport groups, Play, Loop and the link button) read as slightly raised; the rest of the row is a flat toolbar that takes a flat fill on hover. Both kinds read as pressed in when on, open or held, the timecode field and the track as recessed, and the range band, handles and pins as solid things on the track. It is all gradients and 1 px shadows scaled by one token, `--fl-bevel` (`1`; `0` is flat). Nothing of it is drawn over the picture: the overlay layout is flat, as are `prefers-contrast: more` and forced colours.

**Motion.** Nothing that shows time animates: the playhead, the timecode, the ruler, the handles and the band's ends follow the media and the pointer exactly. What does move is short: a press (60 ms in, 90 ms out), the range band fading in when a range is set (160 ms, also when the first point is set by a drag) and out when it is cleared (120 ms), with its handles changing colour over the same 160 ms, hovers and menus (120 ms; a menu closes in 70 ms). `prefers-reduced-motion` sets every duration to zero.

### Tokens

The skin reads Video.js's public tokens, so a host that already themes a Video.js player themes this one: `--media-accent-color`, `--media-accent-text-color`, `--media-border-color`, `--media-border-radius`, `--media-spacing`, `--media-object-fit`, `--media-object-position`, and `--media-controls-before-start: hidden` to hide the bar until playback starts.

Its own tokens are `--fl-*`, all defined in `src/styles/tokens.css`. The ones a host is most likely to set:

| Token | Default | What it is |
| --- | --- | --- |
| `--fl-accent` | `#5b9dff` (or `--media-accent-color`) | The one accent: played range, set handles, focus ring, selected marker |
| `--fl-surface-0` … `--fl-surface-3` | `#0f0f0f`, `#1e1e1e`, `#2c2c2c`, `#3a3a3a` | Neutral surfaces: behind the picture, the dock, control fill, hover |
| `--fl-on` | `#474747` | A toggle that is on |
| `--fl-text`, `--fl-text-dim` | `#f2f2f2`, `#9c9c9c` | Text and secondary text |
| `--fl-bevel` | `1` | Strength of the tactile treatment in the dock; `0` is flat |
| `--fl-stage-ratio` | `16 / 9` | The picture's stage in the dock layout |
| `--fl-frame-border` | `0` | `1` draws a hairline and a 10 px radius around the player |

The skin also publishes `--fl-picture-x`, `-y`, `-w`, `-h` (the picture's rectangle) on the container.

### Browser support

The floor the code is written for: Chrome and Edge 111, Firefox 121, Safari and iOS 16.4.

Checked with scripted browser checks (the Viewer gate, every script in `scripts/browser-checks/`, the configurator page checks and an axe audit) in Playwright's three engines on macOS. WebKit in Playwright is close to Safari but not the same build, and Safari 16.4 cannot be emulated. iOS Safari and real touch devices were not run.

| | Chrome 157 (headless) | Firefox 159 (Playwright) | WebKit (Playwright, Safari 27 build) |
| --- | --- | --- | --- |
| Viewer gate, menus, focus order, help dialog | Pass | Pass. Firefox also puts the `<video>` element itself in the tab order, two stops before the seek bar | Pass |
| Frame clock | `requestVideoFrameCallback` | `requestVideoFrameCallback`; it reports the seek time rather than the frame's start, which the clock allows for. Ten steps land on frame 10 | `requestVideoFrameCallback`; ten steps land on frame 10 |
| Zoom: `image-rendering: pixelated` on video, guides counter-scale | Pass | Pass | Pass |
| Grab frame | Pass | Pass. "Copy frame image" is disabled with a hint where `ClipboardItem` is missing (Firefox before 127) | Pass. Two grabs of the same paused frame can differ in a few pixel values |
| Rendition note while zoomed | Pass | After a manual switch to the best rendition, Video.js can keep reporting the previous one, so the note can lag | Pass. Playwright's WebKit plays the Mux stream through hls.js, as Chrome does; Safari proper may use native HLS, where the quality list and the note may stay empty |
| Error dialog: Retry on a broken source | Pass | Pass | Pass |
| A pointer click on a button | Focuses it | Focuses it | Does not focus it (Safari's convention); keyboard focus is unaffected |

Accessibility, in short:

- Keyboard: every control, the YouTube key map in both tiers; `Shift+?` lists the keys that are live.
- Names and roles: tooltips match accessible names; menus are real menus; the timeline and the handles are sliders read as timecode; one live region announces actions.
- Contrast: text 4.5:1, controls and focus 3:1, checked by `node scripts/contrast.mjs`. Under `prefers-contrast: more`, secondary text reaches 7:1, lines 3:1, and the focus ring is 3 px.
- `forced-colors` (Windows High Contrast): system colours, bordered buttons and menu items, Highlight for checked states and the range band.
- `prefers-reduced-motion`: no transitions or animations in the skin or on the page.
- Targets at least 24 px, 44 px on touch.
- axe-core (`@axe-core/playwright`): zero violations on the page (dark only, at desktop and phone width), in Studio with the Guides menu, the Zoom menu and the help dialog open, and in the Viewer.

**Language:** the skin's own strings (Studio controls, tooltips, announcements, the help dialog) are English only. Video.js's own components follow the player's locale.

### Frame accuracy

Frame numbers are best effort. Where the browser has `requestVideoFrameCallback`, the skin reads the media time of each presented frame; elsewhere it samples `currentTime`, which is approximate. Both depend on the `fps` you pass. The skin does not guarantee frame accuracy.

## Demo media

Every source the demo can play is an entry in `apps/preview/src/frame/media.ts`: a Mux playback ID (or a URL), the frame rate, and the files that go with it (captions, chapters, markers, poster). Both pages read it, and the frame rate always comes from the entry.

**To switch the demo to another source, change one line** in that file:

```ts
export const ACTIVE_SOURCE: SourceName = 'cosmicDawn'; // was 'reel'
```

- `reel` (active): the author's reel on Mux, 56 s, 1920×1080, 24 fps, with a burned-in timecode. Its chapters in `apps/preview/public/demo/reel/` are the reel's 13 sections and its markers are 14 simulated review notes; it has no captions (`captions.vtt` there is a placeholder the entry does not load).
- `cosmicDawn`: NASA's Cosmic Dawn trailer on Mux, 30 fps. Files in `apps/preview/public/demo/cosmic-dawn/`.

`?media=reel` (or `plain`, `nocors`, `error`) plays another entry without a code change. Every entry sets Video.js's `capRenditionToPlayerSize` to `false`, so automatic quality is not held to the player's size; `?cap=1` puts the cap back for testing.

## Develop

```sh
npm run dev
```

The site root (`/`) is the configurator page (`apps/preview/index.html`, `src/page/`). The CLI's workbench is at `/workbench.html`: it opens the skin in a slimmed-down version of the Video.js sandbox. The page it frames, `/preview.html`, is a monitor: a top bar with the tier and density switches and the player as large as the window allows. It opens in Studio; `?tier=viewer`, `?density=compact`, `?layout=dock|overlay`, `?guides=title-safe,9:16` (the host's guide list; `?guides=0` for none), `?zones=0` and `?debug` (debug readout and event log) set its state. It plays the active demo source (see Demo media). The options panel sets the player's width and aspect ratio, the color scheme, text direction, and language, and playback options such as autoplay, muted, loop, and preload. The arrow button opens the preview on its own. The settings live in the URL, so a link such as `/workbench.html?width=384&ratio=9:16&dir=rtl&locale=ar` opens the workbench in that state, and `/preview.html#width=384&ratio=9:16` opens the preview alone.

`/embed.html` is the player alone, for an iframe on another site, including a plain HTML one: comfortable density, no title and no switches. Without parameters it plays the active demo source in Studio. The URL can name your own video and tier:

| Parameter | What it does |
| --- | --- |
| `src` | An http(s) URL of an HLS stream (`.m3u8`) or a file such as an `.mp4`. Encode it with `encodeURIComponent` |
| `mux` | A Mux playback ID instead of `src`; adds hover thumbnails and a poster |
| `tier` | `viewer` or `studio` (default) |
| `fps` | Frame rate of the source; default 24 |
| `poster` | An http(s) URL of a poster image |

In Viewer the video loads without `crossorigin`, so a file plays from a host that sends no CORS headers. Studio sets it so frames can be grabbed, and then the host must send CORS headers. An HLS stream needs CORS headers in both tiers.

```html
<iframe src="https://frameline.artmarchuk.me/embed.html?tier=viewer&src=https%3A%2F%2Fexample.com%2Freel.mp4"
        style="width:100%;aspect-ratio:16/9;border:0"
        allow="fullscreen; picture-in-picture; clipboard-write" title="Showreel"></iframe>
```

The page fills the frame's width and fits its height (on a short frame the picture letterboxes). In Viewer an iframe at 16:9 fits the player exactly. For the whole Studio player at 16:9 give the iframe a height of about width × 9/16 plus the dock (117 px at 640 px wide and up, about 180 px below that), with `allow="fullscreen; clipboard-write"` so fullscreen and the copy-link button work.

## Deploy

```sh
npm run deploy
```

This project deploys to **Vercel** with `npm run deploy vercel` (Netlify is the fallback: `npm run deploy netlify`). Without a host name, the script asks where to deploy the workbench: Vercel, Netlify, or Cloudflare Pages. The first time, the host's CLI signs you in and creates the project, then every run prints the URL. In this project `deploy:vercel` already passes `--prod`, because Vercel's preview URLs ask visitors to log in by default. Netlify still deploys to a preview URL; add `--prod` to `deploy:netlify` if you switch hosts.

To deploy on every push instead, put the project on GitHub and import it on Vercel or Netlify; `vercel.json` and `netlify.toml` already describe the build. The build uses relative URLs, so `dist/` also works on any static host, including in a subfolder.

## Where things live

- `src/`: the skin.
  - `src/pro/`: `FramelineSkin`, feature flags, the pro store, the frame clock and timecode utilities. The Studio controls load lazily from `studio/`.
  - `src/video/`: the skin component and its parts.
  - `src/styles/`: theme tokens and shared styles the skin imports, when it started from a packaged skin.
  - `src/skin.css`: global styles for the skin.
- `apps/preview/`: the workbench that previews the skin. You don't need to change it.
  - `src/shell/`: the Shadcn shell.
  - `src/frame/`: the page the shell frames. `player` mounts your skin in a player and sets the media it plays.
  - `public/demo/`: the files of each demo source: chapters, captions, markers.
- `vercel.json`, `netlify.toml`: how those hosts build the workbench.
- `skin.json`: what this skin is built from. Keep it; it records the Video.js version the skin was created with.

## Licence

Apache 2.0, copyright 2026 Artem Marchuk. See [LICENSE](LICENSE).

## Learn more

- [Build your own skin](https://videojs.org/docs/framework/react/guides/build-your-own-skin)
- [Customize skins](https://videojs.org/docs/framework/react/guides/customize-skins)
- [UI components](https://videojs.org/docs/framework/react/guides/ui-components)
