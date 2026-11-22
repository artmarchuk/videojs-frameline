# Step 2 of 9: Skin foundation and Share tier

Read `PROJECT-OVERVIEW.md`, `NOTES.md` and this file before you start. Estimated time: 2 hours.

## Why this step matters

After this step the entry is **submittable**. It must pass the contest's minimum gate on its own: it works, it has the essential controls (play/pause, seek, time, volume/mute, fullscreen), it is responsive and it is keyboard-operable. If anything later goes wrong, this build is what gets submitted. It also carries the visual identity: the look set here is what judges see in every later step.

**North star reminder:** Video.js PRO is a skin for video creators. The Share tier is how a creator's work leaves the tool and reaches a client or audience. It is a clean, confident player, not a "consumer mode" and not a stock restyle. It should already feel like it belongs to a tool for people who make video.

## Out of scope

Do not build any Review or Studio feature: timecode display, frame step, in/out, loops, markers, guides, View menu, channels, zoom, configurator page. Do not add the `ProSkin` props or the pro store (step 3). Put ideas in `NOTES.md` under "Later". The only pro-shaped things this step creates are the empty overlay layer, the density tokens and the `data-tier` / `data-density` attributes (see 2.2).

## Before writing code

1. Read the installed `@videojs/react` docs and types for the skin you scaffolded, and for these components: `Container`, `Controls` (Root, Content, Group), `TimeSlider` (Track, Buffer, Fill, Thumb, Preview, Chapters), `VolumeSlider` or the equivalent, `Menu`, `Popover`, `Tooltip`, `Hotkey`, `Gesture`, `StatusAnnouncer`, `ErrorDialog`, and the buffering indicator. **Confirm the exact names, props and `data-*` state attributes from the installed package.** Names in docs, blog posts and this brief may be out of date.
2. Open the Scaffold skin source and list what it already provides. Build on it; do not rewrite what works.
3. Record in `NOTES.md` under "Verified APIs": the component names and props you will use, and under "Unverified": anything you could not confirm.

## Requirements

### 2.1 Design tokens

Create one tokens file (plain CSS custom properties) that is the single source for the look. Proposed values are a starting point; adjust them if a contrast check says so and record the change.

**Colour (dark only; Video.js v10 video skins are dark-only):**

| Token | Proposed | Use |
| --- | --- | --- |
| `--pro-surface-0` | `#0B0C0E` | Behind the video, deepest |
| `--pro-surface-1` | `#131518` | Control bar, menus |
| `--pro-surface-2` | `#1B1E23` | Raised elements, hover |
| `--pro-line` | `#2A2E35` | Hairlines, dividers |
| `--pro-text` | `#ECEEF1` | Primary text and icons |
| `--pro-text-dim` | `#9AA1AC` | Secondary text |
| `--pro-accent` | `#C6FF3D` | The one accent: playhead, progress, focus, active states |
| `--pro-accent-ink` | `#0B0C0E` | Text/icons placed on the accent |

Rules:
- **One accent only.** Lime is for the playhead, progress fill, focus ring and "on" states. Do not use it as decoration.
- The control bar sits over the video on a gradient scrim of `--pro-surface-0` so controls read on bright footage. Verify with a pure white frame.
- Map these onto the 8 public `--media-*` tokens (`--media-accent-color`, `--media-accent-text-color`, `--media-border-color`, `--media-border-radius`, `--media-font-family`, `--media-object-fit`, `--media-object-position`, `--media-scale-unit`) wherever the scaffold uses them. Confirm the exact token names in the installed docs.
- Contrast targets: text and icons 4.5:1 against what they sit on; UI components, focus ring and slider handles 3:1. **Compute the ratios** and put them in `NOTES.md`; do not estimate.

**Type:**
- UI text: a system stack (`system-ui, sans-serif`). No webfont for UI text, to keep it light.
- All time values and numbers: one open-licence monospace font (for example JetBrains Mono, OFL), self-hosted and subset to digits, `:` `.` and `/` if easy, with `font-variant-numeric: tabular-nums`. Time must not jitter as digits change.
- Sizes in the scale unit so `--media-scale-unit` scales the skin.

