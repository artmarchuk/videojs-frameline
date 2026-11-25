# Changelog

Frameline follows [semantic versioning](https://semver.org) with the 0.x rule: a breaking change bumps the minor
version and is listed here. Peer ranges cover only the versions that were tested.

## 0.1.0 (unreleased)

The first public release.

- **What it is:** `FramelineSkin`, a skin for the Video.js v10 React player with two tiers: `viewer`, the clean player
  a creator's client or audience gets, and `studio`, the creator's monitor (ruler timeline with In and Out, frame
  step, timecode, markers and cuts, guides and platform zones, grab frame, links to a frame, zoom). Feature flags
  switch single features on over Viewer or off over Studio.
- **The API:** props, events, the `apiRef` handle, feature flags and public tokens, all documented in the
  [README](README.md#api-conventions), whose names follow one rule (README, "API conventions"). Every exported type
  starts with `Frameline`.
- **Loading:** the Viewer loads no Studio code or CSS. The pro runtime, the Studio layer and the debug readout are
  separate chunks loaded with `import()`, and each brings its own stylesheet. There is no CSS to import.
- **A chunk that fails to load:** the player falls back to a working Viewer, says so once, and offers one retry in
  the settings menu. A retry that works keeps the playback position and state, puts focus on the settings button
  and says so. The host's React tree is not affected, and the skin never reloads the page (README, "When a
  chunk fails to load").
- **The handle before the media is ready:** `apiRef` can be called the moment it arrives. `setRange`, `setLoop`,
  `setGuides` and `setZoom` apply at once; `seek` and `step` wait for the duration (steps add up, a seek replaces the
  steps before it); `pan` and `grabFrame` do nothing until there is a picture (README, "Driving the player").
- **Isolated from the host page's CSS:** the page's element rules, a framework reset, Tailwind's preflight and the
  typography of the player's ancestors do not change the player, and no selector of the skin matches outside it.
  The skin's cascade layers are named `base`, `components` and `utilities`, as Tailwind v4's are, and one guard
  block sits outside them. To customise, set the tokens; to restyle a part, give your selector an ID
  (`#player .media-button`) or use `!important`: a plain class selector does nothing inside the player. A class on
  the player itself, to size or place it, works as before (README, "Styling and isolation").
- **The package:** ESM only (ES2022), type declarations included, `'use client'` on the entry.
- **Peers:** `react` and `react-dom` `^19.3.0`; `@videojs/react`, `@videojs/core` and `@videojs/utils`
  `>=10.4.0 <10.7.0`, tested at both ends (10.4.0 and 10.6.0). No other dependency.
- **`className`:** a `className` passed to the skin is added beside the skin's own classes. Nothing is merged: the
  skin is plain CSS and does not resolve conflicts between Tailwind utility classes.
- **Node.js:** the package runs in the browser and sets no `engines`, so npm does not warn a host about the Node.js
  version it builds with.

Not there yet: a build for `@videojs/html` (HTML custom elements), and translations of the skin's own strings
(English only; Video.js's own components follow the player's locale).
