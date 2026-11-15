# Video.js PRO

Video.js PRO is a player skin for Video.js v10 (React, plain CSS) built for the tools video creators use: editors, AI video generators, and review platforms. One skin has three tiers: Share for the audience, Review for checking work frame by frame, and Studio for inspecting the image.

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
  <ProSkin tier="review" fps={24} features={{ grabFrame: false, guides: ['title-safe', '9:16'] }}>
    <MuxVideo src="https://stream.mux.com/….m3u8" playsInline crossOrigin="" />
  </ProSkin>
</VideoPlayer>;
```

With `tier="share"` (the default) and no flags, it is the clean Share player and downloads no pro code. Pro code is split into chunks that load only when a feature needs them.

**Status:** the Share tier, the Review transport and the ruler timeline are complete: frame stepping, timecode, in/out and loop, previous/next cut, markers, grab frame, copy link and poster frame. Guides and the Studio tools arrive in later steps, so `tier="studio"` currently shows the same controls as `tier="review"`.

### Props

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `tier` | `'share' \| 'review' \| 'studio'` | `'share'` | The bundle of features to start from |
| `features` | partial flags (table below) | none | Single features on or off, on top of the tier |
| `fps` | `number` | `24` | Frame rate of the source. The browser does not expose it, so frame numbers depend on it. Pass `29.97` or `30000 / 1001` for NTSC rates |
| `startTimecode` | `string` | `'00:00:00:00'` | Timecode of the first frame |
| `dropFrame` | `boolean` | `false` | Drop-frame timecode; only for 29.97 and 59.94 |
| `markers` | `{ time, label, end?, id? }[]` | none | Timeline markers, times in seconds |
| `density` | `'comfortable' \| 'compact'` | `'comfortable'` | Control spacing. Touch always gets comfortable, with 44 px targets |
| `debug` | `boolean` | `false` | Shows the debug readout. `?debug` in the page URL does the same |
| `slots` | `{ toolbarStart?, toolbarEnd?, overlay? }` | none | Host UI: in the control bar after play and volume, in the control bar before captions, and over the picture (visual only) |
| `onInOutChange` | `({ in, out }) => void` | none | The in or out point changed. Seconds, or `null` |
| `onMarkerSelect` | `(marker) => void` | none | The user selected a marker |
| `onFrameChange` | `({ frame, time }) => void` | none | The current frame number changed |
| `onCopyLink` | `({ url, frame, time }) => void` | none | A link to the current frame was copied |
| `onPosterFrame` | `({ frame, time, timecode }) => void` | none | The user chose the current frame as the poster. The host saves it; the skin stores nothing |

An invalid `fps`, an unknown tier or an unknown feature name logs one warning in development and falls back to the default. Nothing throws.

`startTimecode` and `dropFrame` shape the timecode display and links.

### Feature flags

| Flag | Share | Review | Studio |
| --- | --- | --- | --- |
| `timecode` | off | on | on |
| `frameStep` | off | on | on |
| `inOut` | off | on | on |
| `loop` | off | on | on |
| `markers` | off | on | on |
| `shotNav` | off | on | on |
| `grabFrame` | off | on | on |
| `copyTimecodeLink` | off | on | on |
| `posterFrame` | off | on | on |
| `guides` | off | all | all |
| `platformZones` | off | on | on |
| `channels` | off | off | on |
| `gainGamma` | off | off | on |
| `zoom` | off | off | on |
| `infoHud` | off | off | on |
| `debug` | off | off | off |

`guides` takes `false`, `true` (all) or a list of ids: `title-safe`, `action-safe`, `thirds`, `centre`, `9:16`, `4:5`, `1:1`, `2.39`.

### Review shortcuts

These are added to the YouTube map in the Review and Studio tiers. Each works only while its feature is on, and `Shift+?` lists what is live.

| Keys | Action |
| --- | --- |
| `,` `.` | Step one frame back or forward (pauses first) |
| `←` `→` while paused | Step one frame. While playing they seek 5 s, as in Share |
| `Shift+←` `Shift+→` | Jump 10 frames |
| `I` `O` | Set In, set Out at the current frame |
| `Shift+I` `Shift+O` | Clear In, clear Out |
| `R` | Loop the range on or off |
| `[` `]` | Previous cut, next cut (chapters, or `markers` when there are no chapters) |
| `G` | Grab the current frame as a PNG |

### The timeline

In the Review and Studio tiers the seek bar is a ruler timeline. It is still the Video.js `TimeSlider`, so it is a normal slider for the keyboard, the pointer and assistive technology; its value is read as timecode.

- **Ruler:** tick intervals follow the duration, the width and `fps`. Labels are compact and seconds-first (`10s`, `1:30`, `1:00:00`). The playhead's bubble, the timecode field and the readouts show full timecode.
- **Seeking snaps to frames.** Every seek lands in the middle of a frame, the same rule frame stepping uses. Best effort, like all frame numbers here.
- **Keys on the focused seek slider:** `←` `→` step one frame while paused and seek 5 s while playing; `Shift+←` `Shift+→` jump 10 frames; `Home`, `End`, `PageUp`, `PageDown` as on any Video.js slider.
- **In and Out:** the range is a band on the track, brighter where it has played. Each point has a handle that can be dragged, or moved with the keyboard when focused: `←` `→` one frame, `Shift` ten, `Home` `End` to its limits, `Delete` or `Backspace` to clear it. `onInOutChange` fires when a drag is released, not while it moves.
- **Chapters** show as gaps in the track and feed previous/next cut.

### Markers

```tsx
<ProSkin
  tier="review"
  markers={[
    { id: 'logo', time: 8.4, label: 'Logo too small' }, // a point
    { id: 'grade', time: 34, end: 44, label: 'Check the grade' }, // a range
  ]}
  onMarkerSelect={(marker) => openComment(marker.id)}