**Shape and space:**
- Small radii (`--media-border-radius` about 4px); this is a tool, not a toy. Hairline borders in `--pro-line` instead of heavy shadows.
- Spacing on a 4px grid.

**Density:**
- `--pro-density` tokens for `comfortable` (default) and `compact`. `compact` shrinks padding and gaps but **never makes a target smaller than 24×24 CSS px**. On touch (`pointer: coarse`) force `comfortable` and make targets **at least 44×44 px**.

**Motion:**
- Short, functional transitions (about 120 ms). Under `prefers-reduced-motion: reduce`, remove transitions and the control-bar fade; controls then show and hide without animation.

### 2.2 Skin shell

- `Container` wrapping the media element, the control bar and an **empty overlay layer** (an absolutely positioned element above the video and below the controls, `aria-hidden="true"`, `pointer-events: none`). It stays empty in this step; step 6 fills it.
- Put `data-tier="share"` and `data-density="comfortable"` on the container (static for now; step 3 makes them dynamic).
- Control bar layout (left to right): play/pause, volume (button plus slider on wide screens), elapsed time, seek bar filling the space, remaining or total time, captions, settings, PiP, fullscreen. Seek bar above the buttons on narrow widths is acceptable if it is more usable; choose and note why.
- Use container queries (not viewport media queries) so the skin works in a narrow embed. Define three breakpoints on the container width: wide, medium, narrow. Narrow hides volume slider (keeps the mute button), PiP, and moves less-used items into the settings menu.
- The video itself uses `object-fit: contain`; letterboxing is neutral `--pro-surface-0`.
- Time values use the mono font with tabular numerals: `0:42 / 3:20`. Do not build timecode here.

### 2.3 Custom icon set

- One SVG React component per icon, in `icons/`, on a 24×24 grid, 1.5px stroke, round caps and joins, `currentColor`, with no fixed width or height (sized by the control).
- Needed: play, pause, replay, volume high / low / muted, captions on / off, settings (gear), speed, quality, PiP enter / exit, fullscreen enter / exit, chevron (menu back / forward), check, spinner (buffering), error.
- Design them as one family with a slightly technical, precise character (square-ish terminals, consistent optical weight). Do not copy another icon set's shapes. If you use an open icon set as a base, record its licence in `NOTES.md`.
- Icons are decorative: the button carries the accessible name, the SVG has `aria-hidden="true"`.

### 2.4 Share controls

Build each control from the Video.js components; do not re-implement playback logic.

- **Play/pause** (button, plus a click on the video surface on desktop).
- **Seek bar** (`TimeSlider`): track, buffered range, fill, thumb, and a hover preview with time. Use thumbnails if the media provides a storyboard; otherwise a time-only bubble. Chapter segments on the track if chapters exist. Keep it a real accessible slider.
- **Time:** elapsed and total, mono tabular.
- **Volume and mute:** mute button always; slider on wide and medium.
- **Captions:** a toggle plus a menu of tracks when there are several. Captions are rendered by the browser (`::cue`); style them with `::cue` for legibility (light text on a dark box) and note that v10 cannot restyle them further.
- **Settings menu** (`Menu` in a `Popover`): playback speed, quality (if the source offers renditions), captions track. Back navigation inside the menu works by keyboard and pointer.
- **Picture-in-picture** where supported; hide the control otherwise.
- **Fullscreen** toggle. Controls must remain usable and the overlay layer must stay inside the container in fullscreen.
- **Buffering indicator** and an **error dialog** with a plain message and a retry action. Test the error path by pointing at a bad source.
- **Status announcer** (`StatusAnnouncer`): play, pause, mute, volume, speed and captions changes are announced to screen readers.

### 2.5 Keyboard and gestures

