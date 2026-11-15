# Frameline: features

Frameline is a Video.js v10 skin for video creators, by Artem Marchuk ([artmarchuk.me](https://artmarchuk.me)). This file lists what it does, where to find each thing, and the git tag in which it first shipped. It is written from the code; every step updates it.

"Since" is the first tag that contains the feature. Steps 3 and 4 had no tag of their own, so their features first appear in `step-5-timeline`.

## Principles

| Feature | Tier | How to try | Since |
| --- | --- | --- | --- |
| Viewer is for watching; Studio is for checking timing and framing | Both | Switch Tier on the page | `step-6a-rework` |
| Studio adds controls and overlays around the picture and never processes the picture | Studio | Grab a frame with guides on: the file has no guides | `step-7-zoom` |
| Controls sit in a dock below the picture, never over it, also in fullscreen | Studio | Press `F` in Studio | `step-5b-dock` |
| One accent, reserved: the played part of the range, set In/Out handles, the focus ring, a selected marker | Both | Set a range; tab through the controls | `step-5b-dock` |
| System typeface, tabular numerals for every changing number | Both | Watch the timecode while playing | `step-5b-dock` |
| Frame numbers are best effort, and the skin says so | Studio | The timecode field's tooltip where the browser has no frame callback | `step-5-timeline` |

## Tiers and configuration

| Feature | Tier | How to try | Since |
| --- | --- | --- | --- |
| Two tiers: `tier="viewer"` (default) and `tier="studio"` | Both | Tier switch on the page | `step-6a-rework` |
| Feature flags over a tier: `timecode`, `frameStep`, `inOut`, `loop`, `markers`, `shotNav`, `grabFrame`, `copyTimecodeLink`, `guides`, `platformZones`, `zoom` | Both | Features checkboxes on the page; `features={{ zoom: false }}` | `step-5-timeline` |
| `guides` as a list restricts the Guides menu to those ids | Studio | `/preview.html?guides=title-safe,9:16` | `step-6b-guides` |
| Layout: `layout="dock"` or `"overlay"`, in either tier | Both | Layout switch on the page | `step-5b-dock` |
| Density: `density="comfortable"` or `"compact"`; touch always gets 44 px targets | Both | `/preview.html?density=compact` | `step-5b-dock` |
| Pro code loads only when a feature needs it; Viewer downloads none | Viewer | Network panel on `/?tier=viewer` | `step-5-timeline` |
| Source facts as props: `fps`, `startTimecode`, `dropFrame` | Studio | `fps={24}` | `step-5-timeline` |
| Events as callback props: `onInOutChange`, `onMarkerSelect`, `onFrameChange`, `onCopyLink`, `onGuidesChange` | Studio | Event log on the page | `step-5-timeline` (`onGuidesChange`: `step-6b-guides`) |
| Events `onZoomChange` and `onFrameGrab` | Studio | Event log on the page | `step-8-configurator` |
| A handle for the host's own UI, `apiRef`: `seek`, `step`, `setRange`, `setLoop`, `setGuides`, `setZoom`, `pan`, `grabFrame` | Studio | The "Show me" buttons on the page | `step-8-configurator` |
| Host UI slots: `slots={{ toolbarStart, toolbarEnd, overlay }}` | Both | README, "Props" | `step-5-timeline` |
| Remembered choices per browser (guides, crop, zones, timecode or seconds): `persist` | Studio | Switch a guide on and reload | `step-6b-guides` |
| Tokens: Video.js's public `--media-*` tokens and the skin's `--fl-*` tokens | Both | `--media-accent-color: orange` | `step-2-share-gate` (`--fl-*` names: `step-8-configurator`) |
| The configurator page: tier, flags, layout, live snippet, shareable URL | Both | The site root | `step-8-configurator` |

## Viewer

| Feature | Tier | How to try | Since |
| --- | --- | --- | --- |
| Play and pause | Viewer | `Space` or `K`; click the picture | `step-2-share-gate` |
| Seek bar with a time bubble, chapters shown as gaps, storyboard thumbnail when the media has one | Viewer | Hover the bar | `step-2-share-gate` |
| Seek 5 s and 10 s, to a tenth, to the start or end | Viewer | `←` `→`, `J` `L`, `0`–`9`, `Home` `End` | `step-2-share-gate` |
| Current time and duration | Viewer | In the bar | `step-2-share-gate` |
| Mute and an inline volume slider | Viewer | `M`, `↑` `↓` | `step-2-share-gate` |
| Captions | Viewer | `C`, or the captions button | `step-2-share-gate` |
| Settings menu: speed, quality, audio track, captions | Viewer | The gear button; `<` `>` for speed | `step-2-share-gate` |
| Picture-in-picture | Viewer | Its button in the bar (in Settings in the Studio dock) | `step-2-share-gate` |
| Fullscreen | Viewer | `F`; double click the picture | `step-2-share-gate` |
| Shortcut help dialog listing the keys that are live | Both | `Shift+?` | `step-2-share-gate` |
| Error dialog with retry | Both | `/preview.html?media=error` | `step-2-share-gate` |
| Controls shown before playback starts | Viewer | Load the page | `step-2-share-gate` |

## Studio: transport

| Feature | Tier | How to try | Since |
| --- | --- | --- | --- |
| Timecode `HH:MM:SS:FF` of the current frame, with the duration beside it | Studio | Left of the main row | `step-5-timeline` |
| Timecode or seconds | Studio | Press the timecode field | `step-5-timeline` |
| Start timecode offset and drop-frame counting | Studio | `startTimecode="01:00:00:00"`, `dropFrame` | `step-5-timeline` |
| Step one frame back or forward (pauses first) | Studio | `,` `.`; `←` `→` while paused; the step buttons | `step-5-timeline` |
| Jump 10 frames | Studio | `Shift+←` `Shift+→` | `step-5-timeline` |
| Previous and next cut: the media's chapters, or the host's markers when there are no chapters | Studio | `[` `]`; the cut buttons | `step-5-timeline` |
| Loop: the range when one is set, otherwise the whole video | Studio | `R`; the Loop button | `step-5-timeline` |
| Transport centred in the main row, as on an editor's monitor | Studio | Main row at 1280 px and wider | `step-6a-rework` |

## Studio: timeline and range

| Feature | Tier | How to try | Since |
| --- | --- | --- | --- |
| Compact ruler timeline (about 46 px) with seconds-first labels that follow the duration, the width and `fps` | Studio | Top row of the dock | `step-6a-rework` (first ruler: `step-5-timeline`) |
| Seeking snaps to frames | Studio | Click the ruler, then read the timecode | `step-5-timeline` |
| Hover bubble with the full timecode, and a thumbnail when the media has a storyboard | Studio | Hover the timeline | `step-5-timeline` |
| In and Out handles, always present at the ends of the track | Studio | Drag a handle | `step-6a-rework` |
| Set In and Out at the playhead; unset them | Studio | `I` `O`; `Shift+I` `Shift+O` | `step-5-timeline` |
| Handles from the keyboard: one frame, ten frames, to the limits, unset | Studio | Focus a handle: `←` `→`, `Shift`, `Home` `End`, `Delete` | `step-6a-rework` |
| Range band, with the played part in the accent | Studio | Set a range and play | `step-6a-rework` |
| Reset range | Studio | The × button after Loop, while a range is set | `step-6a-rework` |
| Marker pins from the host's `markers`; an end time draws a line | Studio | Pins on the ruler | `step-6a-rework` (first markers: `step-5-timeline`) |
| Markers menu: markers with timecodes, and the media's chapters | Studio | The bookmark button | `step-6a-rework` |
| A selected marker is drawn in the accent and reported to the host | Studio | Click a pin; `onMarkerSelect` | `step-6a-rework` |

## Studio: capture

| Feature | Tier | How to try | Since |
| --- | --- | --- | --- |
| Grab frame: a PNG at the video's own size, with no guides, whatever the zoom | Studio | `G`; Capture menu | `step-5-timeline` |
| Copy frame image to the clipboard | Studio | Capture menu | `step-5-timeline` |
| Copy link at timecode: `#t=HH:MM:SS:FF` in the page URL | Studio | Capture menu | `step-5-timeline` |
| A page opened with `#t=…` opens on that frame, paused | Studio | Paste a copied link | `step-5-timeline` |
| A clear message when the browser refuses the grab (media without CORS) | Studio | `/preview.html?media=nocors`, then `G` | `step-5-timeline` |

## Studio: guides

| Feature | Tier | How to try | Since |
| --- | --- | --- | --- |
| Title safe (90%) and action safe (93%) | Studio | Guides menu | `step-6b-guides` |
| Rule of thirds and centre cross | Studio | Guides menu | `step-6b-guides` |
| Crop masks: 2.39:1, 1.85:1, 1:1, 4:5, 9:16 | Studio | Guides menu, Crop | `step-6b-guides` |
| Platform zones for YouTube Shorts, Instagram Reels and TikTok, labelled approximate | Studio | Guides menu, Platform zones | `step-6b-guides` |
| Hide every guide and bring the same set back | Studio | `Shift+V`; the menu's footer | `step-6b-guides` |
| Guides are drawn on the picture only, white with a dark edge, and follow it at any size | Studio | Resize the window with guides on | `step-6b-guides` |
| A badge on the Guides button counts what is on | Studio | Switch two guides on | `step-6b-guides` |
| The Guides menu, with its own button (it was "View" before) | Studio | The frame icon | `step-7b-zoom-button` |

## Studio: zoom

| Feature | Tier | How to try | Since |
| --- | --- | --- | --- |
| Zoom levels Fit, 100%, 150%, 200%, 400% | Studio | `Z`, `Shift+Z`; the Zoom button | `step-7b-zoom-button` (Fit, 100%, 200%: `step-7-zoom`) |
| 100% is one pixel of the source (the best rendition the stream offers) per device pixel; it does not change when the playing rendition does | Studio | Zoom to 100% and change Quality | `step-8-configurator` |
| Single pixels drawn as squares from 200% up | Studio | Zoom to 400% | `step-7-zoom` |
| Pan by dragging, or from the keyboard; it stops at the picture's edges | Studio | Drag the picture; `Shift+Alt` + arrows | `step-7b-zoom-button` (drag: `step-7-zoom`) |
| A note when a lower rendition than the best one is playing ("showing 720p") | Studio | Zoom menu, on the chosen level | `step-7-zoom` |
| While zoomed on automatic quality, the player-size cap on the rendition is lifted | Studio | `/preview.html?cap=1`, then `Z` | `step-7b-zoom-button` |
| Guides zoom with the picture; their lines and labels keep their size | Studio | Zoom with title safe on | `step-7-zoom` |
| Zoom always starts at Fit; it is not remembered | Studio | Reload while zoomed | `step-7-zoom` |

## Responsive and touch

| Feature | Tier | How to try | Since |
| --- | --- | --- | --- |
| The Viewer bar becomes two rows under 640 px | Viewer | Narrow the window | `step-2-share-gate` |
| The Studio row sheds controls in a set order from 1100 px down, and becomes a narrow dock under 700 px | Studio | Narrow the window | `step-7b-zoom-button` |
| Narrow and touch dock: In, Out and Loop buttons, because there is no keyboard; markers move into Settings | Studio | Open the page on a phone | `step-6c-fixes` |
| 44 px targets on touch | Both | A phone | `step-2-share-gate` |
| Touch, overlay layout: a tap shows or hides the controls; a double tap on the left or right third seeks 10 s; a double tap on the centre toggles fullscreen | Viewer | A phone | `step-2-share-gate` |
| Touch, dock layout: a tap on the picture plays or pauses | Studio | A phone | `step-5b-dock` |
| One finger pans a zoomed picture without scrolling the page | Studio | Zoom on a phone, then drag | `step-7-zoom` |
| A wider touch timeline with larger handles | Studio | A phone | `step-6d-small-fixes` |

## Accessibility

| Feature | Tier | How to try | Since |
| --- | --- | --- | --- |
| Everything works from the keyboard; the YouTube key map is kept in both tiers | Both | `Shift+?` | `step-2-share-gate` |
| Focus order matches the visual order, also when the layout changes | Both | `Tab` through the bar at two widths | `step-2-share-gate` |
| A visible focus ring that keeps 3:1 over any footage | Both | `Tab` | `step-2-share-gate` |
| Every Studio control has a tooltip with its shortcut and a matching accessible name | Studio | Hover or focus a button | `step-5-timeline` |
| Actions are announced through one live region (frame steps, In and Out, guides, zoom) | Studio | A screen reader | `step-5-timeline` |
| Menus are real menus: arrows, Enter, Escape, focus back on the button | Both | Open Guides from the keyboard | `step-6a-rework` |
| The timeline is a slider read as timecode; the handles are sliders too | Studio | A screen reader on the timeline | `step-6a-rework` |
| Guides are `aria-hidden` and ignore the pointer; switching them is announced | Studio | Switch a guide with a screen reader | `step-6b-guides` |
| Contrast checked by a script: text 4.5:1, controls and focus 3:1, page palette in light and dark | Both | `node scripts/contrast.mjs` | `step-2-share-gate` (page: `step-8-configurator`) |
| Reduced motion respected; forced-colours fallbacks | Both | System setting | `step-2-share-gate` |
| The configurator page: landmarks, heading order, real radio groups and checkboxes, works at 320 px | Both | The site root | `step-8-configurator` |

## Performance

| Feature | Tier | How to try | Since |
| --- | --- | --- | --- |
| Viewer requests no pro chunk | Viewer | Network panel on `/?tier=viewer` | `step-5-timeline` |
| The pro runtime, the Studio layer and the debug readout are separate lazy chunks | Studio | Network panel on `/` | `step-5-timeline` |
| The skin does not re-render per frame: the frame clock writes to a small store, and only the timecode field subscribes to the frame | Studio | `/preview.html?debug` shows the render count | `step-5-timeline` |
| Frame time from `requestVideoFrameCallback` where the browser has it | Studio | `/preview.html?debug` shows the clock source | `step-5-timeline` |
| Plain CSS, no webfont, our own icons | Both | The source | `step-2-share-gate` |

## Out of scope

| Not built | Reason |
| --- | --- |
| Image processing and analysis: channels, exposure, gamma, scopes, false colour | That is the work of a grading or monitoring engine. A skin adds controls and overlays around the picture and leaves the picture alone |
| Setting a poster or thumbnail from a frame | It writes to the host's media library, which a skin has no access to. Grab frame gives the host the image; what it does with it is the host's call |
| A light theme that follows the system | The player is dark by design: a neutral dark surround keeps judgements of exposure and contrast honest. Only the page around it follows the system |
