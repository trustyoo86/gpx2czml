/// <reference types="vitest/config" />
import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

export default defineConfig({
  plugins: [dts({ rollupTypes: true })],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'gpx2czml',
      formats: ['es', 'umd', 'cjs'],
      fileName: (format) => {
        if (format === 'es') return 'gpx2czml.js';
        if (format === 'cjs') return 'gpx2czml.cjs';
        return 'gpx2czml.umd.js';
      },
    },
    rollupOptions: {
      external: ['@xmldom/xmldom'],
      output: { globals: { '@xmldom/xmldom': 'xmldom' } },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
  },
});
