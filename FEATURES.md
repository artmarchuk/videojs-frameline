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
| A neutral surround: every surface is a true grey (R = G = B), so the player adds no colour cast next to the picture | Both | `src/styles/tokens.css` |
| Raised keys for the instrument, a flat toolbar for the rest: the transport groups, Play, Loop and the link button read as physical keys (on a narrow dock under 500 px, where Loop and Link are cells of the second row, they are flat like their neighbours); Markers, Capture, Guides, Zoom, Reset range, Captions, More, Mute and Fullscreen are flat until hovered (a flat fill) or pressed. Both press in the same way when on, open or held | Studio | Hover Guides, then hold Loop |
| Tactile controls, in the dock only: toggles that are on read as pressed in, the range, handles and pins as solid things on a recessed track; one token (`--fl-bevel`) scales or removes it, and nothing of it is drawn over the picture. Under more contrast a pressed control draws an edge in the text colour, in forced colours a Highlight fill | Studio | Press and hold a dock button; set a range; `--fl-bevel: 0` |
| Nothing that shows time animates (playhead, timecode, ruler, handles, the band's ends); only presses, hovers, menus and the range band's appearance move | Both | Set a range with `I` `O`, clear it with `Shift+I` `Shift+O` |
| A range arrives and leaves visibly: the band fades and grows from its centre line in 160 ms, and goes in 120 ms; a handle turns from idle to set in the same 160 ms. It plays however the range is made: `I`, `O`, dragging a handle, `apiRef.setRange` | Studio | Drag an idle handle; press Reset range |

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
| An iframe embed for any site, no React needed: `/embed.html?src=<video URL>` (or `?mux=<playback ID>`), with `tier`, `fps` and `poster` in the URL | Both | `/embed.html?tier=viewer&src=…` in an `<iframe>` |
| Tokens: Video.js's public `--media-*` tokens and the skin's `--fl-*` tokens | Both | `--media-accent-color: orange` |
| The landing page: the player with a tier switch, Configure collapsed right under it (tier, flags, layout, live snippet, event log, shareable URL; one button opens it), three things to try, what Studio checks with a "Show me" for each, the host contract and what the skin leaves out | Both | The site root |

## Viewer

| Feature | Tier | How to try |
| --- | --- | --- |
| Play and pause | Viewer | `Space` or `K`, also with focus on the seek bar; click the picture |
| Seek bar with a time bubble, chapters shown as gaps, storyboard thumbnail when the media has one | Viewer | Hover the bar |
| Seek 5 s and 10 s, to a tenth, to the start or end | Viewer | `←` `→`, `J` `L`, `0`–`9`, `Home` `End` |
| Current time and duration | Viewer | In the bar |
| Mute and an inline volume slider | Viewer | `M`, `↑` `↓` |
| Captions | Viewer | `C`, or the captions button |
| More menu (the settings): speed, quality, audio track, captions | Viewer | The More button (three dots); `<` `>` for speed |
| Picture-in-picture | Viewer | Its button in the bar (in the More menu in the Studio dock) |
| Fullscreen | Viewer | `F`; double click the picture |
| Shortcut help dialog listing the keys that are live | Both | `Shift+?` |
| Error dialog with retry | Both | `/preview.html?media=error` |
| Controls shown before playback starts | Viewer | Load the page |

## Studio: transport

| Feature | Tier | How to try |
| --- | --- | --- |
| Timecode `HH:MM:SS:FF` of the current frame, with the duration beside it | Studio | Left of the main row |
| A link button joined to the timecode field: it copies a link to the frame the field shows, then shows a check for a moment | Studio | `S`; the link button beside the timecode |
| Timecode or seconds | Studio | Press the timecode field |
| Start timecode offset and drop-frame counting | Studio | `startTimecode="01:00:00:00"`, `dropFrame` |
| Step one frame back or forward (pauses first) | Studio | `,` `.`; `←` `→` while paused; the step buttons |
| Jump 10 frames | Studio | `Shift+←` `Shift+→` |
| Previous and next cut: the media's chapters, or the host's markers when there are no chapters | Studio | `[` `]`; the cut buttons |
| Loop, on from the start: the range when one is set, otherwise the whole video | Studio | `R`; the Loop button |
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
| A set range confines playback: play starts at In from outside the range or from the Out frame; at Out it goes back to In, or pauses on the Out frame with Loop off | Studio | Set a range, play; press `R` and play again |
| A seek to outside the range while playing goes there and pauses; setting the range past a playing head sends it to In | Studio | Play inside a range, press `9`; then press `O` while playing |
| Reset range | Studio | The × button after Loop, while a range is set |
| Marker pins from the host's `markers`; an end time draws a line | Studio | Pins on the ruler |
| Markers menu: markers with timecodes, and the media's chapters | Studio | The bookmark button |
| A selected marker is drawn in the accent and reported to the host | Studio | Click a pin; `onMarkerSelect` |
| The playhead sits on top of the timeline: a press within 10 px of it (22 px on touch) grabs the playhead, also through a marker pin or a range handle that overlaps it; the pin or handle keeps the rest of its target | Studio | Set In at the playhead with `I`, then drag from the playhead on a phone |

## Studio: capture

| Feature | Tier | How to try |
| --- | --- | --- |
| Grab frame: a PNG at the video's own size, with no guides, whatever the zoom | Studio | `G`; Capture menu |
| Copy frame image to the clipboard | Studio | `Shift+G`; Capture menu |
| Copy link at timecode: `#t=HH:MM:SS:FF` in the page URL, announced with the timecode | Studio | `S`; the link button beside the timecode (on a narrow dock under 500 px, in its second row; under 340 px, in the More menu) |
| The Capture menu holds the image actions only, and is not shown without `grabFrame` | Studio | `/?grabFrame=0` |
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
| The Guides menu has its own button | Studio | The frame icon |

## Studio: zoom

| Feature | Tier | How to try |
| --- | --- | --- |
| Zoom levels Fit, 100%, 150%, 200%, 400% | Studio | `Z`, `Shift+Z`; the Zoom button |
| 100% is one pixel of the source (the best rendition the stream offers) per device pixel; it does not change when the playing rendition does | Studio | Zoom to 100% and change Quality |
| Single pixels drawn as squares from 200% up | Studio | Zoom to 400% |
| Pan by dragging, or from the keyboard; it stops at the picture's edges | Studio | Drag the picture; `Shift+Alt` + arrows |
| How to pan, as a note at the top of the Zoom menu, above the levels (the pointer never crosses it) | Studio | Open the Zoom menu |
| A note when a lower rendition than the best one is playing ("showing 720p") | Studio | Zoom menu, on the chosen level |
| While zoomed on automatic quality, the player-size cap on the rendition is lifted | Studio | `/preview.html?cap=1`, then `Z` |
| Guides zoom with the picture; their lines and labels keep their size | Studio | Zoom with title safe on |
| Zoom always starts at Fit; it is not remembered | Studio | Reload while zoomed |

## Responsive and touch

| Feature | Tier | How to try |
| --- | --- | --- |
| The Viewer bar becomes two rows under 640 px | Viewer | Narrow the window |
| The Studio row sheds controls in a set order from 1100 px down, and becomes a narrow dock under 740 px | Studio | Narrow the window |
| The narrow dock has one rule: row one is the instrument (the raised keys, as far as the width allows), row two the flat toolbar. Two arrangements, by the player's width: 500 px and up (a phone on its side), and under 500 px (a phone held upright) | Studio | Turn a phone on its side |
| Narrow dock, 500 px and up: row one is the timecode joined to the Link button, the whole transport in the centre, and Loop as a raised key at the end edge; row two is six flat buttons in equal cells: Markers, Capture, Guides, Zoom, More, Fullscreen. The dock is lower there (8 px above and below, 6 px between the rows), every target still 44 px | Studio | A phone on its side, or a 500 to 739 px wide player |
| Narrow dock under 500 px, row one: the timecode, then the whole transport as on the wide dock (previous cut, step back, Play, step forward, next cut); the four tool buttons are 44 px wide where the row has room and shrink to 36 px (always 44 px tall) where it has not, so a 360 px phone shows every button; under 324 px the cut buttons fold away (`[` `]` and the Markers menu still reach the cuts) | Studio | A 360 or 375 px phone; a 320 px player |
| Narrow dock under 500 px, row two: one row of equal cells, each a 44 px target, in the order Markers, Loop, Capture, Link, Guides, Zoom, More, Fullscreen. All flat: Loop has no fill at rest and the pressed treatment while looping | Studio | Open the page on a phone |
| The narrow row folds: under 382 px the Zoom button is not shown (`Z`, `Shift+Z` and `apiRef.setZoom` still zoom); under 340 px the Link button is not shown and "Copy link at timecode" is an item of the More menu; under 300 px the side padding is 12 px, and under 288 px the cells are 40 px wide, so the row fits down to a 264 px player | Studio | A 360, 320 and 264 px wide player |
| Markers have their own button on the narrow dock, with the same menu as on the wide one | Studio | The bookmark button on a phone |
| No In and Out buttons on the narrow dock: the range is set with the handles on the timeline; `I`, `O`, `Shift+I` and `Shift+O` still work from a keyboard | Studio | Drag a handle on a phone |
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
| Reduced motion: no transitions or animations in the skin or on the page | Both | System setting; `scripts/browser-checks/reduced-motion.js` |
| More contrast (`prefers-contrast: more`): secondary text 7:1, lines 3:1, idle handles 4.5:1, a 3 px focus ring, a 2 px playhead edge, heavier guide lines, a denser Viewer scrim; the layout does not change | Both | System setting; the "more" column of `node scripts/contrast.mjs` |
| Forced colours (Windows High Contrast): bordered buttons and menu items, Highlight for checked states and the range band, playhead, handles, markers and guides in system colours | Both | Windows High Contrast, or Playwright `forcedColors: 'active'` |
| axe audit with zero violations: the page (dark only) at desktop and phone width, Studio with the Guides menu, the Zoom menu and the help dialog open, the Viewer | Both | `scripts/browser-checks/axe-audit.js` |
| The landing page: landmarks, heading order, real radio groups and checkboxes | Both | The site root |

## Performance

| Feature | Tier | How to try |
| --- | --- | --- |
| Viewer requests no pro chunk | Viewer | Network panel on `/?tier=viewer` |
| The pro runtime, the Studio layer and the debug readout are separate lazy chunks | Studio | Network panel on `/` |
| The skin does not re-render per frame: the frame clock writes to a small store, and only the timecode field subscribes to the frame | Studio | `/preview.html?debug` shows the render count |
| Frame time from `requestVideoFrameCallback` where the browser has it | Studio | `/preview.html?debug` shows the clock source |
| Plain CSS, no webfont, icons copied into the source (no icon package at runtime): frame step, Loop, Markers, Capture and Link are our own drawings; step, Loop, Markers and Capture are drawn by hand at 18, 20 and 24 px and the dock shows the one drawn for its size | Both | The source |

## Browser support

Floor: Chrome and Edge 111, Firefox 121, Safari and iOS 16.4. Checked in Playwright's Chromium (Google Chrome), Firefox and WebKit on macOS; WebKit is close to Safari but not the same build, and Safari 16.4 cannot be emulated. The README has the full table.

| Check | Chrome | Firefox | WebKit |
| --- | --- | --- | --- |
| Viewer gate, menus, focus order, help dialog | Pass | Pass (the `<video>` element is also a tab stop in Firefox) | Pass |
| Frame clock source, and the frame after ten steps | `requestVideoFrameCallback`, frame 10 | `requestVideoFrameCallback`, frame 10 | `requestVideoFrameCallback`, frame 10 |
| Zoom: pixelated rendering, guides counter-scale | Pass | Pass | Pass |
| Grab frame; Copy frame image | Pass | Pass; Copy is disabled with a hint where the browser cannot write images to the clipboard | Pass |
| Rendition note while zoomed | Pass | Can lag a manual quality switch | Pass through hls.js; native HLS in Safari proper is unverified |
| Error dialog Retry on a broken source | Pass | Pass | Pass |

## Out of scope

| Not built | Reason |
| --- | --- |
| Image processing and analysis: channels, exposure, gamma, scopes, false colour | That is the work of a grading or monitoring engine. A skin adds controls and overlays around the picture and leaves the picture alone |
| Setting a poster or thumbnail from a frame | It writes to the host's media library, which a skin has no access to. Grab frame gives the host the image; what it does with it is the host's call |
| A light theme that follows the system | The player is dark by design: a neutral dark surround keeps judgements of exposure and contrast honest. The page around it is dark only for now |
