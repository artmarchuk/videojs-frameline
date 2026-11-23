import { fileURLToPath, URL } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';

const path = (file: string) => fileURLToPath(new URL(file, import.meta.url));

/**
 * Never bundled: the peers (React, React DOM and every `@videojs/*` package, with all their subpaths). The package
 * has no other runtime dependency.
 */
const isExternal = (id: string) => /^(react|react-dom)(\/|$)/.test(id) || id.startsWith('@videojs/');

/**
 * Each JS chunk imports its own CSS, as each module does in the source. Library mode writes the CSS files but leaves
 * the imports out, so this plugin puts them back: `import './studio.css';` at the top of the Studio chunk, and so on.
 * A host's bundler then loads the Studio CSS with the Studio chunk, and the Viewer path never asks for it. No
 * `<style>` tag is injected at runtime, so a strict Content Security Policy is not an issue.
 *
 * It also drops the path labels Rolldown writes before each module, and restores `'use client'` at the top of the entry chunk: bundlers drop module-level directives, and React
 * Server Components hosts (Next.js) need it to treat the skin as a client component.
 */
function chunkHeaders(): Plugin {
  return {
    name: 'frameline-chunk-headers',
    apply: 'build',
    enforce: 'post',
    generateBundle(_options, bundle) {
      for (const chunk of Object.values(bundle)) {
        if (chunk.type !== 'chunk') continue;
        const css = [...(chunk.viteMetadata?.importedCss ?? [])];
        const lines = [
          ...(chunk.isEntry ? ["'use client';"] : []),
          ...css.map((file) => `import './${file}';`),
        ];
        // Rolldown labels each module with its path in the repo (`// src/video/skin.tsx`); the package does not need them.
        const code = chunk.code.replace(/^\/\/(#region .*|#endregion.*| src\/\S+)\n/gm, '');
        chunk.code = lines.length ? `${lines.join('\n')}\n${code}` : code;
      }
    },
  };
}

// The npm package: `npm run build:lib` writes it to lib/. The site keeps its own config (vite.config.ts).
export default defineConfig({
  plugins: [react(), chunkHeaders()],
  publicDir: false,
  build: {
    outDir: path('./lib'),
    emptyOutDir: true,
    target: 'es2022',
    // Hosts minify with their own bundler; unminified output keeps the code readable and its pure annotations.
    minify: false,
    sourcemap: false,
    cssCodeSplit: true,
    lib: {
      entry: path('./src/pro/index.ts'),
      formats: ['es'],
      fileName: () => 'index.js',
    },
    rolldownOptions: {
      external: isExternal,
      output: {
        chunkFileNames: '[name]-[hash].js',
        assetFileNames: '[name]-[hash][extname]',
      },
    },
  },
});
