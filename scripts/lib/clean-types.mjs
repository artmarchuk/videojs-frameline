// Part of `npm run build:lib`: removes the CSS imports that `tsc` copies from the source into the declaration files.
// A `.d.ts` file with `import './skin.css';` would make a host's TypeScript look for a stylesheet that the types
// folder does not hold. The stylesheets are imported by the JS chunks in `lib/`, which is where a bundler needs them.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const types = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../lib/types');
let removed = 0;
for (const entry of readdirSync(types, { recursive: true, withFileTypes: true })) {
  if (!entry.isFile() || !entry.name.endsWith('.d.ts')) continue;
  const file = path.join(entry.parentPath, entry.name);
  const source = readFileSync(file, 'utf8');
  const cleaned = source.replace(/^import\s+['"][^'"]+\.css['"];?\r?\n/gm, () => { removed += 1; return ''; });
  if (cleaned !== source) writeFileSync(file, cleaned);
}
console.log(`lib/types: removed ${removed} CSS import${removed === 1 ? '' : 's'}`);
