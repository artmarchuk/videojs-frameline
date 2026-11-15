# Frameline: features

Frameline is a Video.js v10 skin for video creators, by Artem Marchuk ([artmarchuk.me](https://artmarchuk.me)). This file lists what it does and where to try each thing. It is written from the code; every step updates it.

## Principles

| Feature | Tier | How to try |
| --- | --- | --- |
| Viewer is for watching; Studio is for checking timing and framing | Both | Switch Tier on the page |
| Studio adds controls and overlays around the picture and never processes the picture | Studio | Grab a frame with guides on: the file has no guides |
| Controls sit in a dock below the picture, never over it, also in fullscreen | Studio | Press `F` in Studio |
| One accent, reserved: the played part of the range, set In/Out handles, the focus ring, a selected marker | Both | Set a range; tab through the controls |
| System typeface, tabular numerals for every changing number | Both | Watch the timecode while playing |
| Frame numbers are best effort, and the skin says so | Studio | The timecode field's tooltip where the browser has no frame callback |

## Tiers and configuration

| Feature | Tier | How to try |
| --- | --- | --- |
| Two tiers: `tier="viewer"` (default) and `tier="studio"` | Both | Tier switch on the page |
| Feature flags over a tier: `timecode`, `frameStep`, `inOut`, `loop`, `markers`, `shotNav`, `grabFrame`, `copyTimecodeLink`, `guides`, `platformZones`, `zoom` | Both | Features checkboxes on the page; `features={{ zoom: false }}` |
| `guides` as a list restricts the Guides menu to those ids | Studio | `/preview.html?guides=title-safe,9:16` |
| Layout: `layout="dock"` or `"overlay"`, in either tier | Both | Layout switch on the page |
| Density: `density="comfortable"` or `"compact"`; touch always gets 44 px targets | Both | `/preview.html?density=compact` |
| Pro code loads only when a feature needs it; Viewer downloads none | Viewer | Network panel on `/?tier=viewer` |
| Source facts as props: `fps`, `startTimecode`, `dropFrame` | Studio | `fps={24}` |
| Events as callback props: `onInOutChange`, `onMarkerSelect`, `onFrameChange`, `onCopyLink`, `onGuidesChange` | Studio | Event log on the page |
| Events `onZoomChange` and `onFrameGrab` | Studio | Event log on the page |
| A handle for the host's own UI, `apiRef`: `seek`, `step`, `setRange`, `setLoop`, `setGuides`, `setZoom`, `pan`, `grabFrame` | Studio | The "Show me" buttons on the page |
| Host UI slots: `slots={{ toolbarStart, toolbarEnd, overlay }}` | Both | README, "Props" |
| Remembered choices per browser (guides, crop, zones, timecode or seconds): `persist` | Studio | Switch a guide on and reload |
| Tokens: Video.js's public `--media-*` tokens and the skin's `--fl-*` tokens | Both | `--media-accent-color: orange` |
| The configurator page: tier, flags, layout, live snippet, shareable URL | Both | The site root |

## Viewer

| Feature | Tier | How to try |
| --- | --- | --- |
| Play and pause | Viewer | `Space` or `K`; click the picture |
| Seek bar with a time bubble, chapters shown as gaps, storyboard thumbnail when the media has one | Viewer | Hover the bar |
| Seek 5 s and 10 s, to a tenth, to the start or end | Viewer | `←` `→`, `J` `L`, `0`–`9`, `Home` `End` |
| Current time and duration | Viewer | In the bar |
| Mute and an inline volume slider | Viewer | `M`, `↑` `↓` |
| Captions | Viewer | `C`, or the captions button |
| Settings menu: speed, quality, audio track, captions | Viewer | The gear button; `<` `>` for speed |
| Picture-in-picture | Viewer | Its button in the bar (in Settings in the Studio dock) |
| Fullscreen | Viewer | `F`; double click the picture |
| Shortcut help dialog listing the keys that are live | Both | `Shift+?` |
| Error dialog with retry | Both | `/preview.html?media=error` |
| Controls shown before playback starts | Viewer | Load the page |

## Studio: transport

| Feature | Tier | How to try |
| --- | --- | --- |
| Timecode `HH:MM:SS:FF` of the current frame, with the duration beside it | Studio | Left of the main row |
| Timecode or seconds | Studio | Press the timecode field |
| Start timecode offset and drop-frame counting | Studio | `startTimecode="01:00:00:00"`, `dropFrame` |
| Step one frame back or forward (pauses first) | Studio | `,` `.`; `←` `→` while paused; the step buttons |
| Jump 10 frames | Studio | `Shift+←` `Shift+→` |
| Previous and next cut: the media's chapters, or the host's markers when there are no chapters | Studio | `[` `]`; the cut buttons |
| Loop: the range when one is set, otherwise the whole video | Studio | `R`; the Loop button |
| Transport centred in the main row, as on an editor's monitor | Studio | Main row at 1280 px and wider |

## Studio: timeline and range

| Feature | Tier | How to try |
| --- | --- | --- |
| Compact ruler timeline (about 46 px) with seconds-first labels that follow the duration, the width and `fps` | Studio | Top row of the dock |
| Seeking snaps to frames | Studio | Click the ruler, then read the timecode |
| Hover bubble with the full timecode, and a thumbnail when the media has a storyboard | Studio | Hover the timeline |
| In and Out handles, always present at the ends of the track | Studio | Drag a handle |
| Set In and Out at the playhead; unset them | Studio | `I` `O`; `Shift+I` `Shift+O` |
| Handles from the keyboard: one frame, ten frames, to the limits, unset | Studio | Focus a handle: `←` `→`, `Shift`, `Home` `End`, `Delete` |
| Range band, with the played part in the accent | Studio | Set a range and play |
| Reset range | Studio | The × button after Loop, while a range is set |
| Marker pins from the host's `markers`; an end time draws a line | Studio | Pins on the ruler |
| Markers menu: markers with timecodes, and the media's chapters | Studio | The bookmark button |
| A selected marker is drawn in the accent and reported to the host | Studio | Click a pin; `onMarkerSelect` |

## Studio: capture

| Feature | Tier | How to try |
| --- | --- | --- |
| Grab frame: a PNG at the video's own size, with no guides, whatever the zoom | Studio | `G`; Capture menu |
| Copy frame image to the clipboard | Studio | Capture menu |
| Copy link at timecode: `#t=HH:MM:SS:FF` in the page URL | Studio | Capture menu |
| A page opened with `#t=…` opens on that frame, paused | Studio | Paste a copied link |
| A clear message when the browser refuses the grab (media without CORS) | Studio | `/preview.html?media=nocors`, then `G` |

## Studio: guides

| Feature | Tier | How to try |
| --- | --- | --- |
| Title safe (90%) and action safe (93%) | Studio | Guides menu |
| Rule of thirds and centre cross | Studio | Guides menu |
| Crop masks: 2.39:1, 1.85:1, 1:1, 4:5, 9:16 | Studio | Guides menu, Crop |
| Platform zones for YouTube Shorts, Instagram Reels and TikTok, labelled approximate | Studio | Guides menu, Platform zones |
| Hide every guide and bring the same set back | Studio | `Shift+V`; the menu's footer |
| Guides are drawn on the picture only, white with a dark edge, and follow it at any size | Studio | Resize the window with guides on |
| A badge on the Guides button counts what is on | Studio | Switch two guides on |
| The Guides menu, with its own button (it was "View" before) | Studio | The frame icon |

## Studio: zoom

| Feature | Tier | How to try |
| --- | --- | --- |
| Zoom levels Fit, 100%, 150%, 200%, 400% | Studio | `Z`, `Shift+Z`; the Zoom button |
| 100% is one pixel of the source (the best rendition the stream offers) per device pixel; it does not change when the playing rendition does | Studio | Zoom to 100% and change Quality |
| Single pixels drawn as squares from 200% up | Studio | Zoom to 400% |
| Pan by dragging, or from the keyboard; it stops at the picture's edges | Studio | Drag the picture; `Shift+Alt` + arrows |
| A note when a lower rendition than the best one is playing ("showing 720p") | Studio | Zoom menu, on the chosen level |
| While zoomed on automatic quality, the player-size cap on the rendition is lifted | Studio | `/preview.html?cap=1`, then `Z` |
| Guides zoom with the picture; their lines and labels keep their size | Studio | Zoom with title safe on |
| Zoom always starts at Fit; it is not remembered | Studio | Reload while zoomed |

## Responsive and touch

| Feature | Tier | How to try |
| --- | --- | --- |
| The Viewer bar becomes two rows under 640 px | Viewer | Narrow the window |
| The Studio row sheds controls in a set order from 1100 px down, and becomes a narrow dock under 700 px | Studio | Narrow the window |
| Narrow and touch dock: In, Out and Loop buttons, because there is no keyboard; markers move into Settings | Studio | Open the page on a phone |
| 44 px targets on touch | Both | A phone |
| Touch, overlay layout: a tap shows or hides the controls; a double tap on the left or right third seeks 10 s; a double tap on the centre toggles fullscreen | Viewer | A phone |
| Touch, dock layout: a tap on the picture plays or pauses | Studio | A phone |
| One finger pans a zoomed picture without scrolling the page | Studio | Zoom on a phone, then drag |
| A wider touch timeline with larger handles | Studio | A phone |

## Accessibility

| Feature | Tier | How to try |
| --- | --- | --- |
| Everything works from the keyboard; the YouTube key map is kept in both tiers | Both | `Shift+?` |
| Focus order matches the visual order, also when the layout changes | Both | `Tab` through the bar at two widths |
| A visible focus ring that keeps 3:1 over any footage | Both | `Tab` |
| Every Studio control has a tooltip with its shortcut and a matching accessible name | Studio | Hover or focus a button |
| Actions are announced through one live region (frame steps, In and Out, guides, zoom) | Studio | A screen reader |
| Menus are real menus: arrows, Enter, Escape, focus back on the button | Both | Open Guides from the keyboard |
| The timeline is a slider read as timecode; the handles are sliders too | Studio | A screen reader on the timeline |
| Guides are `aria-hidden` and ignore the pointer; switching them is announced | Studio | Switch a guide with a screen reader |
| Contrast checked by a script: text 4.5:1, controls and focus 3:1, page palette in light and dark | Both | `node scripts/contrast.mjs` |
| Reduced motion respected; forced-colours fallbacks | Both | System setting |
| The configurator page: landmarks, heading order, real radio groups and checkboxes, works at 320 px | Both | The site root |

## Performance

| Feature | Tier | How to try |
| --- | --- | --- |
| Viewer requests no pro chunk | Viewer | Network panel on `/?tier=viewer` |
| The pro runtime, the Studio layer and the debug readout are separate lazy chunks | Studio | Network panel on `/` |
| The skin does not re-render per frame: the frame clock writes to a small store, and only the timecode field subscribes to the frame | Studio | `/preview.html?debug` shows the render count |
| Frame time from `requestVideoFrameCallback` where the browser has it | Studio | `/preview.html?debug` shows the clock source |
| Plain CSS, no webfont, our own icons | Both | The source |

## Out of scope

| Not built | Reason |
| --- | --- |
| Image processing and analysis: channels, exposure, gamma, scopes, false colour | That is the work of a grading or monitoring engine. A skin adds controls and overlays around the picture and leaves the picture alone |
| Setting a poster or thumbnail from a frame | It writes to the host's media library, which a skin has no access to. Grab frame gives the host the image; what it does with it is the host's call |
| A light theme that follows the system | The player is dark by design: a neutral dark surround keeps judgements of exposure and contrast honest. Only the page around it follows the system |
