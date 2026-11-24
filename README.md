# Frameline — a Video.js skin for video creators

Frameline is a player skin for Video.js v10 (React, plain CSS) built for the tools video creators use: editors, AI video generators, and review platforms. One skin has two tiers: **Viewer**, the clean player a creator's client or audience gets, and **Studio**, the creator's own monitor for making, checking and reviewing video. Finer control comes from feature flags: switch a single feature on over Viewer, or off over Studio.

**Live:** https://frameline.artmarchuk.me is the configurator page: pick a tier, switch features, copy the snippet. The player alone, as a monitor, is at [`/preview.html`](https://frameline.artmarchuk.me/preview.html).

**What it does:** see [FEATURES.md](FEATURES.md) for the full list, with where to find each thing. **Author:** Frameline is designed, built and maintained by Artem Marchuk. Claude helped with the design thinking, specs and code; every decision and review is Artem's. **Licence:** Apache 2.0.

## Install

```sh
npm install videojs-frameline
```

Frameline is a skin for Video.js v10 in React. It needs these next to it, as peer dependencies:

| Package | Range | Why this range |
| --- | --- | --- |
| `react`, `react-dom` | `^19.3.0` | |
| `@videojs/react`, `@videojs/core`, `@videojs/utils` | `>=10.4.0 <10.7.0` | Tested at both ends, 10.4.0 and 10.6.0. Video.js 10 has renamed public things between minor versions, so the next minor is added after it has been tested |

There is no CSS to import: each part of the skin brings its own stylesheet, and your bundler loads it with that part. The Viewer's stylesheet comes with the skin; the Studio's arrives only when a Studio feature is on.

```tsx
// Viewer: the clean player for a client or an audience.
import { MuxVideo } from '@videojs/react/media/mux-video';
import { VideoPlayer } from '@videojs/react/video';
import { FramelineSkin } from 'videojs-frameline';

<VideoPlayer>
  <FramelineSkin fps={24}>
    <MuxVideo src="https://stream.mux.com/….m3u8" playsInline />
  </FramelineSkin>
</VideoPlayer>;
```

```tsx
// Studio: the creator's monitor. Give it the source's frame rate, and CORS so frames can be grabbed.
import { MuxVideo } from '@videojs/react/media/mux-video';
import { VideoPlayer } from '@videojs/react/video';
import { FramelineSkin } from 'videojs-frameline';

<VideoPlayer>
  <FramelineSkin tier="studio" fps={24}>
    <MuxVideo src="https://stream.mux.com/….m3u8" playsInline crossOrigin="" />
  </FramelineSkin>
</VideoPlayer>;
```

`MuxVideo` needs `@videojs/mux-video` (any other Video.js media element works the same way). The package is ESM only, ships its type declarations, and marks its entry `'use client'` for React Server Components hosts such as Next.js.

**Versioning.** 0.x: a breaking change bumps the minor version and is listed in [CHANGELOG.md](CHANGELOG.md). Peer ranges cover only tested versions.

## Use the skin

`FramelineSkin` is the entry point. Put it inside a Video.js player, with the media element as its child.

```tsx
import { MuxVideo } from '@videojs/react/media/mux-video';
import { VideoPlayer } from '@videojs/react/video';
import { FramelineSkin } from 'videojs-frameline';

<VideoPlayer>
  <FramelineSkin tier="studio" fps={24} features={{ grabFrame: false, guides: ['title-safe', '9:16'] }}>
    <MuxVideo src="https://stream.mux.com/….m3u8" playsInline crossOrigin="" />
  </FramelineSkin>
</VideoPlayer>;
```

With `tier="viewer"` (the default) and no flags, it is the clean Viewer player and downloads no pro code. Pro code is split into chunks that load only when a feature needs them.

### Tiers

| Tier | For | What it is |
| --- | --- | --- |
| `viewer` (default) | The creator's client or audience | Controls over the picture: seek bar, Play, mute and volume, time, captions, More (the settings menu), picture-in-picture, fullscreen. Loads no pro code |
| `studio` | The creator | Controls in a dock below the picture: a compact ruler timeline with draggable In and Out handles, frame-by-frame transport, timecode, markers, guides and crop masks over the picture, zoom to check detail, and the Markers, Capture and Guides menus |

Viewer is for watching. Studio is for checking timing and framing: it adds controls and overlays around the picture and never processes the picture.

### API conventions

One rule set decides every public name, now and later:

1. **One noun per concept, the same everywhere.** A feature has the same noun in its flag, its event, its `apiRef` method and its exported type: `range`, `onRangeChange`, `setRange`, `FramelineRange`.
2. **Flags are nouns** for the feature as the user sees it: `range`, `cuts`, `markers`, `zoom`.
3. **Events** are `on<Noun>Change` when state changed (`onRangeChange`) and `on<Noun><Verb>` when the user did something (`onMarkerSelect`, `onFrameGrab`).
4. **`apiRef` methods are verbs:** `set<Noun>` for state, a plain verb for an action (`seek`, `step`, `pan`).
5. **Exported types start with `Frameline`**, so they never clash with DOM or app types (`Range`, `Marker`, `Layout`).
6. **Ids use US spelling and plain characters** (`center`). A label on screen may differ from its id ("Centre cross").
7. **The words on screen stay the same.** "In" and "Out" in the player, "range" in code.

