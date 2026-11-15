// Computes the WCAG contrast ratios recorded in NOTES.md. Run: node scripts/contrast.mjs
// Values mirror src/styles/tokens.css.
const T = {
  s0: '#0E0E10', s1: '#1E1E20', s2: '#2C2C2F', s3: '#3A3A3E', on: '#46464B', line: '#333336', track: '#85858C',
  text: '#F2F2F4', dim: '#9A9AA0', dimRaised: '#B2B2B8', accent: '#5B9DFF', accentInk: '#0B1220', range: '#4D7BC1', ink: '#1C1C1E',
  tickMinor: '#55555B', tickMid: '#77777E', tickMajor: '#8E8E95', buffer: '#4A4A50', white: '#FFFFFF',
  handleIdle: '#77777E', rulerLabel: '#B8B8C0',
};
const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const L = (c) => { const [r, g, b] = c.map(lin); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const ratio = (a, b) => { const [x, y] = [L(a), L(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const over = (fg, a, bg) => fg.map((c, i) => c * a + bg[i] * (1 - a));
const SCRIM = 0.88; // --fl-scrim-alpha: opacity of surface-0 behind the overlay control bar
const scrimWhite = over(rgb(T.s0), SCRIM, rgb(T.white));
const c = (name) => rgb(T[name]);
// Ruler labels use `mix-blend-mode: difference`: the colour on screen is |label - backdrop| per channel.
const diff = (a, b) => a.map((v, i) => Math.abs(v - b[i]));
const rows = [
  // Text
  ['text on surface-0 (timecode field)', c('text'), c('s0'), 4.5],
  ['text on surface-1 (dock, menus)', c('text'), c('s1'), 4.5],
  ['text on surface-2 (controls)', c('text'), c('s2'), 4.5],
  ['text on surface-3 (hover, tooltips, badges)', c('text'), c('s3'), 4.5],
  ['text on --fl-on (a toggle that is on)', c('text'), c('on'), 4.5],
  ['text-dim on surface-1 (the "of duration" text)', c('dim'), c('s1'), 4.5],
  ['ruler label, blended, on the dock (surface-1)', diff(c('rulerLabel'), c('s1')), c('s1'), 4.5],
  ['ruler label, blended, where the white playhead head passes under it', diff(c('rulerLabel'), c('text')), c('text'), 4.5],
  ['text-dim on surface-2 (controls)', c('dim'), c('s2'), 4.5],
  ['text-dim-raised on surface-3 (shortcut in a tooltip, marker tooltip time)', c('dimRaised'), c('s3'), 4.5],
  ['text-dim on surface-3: NOT USED for text (see text-dim-raised)', c('dim'), c('s3'), 0],
  ['ink on text fill (Play)', c('ink'), c('text'), 4.5],
  ['text on a highlighted menu item (--fl-on) in a Studio menu', c('text'), c('on'), 4.5],
  ['text-dim-raised on a highlighted menu item (--fl-on): NOT USED, hints take the text colour there', c('dimRaised'), c('on'), 0],
  ['white text on accent: NEVER USED, shown as a warning', c('white'), c('accent'), 0],
  // Overlay (Viewer tier) over footage
  [`text on scrim (${SCRIM}) over white frame`, c('text'), scrimWhite, 4.5],
  [`text-dim on scrim (${SCRIM}) over white frame`, c('dim'), scrimWhite, 4.5],
  ['Viewer progress fill (text) on scrim over white frame', c('text'), scrimWhite, 3],
  ['Viewer progress fill (text) against the unfilled track (--fl-track)', c('text'), c('track'), 3],
  ['slider track (--fl-track) on surface-0', c('track'), c('s0'), 3],
  ['slider track (--fl-track) on scrim over white', c('track'), scrimWhite, 3],
  ['Viewer thumb (text) on scrim over white', c('text'), scrimWhite, 3],
  // Focus ring: accent outline against what surrounds it, and the dark gap against footage
  ['focus ring: accent on surface-0', c('accent'), c('s0'), 3],
  ['focus ring: accent on surface-1 (dock)', c('accent'), c('s1'), 3],
  ['focus ring: accent on surface-2', c('accent'), c('s2'), 3],
  ['focus ring: accent on --fl-on', c('accent'), c('on'), 3],
  ['focus ring halo: surface-0 vs white frame', c('s0'), c('white'), 3],
  // Timeline
  ['playhead (text) over the unplayed band (--fl-range)', c('text'), c('range'), 3],
  ['playhead (text) over the played band (accent)', c('text'), c('accent'), 0],
  ['playhead outline (surface-0) over the played band (accent)', c('s0'), c('accent'), 3],
  ['playhead (text) over the neutral track (surface-2)', c('text'), c('s2'), 3],
  ['unplayed band (--fl-range) against the neutral track', c('range'), c('s2'), 3],
  ['played band (accent) against the unplayed band, decorative: position also shown by the playhead', c('accent'), c('range'), 0],
  ['played band (accent) against the neutral track', c('accent'), c('s2'), 3],
  ['active handle (accent) against the dock (surface-1)', c('accent'), c('s1'), 3],
  ['active handle (accent) against the neutral track', c('accent'), c('s2'), 3],
  ['active handle (accent) against the unplayed band, decorative: the handle also has a shape and stands proud of the track', c('accent'), c('range'), 0],
  ['idle handle (--fl-handle-idle) against the dock (surface-1)', c('handleIdle'), c('s1'), 3],
  ['idle handle (--fl-handle-idle) against the neutral track (surface-2)', c('handleIdle'), c('s2'), 3],
  ['hover hairline (text at 45%) over the neutral track', over(c('text'), 0.45, c('s2')), c('s2'), 3],
  ['hover hairline (text at 45%) over the dock', over(c('text'), 0.45, c('s1')), c('s1'), 3],
  ['markers (text-dim) on the dock', c('dim'), c('s1'), 3],
  ['selected marker (accent) on the dock', c('accent'), c('s1'), 3],
  ['major ticks on the dock', c('tickMajor'), c('s1'), 3],
  ['mid ticks on the dock, decorative', c('tickMid'), c('s1'), 0],
  ['minor ticks on the dock, decorative', c('tickMinor'), c('s1'), 0],
  ['neutral track (surface-2) on the dock, decorative: the playhead and fill carry the value', c('s2'), c('s1'), 0],
  ['buffered line on the dock, decorative', c('buffer'), c('s1'), 0],
  ['hairline (line) on surface-1, decorative', c('line'), c('s1'), 0],
  // Controls
  ['Play fill (text) against the dock', c('text'), c('s1'), 3],
  ['toggle on (--fl-on) against control fill (surface-2): too low alone, so "on" also draws a bar in the text colour', c('on'), c('s2'), 0],
  ['Loop on (--fl-on) against the dock: too low alone, same bar', c('on'), c('s1'), 0],
  ['toggle-on bar (text) against --fl-on', c('text'), c('on'), 3],
];
let fail = 0;
for (const [name, a, b, min] of rows) {
  const r = ratio(a, b); const ok = r >= min; if (!ok) fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${r.toFixed(2)}:1  (min ${min || '-'})  ${name}`);
}
process.exit(fail ? 1 : 0);