- Implement the **YouTube keyboard map** with `Hotkey`: `Space` / `K` play-pause, `M` mute, `F` fullscreen, `C` captions, `←` / `→` seek 5 s, `J` / `L` seek 10 s, `↑` / `↓` volume, `0`–`9` jump to 0–90%, `Home` / `End`, `<` / `>` speed. **Confirm what the installed `Hotkey` supports and implement the rest with the documented custom-hotkey mechanism.**
- Do not use `I`, `O`, `,`, `.` or `Shift+←/→`; step 4 needs them.
- `Shift+?` opens a **shortcut help dialog** listing the active map (for now, the Share map). It is a real dialog: focus moves in, `Esc` closes, focus returns to the trigger.
- Do not capture a shortcut when focus is in a text field, and never block `Tab`, `Shift+Tab` or browser shortcuts (for example `Ctrl/Cmd+F`).
- **Touch (`Gesture`):** tap toggles controls, double-tap on the left or right third seeks 10 s, and tap-to-play works. Verify tap handling on iOS Safari and note that the HTML package has a known iOS tap issue (we use React).
- **Auto-hide:** Video.js v10's auto-hide delay is fixed at 2 seconds. Controls must also show on keyboard focus and stay visible while a menu is open, and when paused.

### 2.6 Accessibility (must hold in this step, not later)

- Every control has an accessible name and, where relevant, `aria-pressed` / `aria-expanded` state, taken from the Video.js components where they provide it.
- Visible focus ring on every focusable element: 2px `--pro-accent` outline with an offset, 3:1 against its neighbours; never `outline: none` without a replacement.
- Focus order follows the visual order; the video surface is not a focus trap.
- Targets at least 24×24 px (44×44 on touch). Respect `prefers-reduced-motion`.
- Tooltips show on hover **and** keyboard focus, are dismissible with `Esc`, and don't overflow the container on narrow widths (a known v10 issue; check it and add a fix if needed).
- Not colour-only: states ("on", "muted", "active") are distinguished by icon or shape as well as colour.
- Language and direction: set up logical CSS properties (`margin-inline`, `inset-inline`) so the skin works with `dir="rtl"`. In RTL, **do not mirror the seek bar or the play/pause icon**; do mirror chevrons and the menu's back arrow. Text strings must come from one strings file so they can be translated.

### 2.7 Workbench check

Use the scaffold's preview workbench to exercise: sizes from 320 px to 1280 px wide, 16:9 and 9:16 sources, RTL, autoplay and loop off, and a source without captions. Fix anything that breaks, in the skin, not the workbench.

### 2.8 Gate test and deploy

Run this checklist, record the results in `NOTES.md`, then deploy with the project's deploy command and test again on the **public URL**:

- [ ] Play, pause, seek (mouse, touch, keyboard), time display, volume, mute, fullscreen all work.
- [ ] Keyboard only: `Tab` reaches every control in a sensible order; every control is operable; no keyboard trap; `Shift+?` works.
- [ ] Phone viewport (real device if the author can, otherwise device emulation, and say which): controls are at least 44 px, tap and double-tap work, fullscreen works.
- [ ] Narrow embed at 320 px: nothing overflows or clips; menus stay inside the container.
- [ ] Bright frame and dark frame: controls, time and focus ring are legible on both.
- [ ] Reduced motion: no animation.
- [ ] Captions toggle works on a source with captions.
- [ ] Error dialog appears on a bad source and retry works.
- [ ] Screen reader pass if available (VoiceOver or NVDA): controls named, state changes announced. If unavailable, say so.
- [ ] Browser check on current Chrome, Firefox and Safari. If you can't test one, say so.

## Acceptance criteria

- [ ] All contest minimum-gate items pass on desktop, phone viewport and keyboard, on the public URL.
- [ ] The look uses tokens only; changing a token changes the skin; contrast ratios are computed and recorded.
- [ ] The custom icon set is in place and no stock icons remain.
- [ ] The overlay layer exists, is empty, `aria-hidden` and `pointer-events: none`.
- [ ] The YouTube keyboard map and `Shift+?` help work; `I`, `O`, `,`, `.` and `Shift+←/→` are still free.
- [ ] No Review or Studio feature was added.
- [ ] Git history is clean, one commit per requirement group, with the attribution lines from your session instructions; the build deploys.

## Report back (keep it short)

1. The public URL, and a one-line verdict: does it pass the contest gate?
2. The gate checklist results, marking anything not tested.
3. Contrast ratios for text, UI components and the focus ring.
4. Component and token names that differed from this brief, and anything unverified.
5. Anything that will affect step 3 (for example how the Video.js store is read, or where state can live).