The public surface is what the package exports (`src/pro/index.ts` in this repo): `FramelineSkin`, its props and slots types, `FramelineApi`, the event payload types, the id and level types, and the constants `TIERS` and `GUIDE_IDS`. Anything else in `src/` is internal and can change without notice.

### Props

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `tier` | `FramelineTier`: `'viewer' \| 'studio'` | `'viewer'` | The bundle of features to start from |
| `features` | `FramelineFeatureOverrides` (see "Feature flags") | none | Single features on or off, on top of the tier |
| `fps` | `number` | `24` | Frame rate of the source. The browser does not expose it, so frame numbers depend on it. Pass `29.97` or `30000 / 1001` for NTSC rates |
| `startTimecode` | `string` | `'00:00:00:00'` | Timecode of the first frame |
| `dropFrame` | `boolean` | `false` | Drop-frame timecode; only for 29.97 and 59.94 |
| `markers` | `FramelineMarker[]`: `{ time, label, end?, id? }` | none | The host's markers, times in seconds. The skin shows and navigates them; it never creates or stores them |
| `linkUrl` | `FramelineLinkUrl`: `string \| ((position: FramelineLinkPosition) => string \| null)` | the page's URL | What Copy link copies. See "Links to a frame" |
| `layout` | `FramelineLayout`: `'dock' \| 'overlay'` | `'overlay'` for Viewer, `'dock'` for Studio | Where the controls sit: in a dock below the picture, or over it. See "Layout" |
| `density` | `FramelineDensity`: `'comfortable' \| 'compact'` | `'comfortable'` | Control spacing. Touch always gets comfortable, with 44 px targets |
| `slots` | `FramelineSkinSlots`: `{ toolbarStart?, toolbarEnd?, overlay? }` | none | Host UI: in the control bar after the transport and time controls, in the control bar before the playback controls, and over the picture (visual only) |
| `apiRef` | `Ref<FramelineApi>` | none | A handle for driving the Studio tools from your own UI. See "Driving the player" |
| `persist` | `boolean \| string` | `true` | Remember the end user's Guides choices and the time display in `localStorage`. `true` uses the key `frameline:v1`, a string uses that key, `false` turns it off |
| `debug` | `boolean` | `false` | Shows the debug readout (see "Debug readout"). `?debug` in the page URL does the same |
| `renderPoster`, `renderThumbnail` | the `render` prop of Video.js's `Poster` image and `Slider.Thumbnail.Image` | none | Draw the poster, or the storyboard frame in the seek preview, yourself |
| `children` | `ReactNode` | required | The media element, for example `<MuxVideo src="…" />` |
| `onRangeChange`, `onMarkerSelect`, `onFrameChange`, `onCopyLink`, `onGuidesChange`, `onZoomChange`, `onFrameGrab` | functions | none | See "Events" |

Any other prop (`className`, `style`, `data-*`) goes to the Video.js container element.

An invalid `fps`, an unknown tier, an unknown feature name or a `linkUrl` that is not a URL logs one warning in development and falls back to the default. Nothing throws.

`startTimecode` and `dropFrame` shape the timecode display and links.

### Events

Events are callback props. The skin dispatches no DOM events.

| Prop | Payload | Default | Fires when |
| --- | --- | --- | --- |
| `onRangeChange` | `FramelineRange`: `{ in: number \| null, out: number \| null }`, seconds | none | The In or Out point changes: on `I` and `O`, when a handle drag is released, on Reset range, on `apiRef.setRange` |
| `onMarkerSelect` | `FramelineMarker`: `{ time, label, end?, id? }` | none | The user selects a marker: a pin, the Markers menu, or previous/next cut landing on one |
| `onFrameChange` | `FramelineFrameInfo`: `{ frame: number, time: number }` | none | The current frame number changes. Every frame while playing, so keep the handler light |
| `onCopyLink` | `FramelineCopyLinkInfo`: `{ url: string, frame: number, time: number, timecode: string }` | none | The skin itself copied a link to the current frame. Not fired when the clipboard refused, or when a `linkUrl` function returned `null` |
| `onGuidesChange` | `FramelineEffectiveGuides`: `{ guides: string[], crop: string \| null, zones: string \| null }` | none | The guides that are drawn change. Not fired for the remembered set the player starts with |
| `onZoomChange` | `FramelineZoomLevel`: `'fit' \| '100' \| '150' \| '200' \| '400'` | none | The zoom level changes |
| `onFrameGrab` | `FramelineFrameGrabInfo`: `{ frame, time, timecode, width, height, target: 'file' \| 'clipboard', fileName? }` | none | A frame was downloaded as a PNG or copied as an image |

### Driving the player

`apiRef` gives your own UI a handle on the Studio tools: a comment that jumps to its range, a "check the safe area" button.

```tsx
const frameline = useRef<FramelineApi>(null);

<FramelineSkin tier="studio" fps={24} apiRef={frameline}>…</FramelineSkin>

frameline.current?.setRange({ in: 12, out: 16 });
frameline.current?.setGuides({ guides: ['title-safe'], crop: null, zones: null });
```

