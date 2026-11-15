import { fileURLToPath, URL } from 'node:url';

import { defineConfig } from 'vitest/config';

// Unit tests cover the pure pro modules in src/pro. They need no DOM.
export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: { include: ['src/**/*.test.ts'], environment: 'node' },
});
