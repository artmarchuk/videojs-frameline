// The skin's CSS reaches nothing outside the player: `node scripts/css-scope.mjs`, after `npm run build:lib`.
//
// Reads every stylesheet of the package (lib/*.css) and checks each selector of each style rule: it must name the
// skin's root (`.media-skin`, or `.pro-skin`, which is always on the same element) outside `:not()`, and nothing may
// follow the root with a sibling combinator, so the rule can only match the root or what is inside it. `@keyframes`
// and `@property` are global by nature and are listed, not failed: their names carry the skin's prefix or Video.js's.
// Exits with 1 and lists the selectors if one reaches out. CI runs it after the library build.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const lib = join(fileURLToPath(new URL('..', import.meta.url)), 'lib');
const ROOT = /\.(media-skin|pro-skin)(?![\w-])/;

// Splits at top-level commas (not inside parentheses or brackets).
const splitList = (text) => {
  const parts = [];
  let depth = 0, start = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '(' || char === '[') depth++;
    else if (char === ')' || char === ']') depth--;
    else if (char === ',' && depth === 0) { parts.push(text.slice(start, i)); start = i + 1; }
  }
  parts.push(text.slice(start));
  return parts.map((part) => part.trim()).filter(Boolean);
};
// Removes every `:not(…)` with what it holds.
const withoutNot = (selector) => {
  let out = '';
  for (let i = 0; i < selector.length; i++) {
    if (selector.startsWith(':not(', i)) {
      let depth = 0;
      for (; i < selector.length; i++) { if (selector[i] === '(') depth++; else if (selector[i] === ')' && --depth === 0) break; }
    } else out += selector[i];
  }
  return out;
};
// The selector with the contents of every parenthesis and bracket blanked, to look at its top-level combinators.
const flat = (selector) => {
  let out = '', depth = 0;
  for (const char of selector) {
    if (char === '(' || char === '[') depth++;
    out += depth > 0 ? '_' : char;
    if (char === ')' || char === ']') depth--;
  }
  return out;
};
const reachesOut = (selector) => {
  const positive = withoutNot(selector);
  if (!ROOT.test(positive)) return 'does not name the skin\'s root';
  // Compound by compound at the top level: once the root is named, a sibling combinator leaves the player.
  const top = flat(selector);
  let named = false, at = 0;
  for (const match of top.matchAll(/\s*([>+~])\s*|\s+/g)) {
    const compound = selector.slice(at, match.index);
    if (ROOT.test(withoutNot(compound))) named = true;
    if (named && (match[1] === '+' || match[1] === '~') && ROOT.test(withoutNot(compound))) return 'matches a sibling of the root';
    at = match.index + match[0].length;
  }
  return null;
};

const findings = [];
const globals = new Set();
let rules = 0, selectors = 0;
const walk = (css, file) => {
  let i = 0;
  while (i < css.length) {
    const open = css.indexOf('{', i), semi = css.indexOf(';', i);
    if (open < 0) break;
    if (semi >= 0 && semi < open) { i = semi + 1; continue; } // a statement: `@layer a, b;`
    let depth = 1, end = open + 1;
    for (; end < css.length && depth > 0; end++) { if (css[end] === '{') depth++; else if (css[end] === '}') depth--; }
    const prelude = css.slice(i, open).trim(), body = css.slice(open + 1, end - 1);
    if (prelude.startsWith('@')) {
      if (/^@(keyframes|property|font-face|counter-style)\b/.test(prelude)) globals.add(prelude);
      else walk(body, file); // @layer, @media, @supports, @container
    } else {
      rules++;
      for (const selector of splitList(prelude)) {
        selectors++;
        const why = reachesOut(selector);
        if (why) findings.push(`${file}: ${selector}  (${why})`);
      }
    }
    i = end;
  }
};

const files = readdirSync(lib).filter((name) => name.endsWith('.css'));
if (!files.length) { console.error('No stylesheets in lib/. Run `npm run build:lib` first.'); process.exit(2); }
for (const file of files) walk(readFileSync(join(lib, file), 'utf8').replace(/\/\*[\s\S]*?\*\//g, ''), file);
console.log(`${files.length} stylesheets, ${rules} rules, ${selectors} selectors.`);
console.log(`Global by nature: ${[...globals].sort().join(', ')}`);
if (findings.length) {
  console.error(`\n${findings.length} selectors reach outside the player:`);
  for (const line of findings) console.error(`  ${line}`);
  process.exit(1);
}
console.log('Every selector names the skin\'s root: nothing matches outside the player.');
