import { writeFileSync } from 'node:fs';

import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';

/** Writes which modules went into which output chunk, with their rendered sizes, for the weight report. */
function chunkReport(): Plugin {
  return {
    name: 'chunk-report',
    apply: 'build',
    generateBundle(_options, bundle) {
      const chunks = Object.values(bundle)
        .filter((item) => item.type === 'chunk')
        .map((chunk) => ({
          fileName: chunk.fileName,
          isEntry: chunk.isEntry,
          imports: chunk.imports,
          dynamicImports: chunk.dynamicImports,
          css: [...(chunk.viteMetadata?.importedCss ?? [])],
          modules: Object.entries(chunk.modules).map(([id, module]) => ({ id, size: module.renderedLength })),
        }));
      writeFileSync('chunk-report.json', JSON.stringify(chunks, null, 1));
    },
  };
}

// A host app as a developer would set it up: Vite, React, the package from npm. Three pages, one per player, and the Studio page again under a hostile host stylesheet.
export default defineConfig({
  plugins: [react(), chunkReport()],
  build: {
    manifest: true,
    rolldownOptions: {
      input: { viewer: 'viewer.html', studio: 'studio.html', stock: 'stock.html', hostile: 'hostile.html' },
    },
  },
});
