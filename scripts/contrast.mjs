// Computes the WCAG contrast ratios recorded in NOTES.md. Run: node scripts/contrast.mjs
const T = {
  s0: '#0B0C0E', s1: '#131518', s2: '#1B1E23', line: '#2A2E35', lineStrong: '#7A828E',
  text: '#ECEEF1', dim: '#9AA1AC', accent: '#C6FF3D', ink: '#0B0C0E', white: '#FFFFFF',
};
const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const L = (c) => { const [r, g, b] = c.map(lin); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const ratio = (a, b) => { const [x, y] = [L(a), L(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const over = (fg, a, bg) => fg.map((c, i) => c * a + bg[i] * (1 - a));
const SCRIM = 0.88; // --pro-scrim-alpha: opacity of surface-0 behind the control bar
const scrimWhite = over(rgb(T.s0), SCRIM, rgb(T.white));
const rows = [
  ['text on surface-0', rgb(T.text), rgb(T.s0), 4.5],
  ['text on surface-1', rgb(T.text), rgb(T.s1), 4.5],
  ['text on surface-2', rgb(T.text), rgb(T.s2), 4.5],
  ['text-dim on surface-1', rgb(T.dim), rgb(T.s1), 4.5],
  ['text-dim on surface-2', rgb(T.dim), rgb(T.s2), 4.5],
  [`text on scrim (${SCRIM}) over white frame`, rgb(T.text), scrimWhite, 4.5],
  [`text-dim on scrim (${SCRIM}) over white frame`, rgb(T.dim), scrimWhite, 4.5],
  [`accent on scrim (${SCRIM}) over white frame`, rgb(T.accent), scrimWhite, 3],
  ['accent (focus ring, fill, thumb) on surface-0', rgb(T.accent), rgb(T.s0), 3],
  ['accent on surface-1', rgb(T.accent), rgb(T.s1), 3],
  ['accent on surface-2', rgb(T.accent), rgb(T.s2), 3],
  ['accent-ink on accent', rgb(T.ink), rgb(T.accent), 4.5],
  ['slider track (--pro-track) on surface-0', rgb(T.lineStrong), rgb(T.s0), 3],
  [`slider track (--pro-track) on scrim over white`, rgb(T.lineStrong), scrimWhite, 3],
  ['hairline (line) on surface-1, decorative', rgb(T.line), rgb(T.s1), 0],
  ['focus ring halo: accent vs surface-0 halo', rgb(T.accent), rgb(T.s0), 3],
  ['focus ring halo: surface-0 halo vs white frame', rgb(T.s0), rgb(T.white), 3],
];
let fail = 0;
for (const [name, a, b, min] of rows) {
  const r = ratio(a, b); const ok = r >= min; if (!ok) fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${r.toFixed(2)}:1  (min ${min || '-'})  ${name}`);
}
process.exit(fail ? 1 : 0);
