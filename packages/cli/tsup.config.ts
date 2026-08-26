import { defineConfig } from 'tsup'

export default defineConfig({
  entry: { cli: 'src/main.ts' },
  format: ['esm'],
  target: 'node20',
  clean: true,
  // Internal workspace packages ship raw TypeScript and are bundled here.
  noExternal: [/^@i18n-xray\//],
  banner: { js: '#!/usr/bin/env node' },
})