| Method | Argument | Needs the flag | What it does |
| --- | --- | --- | --- |
| `seek(time)` | `number`, seconds | none | Seeks to the frame that contains `time` |
| `step(frames)` | `number` | `frameStep` | Steps that many frames from the current one; negative steps back. Pauses first |
| `setRange({ in, out })` | `{ in: number \| null, out: number \| null }`, seconds | `range` | Sets In and Out; `null` leaves that side open |
| `setLoop(on)` | `boolean` | `loop` | Loop on or off; it is on from the start |
| `setGuides({ guides?, crop?, zones? })` | `FramelineGuidesInput` | `guides` (and `zones` for the zones) | Sets what is drawn. `guides` is the full list of checkbox guides to have on; fields left out are not changed |
| `setZoom(level)` | `FramelineZoomLevel` | `zoom` | `'fit'`, `'100'`, `'150'`, `'200'` or `'400'` |
| `pan(direction)` | `'left' \| 'right' \| 'up' \| 'down'` | `zoom` | Moves the zoomed view a tenth of what is visible. Does nothing at Fit |
| `grabFrame()` | none | `grabFrame` | Downloads the current frame as a PNG |

The handle is `null` in the Viewer tier and until the pro code has loaded. A call for a feature that is switched off does nothing. Calls are not announced to screen readers: your own control should say what it did. The matching event fires as it does for the user's own action.

### Feature flags

| Flag | Type | Viewer | Studio | What it adds |
| --- | --- | --- | --- | --- |
| `timecode` | `boolean` | off | on | The timecode display, with a frames or seconds choice |
| `frameStep` | `boolean` | off | on | Step one frame, jump ten |
| `range` | `boolean` | off | on | In and Out points with handles on the timeline; a set range confines playback |
| `loop` | `boolean` | off | on | Loop the range, or the whole video |
| `markers` | `boolean` | off | on | The host's markers as pins, and the Markers menu |
| `cuts` | `boolean` | off | on | Previous and next cut (chapters, or markers) |
| `grabFrame` | `boolean` | off | on | Grab the current frame as a PNG, or copy it as an image |
| `copyLink` | `boolean` | off | on | Copy a link to the current frame |
| `guides` | `boolean \| string[]` | off | all | The Guides menu: `true` (all), `false`, or the list of ids to offer |
| `zones` | `boolean` | off | on | Platform zones in the Guides menu (needs `guides`) |
| `zoom` | `boolean` | off | on | Zoom to the source's pixels, and pan |

A host can turn any single feature on over Viewer or off over Studio, for example `<FramelineSkin tier="viewer" features={{ timecode: true, frameStep: true }} />`.

`guides` takes a list of these ids (the constant `GUIDE_IDS`): `title-safe`, `action-safe`, `thirds`, `center`, `9:16`, `4:5`, `1:1`, `2.39`, `1.85`. `zones` offers the zone sets `shorts`, `reels` and `tiktok`. See "The Guides menu".

### When a chunk fails to load

The Studio code arrives in separate chunks. If one of them cannot load, the player carries on as the Viewer: the overlay bar with play, seek, volume, captions, settings and fullscreen. It announces "Studio tools could not load. The player works without them." once, and the settings menu offers "Retry loading Studio tools" once. A retry that works brings Studio back where the video was, paused or playing, puts focus on the settings button and announces "Studio tools loaded." Nothing else in your React tree is affected. If only the debug readout fails, Studio stays and the readout is absent.

