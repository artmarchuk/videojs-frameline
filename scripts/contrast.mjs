// Computes the WCAG contrast ratios recorded in NOTES.md. Run: node scripts/contrast.mjs
// Values mirror src/styles/tokens.css, and for the landing page apps/preview/src/page/tokens.css.
// Two columns: the default palette, and the palette under `prefers-contrast: more` (MORE and PAGE_MORE below), whose
// minimums are higher where the step 9 brief asks for it: secondary text 7:1, lines 3:1, idle handles 4.5:1.
const BASE = {
  s0: '#0F0F0F', s1: '#1E1E1E', s2: '#2C2C2C', s3: '#3A3A3A', on: '#474747', line: '#333333', track: '#888888',
  text: '#F2F2F2', dim: '#9C9C9C', dimRaised: '#B4B4B4', accent: '#5B9DFF', accentInk: '#0B1220', range: '#4D7BC1', ink: '#1C1C1C',
  tickMinor: '#565656', tickMid: '#787878', tickMajor: '#8F8F8F', buffer: '#4A4A4A', white: '#FFFFFF',
  handleIdle: '#787878', rulerLabel: '#B8B8B8',
};
const MORE = {
  ...BASE, line: '#7B7B7B', dim: '#CCCCCC', dimRaised: '#D9D9D9', tickMinor: '#8D8D8D', tickMid: '#A7A7A7', tickMajor: '#BDBDBD',
  buffer: '#6F6F6F', handleIdle: '#B7B7B7', rulerLabel: '#D3D3D3',
};
const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const L = (c) => { const [r, g, b] = c.map(lin); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const ratio = (a, b) => { const [x, y] = [L(a), L(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const over = (fg, a, bg) => fg.map((c, i) => c * a + bg[i] * (1 - a));
// Ruler labels use `mix-blend-mode: difference`: the colour on screen is |label - backdrop| per channel.
const diff = (a, b) => a.map((v, i) => Math.abs(v - b[i]));
// Each row: [name, foreground, background, minimum, minimum under prefers-contrast: more (defaults to the first)].
const buildRows = (T, SCRIM, PAGE) => {
const scrimWhite = over(rgb(T.s0), SCRIM, rgb(T.white)); // --fl-scrim-alpha: opacity of surface-0 behind the overlay control bar
const c = (name) => rgb(T[name]);
const rows = [
  // Text
  ['text on surface-0 (timecode field)', c('text'), c('s0'), 4.5],
  ['text on surface-1 (dock, menus)', c('text'), c('s1'), 4.5],
  ['text on surface-2 (controls)', c('text'), c('s2'), 4.5],
  ['text on surface-3 (hover, tooltips, badges)', c('text'), c('s3'), 4.5],
  ['text on --fl-on (a toggle that is on)', c('text'), c('on'), 4.5],
  ['text-dim on surface-1 (the "of duration" text)', c('dim'), c('s1'), 4.5, 7],
  ['ruler label, blended, on the dock (surface-1)', diff(c('rulerLabel'), c('s1')), c('s1'), 4.5, 7],
  ['ruler label, blended, where the white playhead head passes under it', diff(c('rulerLabel'), c('text')), c('text'), 4.5],
  ['text-dim on surface-2 (controls)', c('dim'), c('s2'), 4.5, 7],
  ['text-dim-raised on surface-3 (shortcut in a tooltip, marker tooltip time)', c('dimRaised'), c('s3'), 4.5, 7],
  ['text-dim on surface-3: NOT USED for text (see text-dim-raised)', c('dim'), c('s3'), 0],
  ['ink on text fill (Play)', c('ink'), c('text'), 4.5],
  ['text on a highlighted menu item (--fl-on) in a Studio menu', c('text'), c('on'), 4.5],
  ['text-dim-raised on a highlighted menu item (--fl-on): NOT USED, hints take the text colour there', c('dimRaised'), c('on'), 0],
  ['white text on accent: NEVER USED, shown as a warning', c('white'), c('accent'), 0],
  // Overlay (Viewer tier) over footage
  [`text on scrim (${SCRIM}) over white frame`, c('text'), scrimWhite, 4.5],
  [`text-dim on scrim (${SCRIM}) over white frame`, c('dim'), scrimWhite, 4.5, 7],
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
  ['idle handle (--fl-handle-idle) against the neutral track (surface-2)', c('handleIdle'), c('s2'), 3, 4.5],
  ['hover hairline (text at 45%) over the neutral track', over(c('text'), 0.45, c('s2')), c('s2'), 3],
  ['hover hairline (text at 45%) over the dock', over(c('text'), 0.45, c('s1')), c('s1'), 3],
  ['markers (text-dim) on the dock', c('dim'), c('s1'), 3],
  ['selected marker (accent) on the dock', c('accent'), c('s1'), 3],
  ['major ticks on the dock', c('tickMajor'), c('s1'), 3],
  ['mid ticks on the dock, decorative', c('tickMid'), c('s1'), 0],
  ['minor ticks on the dock, decorative', c('tickMinor'), c('s1'), 0],
  ['neutral track (surface-2) on the dock, decorative: the playhead and fill carry the value', c('s2'), c('s1'), 0],
  ['buffered line on the dock, decorative', c('buffer'), c('s1'), 0, 3],
  ['hairline (line) on surface-1, decorative; a line under more contrast', c('line'), c('s1'), 0, 3],
  ['hairline (line) on surface-2, decorative; a line under more contrast', c('line'), c('s2'), 0, 3],
  ['divider inside a control fill (white at the divider alpha on surface-2), decorative; a line under more contrast', over(c('white'), T.dividerAlpha, c('s2')), c('s2'), 0, 3],
  ['menu separator (line) on surface-1, decorative; a line under more contrast', c('line'), c('s1'), 0, 3],
  // Controls
  ['Play fill (text) against the dock', c('text'), c('s1'), 3],
  ['toggle on (--fl-on) against control fill (surface-2), decorative by default: the pressed bevel and aria-pressed carry it', c('on'), c('s2'), 0],
  ['Loop on (--fl-on) against the dock, decorative by default: the pressed bevel carries it', c('on'), c('s1'), 0],
  ['pressed edge (text) against the dock; drawn under more contrast only', c('text'), c('s1'), 0, 3],
  ['pressed edge (text) against --fl-on; drawn under more contrast only', c('text'), c('on'), 0, 3],
];
for (const [theme, p] of Object.entries(PAGE)) {
  const k = (name) => rgb(p[name]);
  rows.push(
    [`page, ${theme}: text on the page`, k('text'), k('bg'), 4.5],
    [`page, ${theme}: text on a panel`, k('text'), k('surface'), 4.5],
    [`page, ${theme}: text on the code block and a hovered button`, k('text'), k('sunken'), 4.5],
    [`page, ${theme}: dim text on the page (subtitle, byline)`, k('dim'), k('bg'), 4.5, 7],
    [`page, ${theme}: dim text on a panel (leads, hints, flag names, log)`, k('dim'), k('surface'), 4.5, 7],
    [`page, ${theme}: link on the page`, k('link'), k('bg'), 4.5],
    [`page, ${theme}: link on a panel`, k('link'), k('surface'), 4.5],
    [`page, ${theme}: chosen segment, its text on its fill`, k('ink'), k('fill'), 4.5],
    [`page, ${theme}: chosen segment and checked box against the panel`, k('fill'), k('surface'), 3],
    [`page, ${theme}: control edge (buttons, segmented track, keys) against the panel`, k('control'), k('surface'), 3],
    [`page, ${theme}: focus ring on the page`, k('focus'), k('bg'), 3],
    [`page, ${theme}: focus ring on a panel`, k('focus'), k('surface'), 3],
    [`page, ${theme}: the player's dock (surface-1) against the page, decorative: the player has a hairline`, c('s1'), k('bg'), 0],
    [`page, ${theme}: panel hairline, decorative; a line under more contrast`, k('line'), k('surface'), 0, 3],
  );
}
return rows;
};

// The landing page (apps/preview/src/page/tokens.css, which mirrors the Figma variables). It is dark only, and has
// under `prefers-contrast: more` three values change (they are not in Figma).
const PAGE_BASE = {
  dark: { bg: '#161616', surface: '#1E1E1E', sunken: '#0F0F0F', text: '#F2F2F2', dim: '#A6A6A6', line: '#333333', control: '#7D7D7D', fill: '#F2F2F2', ink: '#1C1C1C', link: '#5B9DFF', focus: '#5B9DFF' },
};
const PAGE_MORE = { dark: { ...PAGE_BASE.dark, dim: '#D2D2D2', line: '#7F7F7F', control: '#A4A4A4' } };

const base = buildRows({ ...BASE, dividerAlpha: 0.1 }, 0.88, PAGE_BASE);
const more = buildRows({ ...MORE, dividerAlpha: 0.38 }, 0.96, PAGE_MORE);
let fail = 0;
console.log('default | prefers-contrast: more');
for (let i = 0; i < base.length; i++) {
  const [name, a, b, min, minMore = min] = base[i];
  const [, a2, b2] = more[i];
  const r = ratio(a, b); const r2 = ratio(a2, b2);
  const ok = r >= min; const ok2 = r2 >= minMore; if (!ok || !ok2) fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${r.toFixed(2).padStart(6)}:1 (min ${String(min || '-').padStart(3)}) | ${ok2 ? 'PASS' : 'FAIL'} ${r2.toFixed(2).padStart(6)}:1 (min ${String(minMore || '-').padStart(3)})  ${name}`);
}
process.exit(fail ? 1 : 0);
