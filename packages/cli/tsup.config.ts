import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  target: 'node22',
  clean: true,
  sourcemap: true,
  // Bundle commander, chalk, ora for a self-contained output.
  // chokidar and node:sqlite must stay external:
  //  - chokidar has native fs bindings that cannot be bundled
  //  - node:sqlite is a Node built-in; tsup would strip the "node:" prefix
  //    when bundling, causing ERR_MODULE_NOT_FOUND at runtime
  noExternal: ['commander', 'chalk', 'ora'],
  external: ['chokidar', 'node:sqlite', 'node:fs', 'node:path', 'node:crypto'],
  banner: {
    // Inject the shebang so the output file is directly executable
    js: '#!/usr/bin/env node',
  },
});