>
```

| Field | Type | Meaning |
| --- | --- | --- |
| `time` | `number` | Position in seconds |
| `label` | `string` | Shown in the tooltip and the Markers list |
| `end` | `number`, optional | Makes it a range marker, drawn as a bar |
| `id` | `string`, optional | Your own identifier, passed back in `onMarkerSelect` |

Point markers are flags and range markers are bars. Points too close to tell apart collapse into a badge with a count. Clicking a marker seeks to it and calls `onMarkerSelect`. For the keyboard and screen readers every marker is an item in the **Markers** list, and `[` `]` move between markers when the media has no chapters. The skin draws markers and reports selection; creating and storing them is the host app's job. About 200 markers is the design limit.

### Links to a frame

Copy link writes the position into the page URL's hash as `#t=HH:MM:SS:FF`, the timecode on screen, and keeps anything else the host app has in the hash. A page opened with such a hash seeks to that frame, paused. Plain seconds (`#t=12.5`) are also read.

### Grabbing frames

Grab frame saves the raw frame at the video's own resolution, without guides or adjustments. The browser only allows this when the video is loaded with CORS: set `crossOrigin` on the media element and serve CORS headers (Mux does). Otherwise the skin says the host does not allow frame capture.

### Styling hooks

The player container carries `data-tier`, `data-density`, `data-bar="pro"` while pro controls are in the bar, and one attribute per active guide, such as `data-guide-title-safe` or `data-guide-9-16` (`:` and `.` become `-`). The look is driven by the `--pro-*` tokens in `src/styles/tokens.css` and the public `--media-*` tokens.

### Frame accuracy

Frame numbers are best effort. Where the browser has `requestVideoFrameCallback`, the skin reads the media time of each presented frame; elsewhere it samples `currentTime`, which is approximate. Both depend on the `fps` you pass. The skin does not guarantee frame accuracy.

## Develop

```sh
npm run dev
```

The workbench opens your skin in a slimmed-down version of the Video.js sandbox. It plays NASA's Cosmic Dawn trailer from Mux, with chapters; change the media in `apps/preview/src/frame/media.ts`. The options panel sets the player's width and aspect ratio, the color scheme, text direction, and language, and playback options such as autoplay, muted, loop, and preload. The arrow button opens the preview on its own. The settings live in the URL, so a link such as `/?width=384&ratio=9:16&dir=rtl&locale=ar` opens the workbench in that state, and `/preview.html#width=384&ratio=9:16` opens the preview alone.

## Deploy

```sh
npm run deploy
```

This project deploys to **Vercel** with `npm run deploy vercel` (Netlify is the fallback: `npm run deploy netlify`). Without a host name, the script asks where to deploy the workbench: Vercel, Netlify, or Cloudflare Pages. The first time, the host's CLI signs you in and creates the project, then every run prints the URL. In this project `deploy:vercel` already passes `--prod`, because Vercel's preview URLs ask visitors to log in by default. Netlify still deploys to a preview URL; add `--prod` to `deploy:netlify` if you switch hosts.

To deploy on every push instead, put the project on GitHub and import it on Vercel or Netlify; `vercel.json` and `netlify.toml` already describe the build. The build uses relative URLs, so `dist/` also works on any static host, including in a subfolder.

## Where things live

- `src/`: the skin.
  - `src/pro/`: `ProSkin`, feature flags, the pro store, the frame clock and timecode utilities. Tier components load lazily from `review/` and `studio/`.
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