The error is in the console once: React logs what an error boundary catches (through your root's `onCaughtError`, which logs to the console unless you set your own), and the skin logs a failed retry.

The usual cause is a deploy: the page a visitor has open belongs to the old build, and the old chunks are gone from the server. A retry cannot fix that; a reload can, and that decision is yours, so the skin never reloads the page. There is no `onError` prop: Frameline's chunks are part of your build, so your bundler's own event covers them. With Vite:

```ts
window.addEventListener('vite:preloadError', () => {
  window.location.reload(); // once: guard it with a flag in sessionStorage
});
```

### Debug readout

`debug`, or `?debug` in the page URL, puts a small readout over the picture: tier, layout, the flags that are on, `fps`, the current frame and timecode, the clock source, the range and Loop, and two playback figures. **measured fps** is the number of frames the browser presented over the last second (from `requestVideoFrameCallback`), to compare with the `fps` you passed; **dropped** is the decoder's dropped and total frames (from `getVideoPlaybackQuality()`). Both update twice a second and show "—" where the browser lacks the API. The readout is a development tool in its own lazy chunk; it is not a feature flag.

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
   - **Right:** the **Markers**, **Capture** and **Guides** menus and the **Zoom** button, then **playback**: captions, More (the settings menu), mute with a short volume slider, fullscreen. Picture-in-picture is in the More menu.

The menus open upward and are real menus: arrow keys, Enter, Escape, and focus returns to the button.

- **Markers** lists the host's markers with their timecodes, and the media's chapters under a second heading. Choosing one seeks to it.
- **Capture:** the image actions. Grab frame (downloads a PNG, `G`) and Copy frame image (`Shift+G`). The button is not shown with `grabFrame: false`.
- **Guides:** guides, crop masks and platform zones. See "The Guides menu".
- **Zoom:** a text button that shows the level ("Fit", "150%") and opens the list of levels. See "Zoom".

The row follows the player's own width. It is one row down to 740 px, shedding in this order: the volume slider (under 1100 px), the duration text (1040), the captions button (940; `C` and the More menu remain), the menu chevrons (900), the count badges (820). **Under 740 px, and on any touch device**, it is two rows. Row one: the timecode, step back, step forward, Play, previous cut, next cut (under 350 px the cut buttons step aside; `[` `]` and the Markers menu still work). Row two is one row of equal cells, each a 44 px target: **Markers, Loop, Capture, Link, Guides, Zoom, More, Fullscreen**. There are no In and Out buttons there: the range is set with the handles on the timeline, and `I` and `O` still work from a keyboard. Mute is in the More menu. Eight cells need a 382 px player, so the row folds: under 382 px the Zoom button is not shown (`Z`, `Shift+Z` and `apiRef.setZoom` still zoom), and under 340 px the Link button is not shown and "Copy link at timecode" is an item of the More menu. Under 300 px the side padding is 12 px instead of 15, and under 288 px the cells are 40 px wide (still 44 px tall), so the six cells fit down to a 264 px player.

### The timeline

In the Studio tier the seek bar is a compact ruler timeline, about 46 px tall. It is still the Video.js `TimeSlider`, so it is a normal slider for the keyboard, the pointer and assistive technology; its value is read as timecode.

- **Ruler:** tick intervals follow the duration, the width and `fps`. Labels are compact and seconds-first (`10s`, `1:30`, `1:00:00`).
- **Playhead:** a white line with a small head on the ruler. There is no permanent time bubble: the current timecode is in the main row. A small bubble with the full timecode (and the storyboard thumbnail, when the media has one) appears while the pointer hovers the timeline or drags something.
- **Seeking snaps to frames.** Every seek lands in the middle of a frame, the same rule frame stepping uses. Best effort, like all frame numbers here.
- **Keys on the focused seek slider:** `←` `→` step one frame while paused and seek 5 s while playing; `Shift+←` `Shift+→` jump 10 frames; `Home`, `End`, `PageUp`, `PageDown` as on any Video.js slider.
- **Chapters** show as gaps in the track and feed previous/next cut.

### The range: In and Out

The range lives on the timeline, like the work-area bar of an editor. **Two handles are always there**, one at each end of the track. While a point is not set its handle is neutral and the range is the whole video; move a handle and it takes the accent, and a band shows the range: one solid band, with the playhead showing the position.

- **Drag** a handle to set the point. It snaps to frames, and magnetically to the playhead and to markers when it comes within 5 px of them. Drag it back to its end of the track, or **double-click** it, to unset the point.
- **Keyboard:** each handle is a slider named "In point" or "Out point". Focused: `←` `→` move it one frame, `Shift+←` `Shift+→` ten, `Home` `End` go to its limits, `Delete` or `Backspace` unsets it.
- **`I` and `O`** set In and Out at the current frame from anywhere in the player; `Shift+I` and `Shift+O` unset them.
- **Touch and narrow players** set the range with the handles, which are 44 px targets there.

**Why both.** On most timelines a pixel covers more than one frame (60 s at 24 fps is 1440 frames across about 1250 px), so dragging is the coarse tool. For an exact frame, step to it and press `I` or `O`, or focus a handle and nudge it with the arrow keys.

`onRangeChange` fires when a drag is released, not while it moves, with `{ in, out }` in seconds; a point that is not set is `null`. In is always before Out: a handle dragged past the other swaps the two, and both points cannot sit on one frame.

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
| Composition | Rule of thirds (`thirds`), Centre cross (`center`) | Independent |
| Crop | None, 2.39:1 (`2.39`), 1.85:1 (`1.85`), 1:1, 4:5, 9:16 | One at a time. Dims the picture outside a centred crop of that ratio |
| Platform zones | None, YouTube Shorts (`shorts`), Instagram Reels (`reels`), TikTok (`tiktok`) | One at a time. Shows where the app's own interface covers a vertical video: a top bar, captions and profile, and the buttons on the right |
| Footer | Hide guides / Show guides, `Shift+V` | Switches everything off, and brings the same set back |

- Toggling keeps the menu open, so several guides can be switched in one visit. Escape closes it and focus returns to the Guides button, whose badge counts what is on (its accessible name says "Guides, 3 guides on").
- **Platform zones are approximate**, and the menu says so on every platform. Apps change their layouts, and the layout depends on the caption and on whether the video is an ad; check the platform's current guidance before you deliver. Where sources disagree, the largest unsafe margin is used, so a guide never promises space the app may cover. The numbers are in one file, `src/pro/studio/guides/platform-zones.ts`, in percent of the 9:16 frame.
- Zones are drawn inside the 9:16 frame: the whole picture when the video is 9:16, otherwise a centred 9:16 crop. So **choosing a platform turns on the 9:16 crop**, and choosing another crop clears the zones.
- Labels (Title safe, Action safe, the zone names) are hidden on a picture narrower than 480 px.

**What the host controls.** `features.guides` restricts the menu: with `guides: ['title-safe', '9:16']` only those two are offered, a section with nothing left disappears, and `guides: false` removes the Guides button. `zones: false` removes that section. Zoom is a separate control with its own flag.

```tsx
<FramelineSkin
  tier="studio"
  features={{ guides: ['title-safe', 'action-safe', '9:16'], zones: false }}
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

**Which rendition you are looking at.** An adaptive stream (HLS) may play a smaller rendition than the source: the engine picks one for the connection and, by default, for the player's size. 100% then means 100% of *that* rendition. Two places say so. More → Quality shows what Auto is playing ("Auto (720p)", from Video.js). And while zoomed with a rendition below the best one the stream offers, the chosen level in the Zoom menu and the announcement add it: "100% · showing 720p". While zoomed with Quality on Auto, the skin lifts that player-size cap (`capRenditionToPlayerSize` in the media's `source`, a Video.js option) so the engine may pick a higher rendition by bandwidth, and puts the host's value back at Fit; it never selects a rendition itself and leaves a quality picked by hand alone. This changes what is fetched from then on: **a frame you paused on keeps the rendition it was buffered in** until playback or a seek fetches it again, and the note says which one that is. To be sure of the source's own pixels, pick the top rendition in Settings → Quality.

### Links to a frame

The link button beside the timecode (or `S`) copies a link to the frame on screen. By default that is the page URL (origin, path and query) with the position in its hash, beside anything else the host app keeps in the hash:

```
https://example.com/review/42#t=62.104&tc=00:01:02:02
```

`t` is the position in seconds as [Media Fragments](https://www.w3.org/TR/media-frags/) defines it (the middle of the frame, to the millisecond), so any tool that reads media fragments opens the right second. `tc` is the timecode on screen, with `startTimecode` applied and `;` before the frames in drop-frame, so Frameline opens the exact frame. The button shows a check for a moment and the copy is announced with the timecode; `onCopyLink` reports it. `copyLink: false` removes the button and the key.

A page opened with a link seeks to that frame, paused, also when the host autoplays: a `play()` that isn't the user's is paused again until half a second after that seek has landed (a later one plays as usual). With `preload="none"`, pressing Play plays from the linked frame. It reads, in this order, and takes the first value that falls inside the media:

1. `tc`, a timecode (`;` or `.` before the frames means drop-frame);
2. `t` holding a timecode, `#t=00:01:02:02`: links copied before `tc` existed keep opening;
3. `t` in seconds, in any Media Fragments form: `62.5`, `npt:62.5`, `1:02.5`, `0:01:02.5`;
4. `t` in the shorthand video platforms use: `90s`, `1m42s`, `1h2m3s`.

A range (`t=10,20`) opens on its start. When `tc` and `t` disagree by more than a frame, `tc` wins and a development build logs a warning (usually a wrong `fps` or start offset). Anything it can't read is ignored. The fragment never reaches the server, so a link preview in a chat tool can't show the exact frame.

#### `linkUrl`: the host owns the link

The page a creator is on is often not the page to share: the review lives at another address, the app uses a hash router, or sharing goes through the app's own dialog. `linkUrl` covers all three.

| `linkUrl` | What is copied |
| --- | --- |
| not given | The page's URL with the position in its hash, as above |
| a string | That URL as the base, with the position in its hash beside the hash keys it already has. It is resolved against the page, so a relative path works (`/share/abc`). A string that is not a URL falls back to the page's URL, with one warning in development |
| a function | It is called with a `FramelineLinkPosition` when the user copies. A string it returns is the full URL, copied as it is. `null` means your app handled the action itself. If it throws or returns anything else, nothing is copied, the failed copy is announced as for a refused clipboard, and development logs a warning |

```tsx
// Another base: the public page of this video.
<FramelineSkin tier="studio" linkUrl="https://example.com/watch/42">…</FramelineSkin>

// A hash router: build the whole link.
<FramelineSkin tier="studio" linkUrl={({ fragment }) => `https://example.com/#/review/42?${fragment}`}>…</FramelineSkin>

// Your own share dialog: take the position and return null.
<FramelineSkin tier="studio" linkUrl={(position) => { openShareDialog(position); return null; }}>…</FramelineSkin>
```

`FramelineLinkPosition`, what the function receives:

| Field | Type | Holds |
| --- | --- | --- |
| `fragment` | `string` | The finished pair without `#`: `t=62.104&tc=00:01:02:02`. Append it to your own hash (`#${fragment}`, or `&${fragment}` after your own keys). The format is Frameline's; use it as it is and do not rebuild it from the other fields |
| `frame` | `number` | The frame index, from 0 |
| `time` | `number` | The frame's start time in seconds, as in `onFrameChange` |
| `timecode` | `string` | The timecode on screen (start offset and drop-frame applied) |

**The function is synchronous.** A clipboard write must happen within the user's gesture, and Safari refuses one that arrives after an `await`. A function that returns a promise counts as a failed copy.

When your function returns `null`, Frameline announces nothing. Your own control must tell the user what it did, for example by opening a dialog that takes focus, or through a live region. The skin then also shows no check on the link button and does not fire `onCopyLink`.

**Embedded players.** The [embed page](#develop) passes no `linkUrl`: inside an iframe it copies its own URL, with the query that names the video and the tier, plus the position. Opened in a tab, that link shows the same video paused on the same frame, without the page around it. A page that embeds the player should give the iframe `allow="clipboard-write"`: without it browsers may refuse the copy, and the player then says so.

### Grabbing frames

Grab frame (in the Capture menu, or `G`) saves the raw frame at the video's own resolution, without guides or adjustments. The browser only allows this when the video is loaded with CORS: set `crossOrigin` on the media element and serve CORS headers (Mux does). Otherwise the skin says the host does not allow frame capture.

### Styling hooks

The player container carries `data-tier`, `data-density`, `data-layout`, `data-bar="pro"` while pro controls are in the bar, `data-dock-size` (`wide` or `narrow`) in the Studio tier, one attribute per guide that is drawn, such as `data-guide-title-safe` or `data-guide-9-16` (`:` and `.` become `-`), `data-crop="9-16"`, `data-zones="tiktok"`, and `data-zoom="100"`, `"150"`, `"200"` or `"400"` while zoomed. The picture's rectangle inside the stage is published as `--fl-picture-x`, `--fl-picture-y`, `--fl-picture-w` and `--fl-picture-h` (CSS pixels); the overlay layer, and with it the `overlay` slot, is sized to it in the Studio tier. The look is driven by the `--fl-*` tokens in `src/styles/tokens.css` and the public `--media-*` tokens.

**The look:** calm, truly neutral dark surfaces (R = G = B, so the surround adds no cast to the picture; the dock is a dark matte grey, the display and the timeline groove darker still) and the system UI typeface (no webfont), with tabular numerals for every changing number. One soft blue accent (`--fl-accent`, or `--media-accent-color`) is a signal, not a fill: it appears only on the In/Out handles once they are set, on a selected marker, on the focus ring, and as the small light of a mode that is on in the dock (`--fl-led`). The range band is one neutral grey band. The Viewer's progress bar is white. In the dock a mode that is on shows the light (Loop, a key, also stays pressed in); over the picture (the overlay layout) a toggled-on control uses a lighter grey fill (`--fl-on`). Play is a neutral filled button, and the playhead is white.

**Tactile, in the dock only.** Three kinds of control: keys (the transport and Loop) are filled and slightly raised; the display (the timecode field with its link button) is one recessed well; the rest of the row is a flat toolbar that takes a flat fill on hover. The transport is a keybed: one raised housing whose keys (previous cut, step back, Play in white, step forward, next cut) are tiles butted together, with 1 px seams between them; Loop is a separate key beside it. A key that is on, any control whose menu is open and any control while held read as pressed in. A mode that is on (Loop, Zoom above Fit, captions) shows a light: a 4 px dot in `--fl-led` under its icon; a flat toolbar button that is on has the light and no fill. An open menu and a held key show no light. The track is a recessed groove, and the range band, handles and pins are solid things in it. Faces are flat: it is all 1 px edge lines and shadows scaled by one token, `--fl-bevel` (`1`; `0` is flat). Nothing of it is drawn over the picture: the overlay layout is flat, as are `prefers-contrast: more` and forced colours.

**Motion.** Nothing that shows time animates: the playhead, the timecode, the ruler, the handles and the band's ends follow the media and the pointer exactly. What does move is short: a press (60 ms in, 90 ms out), the range band fading in when a range is set (160 ms, also when the first point is set by a drag) and out when it is cleared (120 ms), with its handles changing colour over the same 160 ms, hovers and menus (120 ms; a menu closes in 70 ms). `prefers-reduced-motion` sets every duration to zero.

### Host page styles

The skin's CSS lives in cascade layers (`base`, `components`, `utilities`). Unlayered styles beat layered ones whatever their specificity, so an unlayered element selector on the host page, such as `kbd { … }`, `button:focus-visible { … }`, `p { margin: 0; padding: 0 }` or `* { box-sizing: border-box }`, reaches into the player and overrides it. Scope such rules to your own markup (`.my-help > kbd`), keep them out of the player (`button:focus-visible:not(:where(.media-skin *))`), or put them in a layer of your own. The site's landing page does the second (`apps/preview/src/page/landing.css`). The skin resets every box property on the shortcuts in its tooltips and menus, but that cannot beat an unlayered rule.

### Tokens

**Public tokens.** These keep their names and meaning between releases. Set them on the player or on any ancestor.

| Token | Type | Default | What it is |
| --- | --- | --- | --- |
| `--media-accent-color` | colour | `#5b9dff` | The one accent, a signal: set In/Out handles, a selected marker, the focus ring, the light of a mode that is on in the dock |
| `--media-accent-text-color` | colour | `#0b1220` | Text and icons placed on the accent |
| `--media-border-color` | colour | `#333333` | The hairline around the player (drawn with `--fl-frame-border: 1`) |
| `--media-border-radius` | length | `0`, or `10px` with `--fl-frame-border: 1` | The player's corner radius |
| `--media-spacing` | length | `4px` (a quarter of `--media-scale-unit`) | The step every size in the skin is a multiple of. The skin sets it on the player from `--media-scale-unit`, so scale the skin with that |
| `--media-object-fit` | `contain`, `cover`, … | `contain` | How the picture fits its stage |
| `--media-object-position` | position | `center` | Where the picture sits in its stage |
| `--media-controls-before-start` | `hidden` | not set | `hidden` keeps the bar away until playback starts |
| `--fl-surface-0` … `--fl-surface-3` | colour | `#0c0c0c`, `#171717`, `#2c2c2c`, `#3a3a3a` | Neutral surfaces: behind the picture and the timeline groove; the dock, every menu and dialog; control fill and a highlighted menu item; hover, tooltips |
| `--fl-text`, `--fl-text-dim` | colour | `#f2f2f2`, `#9c9c9c` | Text and icons; secondary text |
| `--fl-font-ui` | font family | the system UI stack (or `--media-font-family`) | Every piece of text in the skin |
| `--fl-radius` | length | `6px` | Buttons |
| `--fl-frame-border` | `0` or `1` | `0` | `1` draws a hairline and a 10 px radius around the player |

The first eight are Video.js's own tokens, so a host that already themes a Video.js player themes this one. The skin also reads `--media-font-family` and `--media-scale-unit` (default `16px`).

**Internal tokens.** Every other `--fl-*` token in `src/styles/tokens.css` is internal: it may be renamed or removed in any release. The file marks the public block with a comment. Some internal tokens a host may still want to try, at its own risk: `--fl-accent` and `--fl-led` (the accent and the light), `--fl-range` (the range band), `--fl-bevel` (`0` makes the dock flat), `--fl-stage-ratio` (the stage's shape in the dock layout), `--fl-text-timecode` and `--fl-timecode-weight` (the timecode's digits). Changing a colour changes its contrast: `node scripts/contrast.mjs` checks the defaults only.

The skin also publishes `--fl-picture-x`, `-y`, `-w`, `-h` (the picture's rectangle) on the container.

### Weight

Measured by `npm run check:consumer` on 23 Nov 2026 with Video.js 10.6.0: a Vite 8 production build of a React app, the same Mux stream on each page, and everything the page's scripts and stylesheets weigh before the first frame plays (Chromium's network log; gzip -9).

| Page | JS | CSS | Total gzip |
| --- | --- | --- | --- |
| Video.js's Default video skin (`VideoSkin`, `@videojs/react/video/skin.css`) | 4 files, 341,762 B gzip | 1 file, 10,691 B gzip | 352,453 B |
| Frameline, `tier="viewer"` | 5 files, 344,424 B gzip | 1 file, 7,533 B gzip | 351,957 B |
| Frameline, `tier="studio"` | 7 files, 376,430 B gzip | 2 files, 12,488 B gzip | 388,918 B |

The Viewer is 496 bytes gzip lighter than the stock skin, 0.1%: about the same weight. Most of every page is the same in all three: hls.js, React DOM and Video.js itself. The Viewer requests none of the Studio code or CSS; Studio adds 36,961 bytes gzip on top of the Viewer, loaded when a Studio feature is on.

### Browser support

The floor the code is written for: Chrome and Edge 111, Firefox 121, Safari and iOS 16.4.

Checked with scripted browser checks (the Viewer gate, every script in `scripts/browser-checks/`, the configurator page checks and an axe audit) in Playwright's three engines on macOS, last on 19 Nov 2026 with the current theme: 72 runs in each engine, 216 in all. WebKit in Playwright is close to Safari but not the same build, and Safari 16.4 cannot be emulated. iOS Safari, real touch devices and Windows were not run.

| | Chrome 157 (headless) | Firefox 159 (Playwright) | WebKit (Playwright, Safari 27.2 build) |
| --- | --- | --- | --- |
| The current theme, on screenshots of the live site at 2x: the dock at 1280, the transport keybed (rest, hover, focus), the light under Loop and Zoom, the timecode with its dimmed leading zeros, a menu over the picture and over the narrow dock, the narrow dock at 390 and 324 px | Reference | The same; the timecode is 0.04 px wider | The same; the timecode is 0.05 px narrower |
| The theme's other states, on the local build: the captions light (a test track), the keybed with shot navigation or frame stepping off, disabled cut keys (no hover fill) | Pass | Pass | Pass |
| `prefers-contrast: more` (emulated): `dock-polish`, `phone-transport`, `handle-focus-ring`, `guides-menu-focus`, `range-playback` | Pass | Pass, with the touch limit below | Pass, with the touch limit below |
| `forced-colors: active` (emulated), the same five | Pass (`dock-polish` checks the keys' shared 1 px system-colour border and Loop's Highlight fill there) | Pass, with the touch limit below | Pass, with the touch limit below |
| Touch drags on the narrow dock (`phone-transport`) | Pass | Layout passes. The check drives touch through a Chromium-only interface, so the drag was run with synthetic pointer events: the playhead wins over the In handle; the handle drag was not confirmed | As Firefox |
| Viewer gate, menus, focus order, help dialog | Pass | Pass. The media element is not a Tab stop (Firefox used to add two stops for it) | Pass |
| Frame clock | `requestVideoFrameCallback` | `requestVideoFrameCallback`; it reports the seek time rather than the frame's start, which the clock allows for. Ten steps land on frame 10 | `requestVideoFrameCallback`; ten steps land on frame 10 |
| Zoom: `image-rendering: pixelated` on video, guides counter-scale | Pass | Pass | Pass |
| Grab frame | Pass | Pass. "Copy frame image" is disabled with a hint where `ClipboardItem` is missing (Firefox before 127) | Pass. Two grabs of the same paused frame can differ in a few pixel values |
| Rendition note while zoomed | Pass | Pass | Pass. Playwright's WebKit plays the Mux stream through hls.js, as Chrome does; Safari's native HLS is not covered. The note follows the decoded picture (`videoHeight`) in every engine |
| The embed page in a cross-origin iframe (`embed-link`): playback, fullscreen (stubbed), Copy link | Pass. Without `clipboard-write` on the iframe the async clipboard refuses and the skin's selection copy still copies | Pass. Copies with and without `clipboard-write` | Pass. Copies with and without `clipboard-write` |
| Debug readout: measured fps and dropped frames | Pass | Pass | Pass |
| Error dialog: Retry on a broken source | Pass | Pass | Pass |
| A pointer click on a button | Focuses it | Focuses it | Does not focus it (Safari's convention); keyboard focus is unaffected |

Accessibility, in short:

- Keyboard: every control, the YouTube key map in both tiers; `Shift+?` lists the keys that are live.
- Names and roles: tooltips match accessible names; menus are real menus; the timeline and the handles are sliders read as timecode; one live region announces actions.
- Contrast: text 4.5:1, controls and focus 3:1, checked by `node scripts/contrast.mjs`. Under `prefers-contrast: more`, secondary text reaches 7:1, lines 3:1, and the focus ring is 3 px.
- `forced-colors` (Windows High Contrast): system colours, bordered buttons and menu items, Highlight for checked states and the range band.
- `prefers-reduced-motion`: no transitions or animations in the skin or on the page.
- Targets at least 24 px, 44 px on touch.
- axe-core (`@axe-core/playwright`): zero violations on the page (dark only, at desktop and phone width), in Studio with the Guides menu, the Zoom menu and the help dialog open, and in the Viewer; in all three engines.

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

Node.js 26 (the version in `.nvmrc`, and the one the site is built and deployed with) and npm. The tooling needs Node.js 22.12 or later; the package itself runs in the browser and asks nothing of a host's Node.js version.

```sh
npm install
npm run dev              # http://localhost:5173: the configurator; /preview.html: the monitor; /workbench.html: the CLI's workbench
npm run typecheck
npm test                 # unit tests (Vitest)
npm run build            # the site, into dist/
npm run build:lib        # the npm package, into lib/
npm run check:consumer   # packs the package, installs it in a new app outside the repo and tests it in three browsers
npm run check:browsers   # every browser check in scripts/browser-checks/manifest.mjs, in Chrome, Firefox and WebKit
npm run deploy vercel    # production; only from a clean checkout of origin/main
npm run preview:vercel   # a Vercel preview of the folder as it is
```

The site imports the skin from `src/` through a path alias, so it never needs `build:lib`. The package is built by `vite.lib.config.ts` and `tsconfig.lib.json`; `scripts/consumer/` holds the consumer check and the app it builds.

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

The page fills the frame's width and fits its height (on a short frame the picture letterboxes). In Viewer an iframe at 16:9 fits the player exactly. For the whole Studio player at 16:9 give the iframe a height of about width × 9/16 plus the dock (117 px at 640 px wide and up, about 180 px below that), with `allow="fullscreen; clipboard-write"` so fullscreen and the copy-link button work. Copy link copies the embed page's own URL with the frame (see "Links to a frame").

## Deploy

```sh
npm run deploy
```

This project deploys to **Vercel** with `npm run deploy vercel` (Netlify is the fallback: `npm run deploy netlify`). Without a host name, the script asks where to deploy the workbench: Vercel, Netlify, or Cloudflare Pages. The first time, the host's CLI signs you in and creates the project, then every run prints the URL. In this project `deploy:vercel` already passes `--prod`, because Vercel's preview URLs ask visitors to log in by default. Netlify still deploys to a preview URL; add `--prod` to `deploy:netlify` if you switch hosts.

To deploy on every push instead, put the project on GitHub and import it on Vercel or Netlify; `vercel.json` and `netlify.toml` already describe the build. The build uses relative URLs, so `dist/` also works on any static host, including in a subfolder.

## Where things live

- `src/`: the skin, and the source of the npm package. `src/pro/index.ts` is the package's entry.
  - `src/pro/`: `FramelineSkin`, feature flags, the pro store, the frame clock and timecode utilities. The Studio controls load lazily from `studio/`.
  - `src/video/`: the skin component and its parts.
  - `src/styles/`: theme tokens and shared styles the skin imports, when it started from a packaged skin.
  - `src/skin.css`: global styles for the skin.
- `apps/preview/`: the workbench that previews the skin. You don't need to change it.
  - `src/shell/`: the Shadcn shell.
  - `src/frame/`: the page the shell frames. `player` mounts your skin in a player and sets the media it plays.
  - `public/demo/`: the files of each demo source: chapters, captions, markers.
- `vite.lib.config.ts`, `tsconfig.lib.json`, `scripts/lib/`: the package build (`npm run build:lib`, output in `lib/`, not committed).
- `scripts/consumer/`: the consumer check (`npm run check:consumer`) and the host app template it uses.
- `scripts/browser-checks/`: the browser checks, their manifest and runner (`npm run check:browsers`; `run.mjs` lists the options). `.github/workflows/ci.yml` runs them in Chrome on every pull request.
- `CHANGELOG.md`: what changed in each published version.
- `vercel.json`, `netlify.toml`: how those hosts build the workbench.
- `skin.json`: what this skin is built from. Keep it; it records the Video.js version the skin was created with.

## Licence

Apache 2.0, copyright 2026 Artem Marchuk. See [LICENSE](LICENSE).

## Credits

Icons from [Phosphor Icons](https://phosphoricons.com) (MIT); see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

## Learn more

- [Build your own skin](https://videojs.org/docs/framework/react/guides/build-your-own-skin)
- [Customize skins](https://videojs.org/docs/framework/react/guides/customize-skins)
- [UI components](https://videojs.org/docs/framework/react/guides/ui-components)
