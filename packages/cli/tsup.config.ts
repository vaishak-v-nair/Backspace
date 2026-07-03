import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  target: 'node22',
  clean: true,
  sourcemap: true,
  // All npm dependencies are resolved from node_modules at runtime.
  // Only Node built-in protocols need explicit external declarations
  // to prevent tsup from stripping the "node:" prefix.
  external: ['chokidar', 'better-sqlite3', 'node:sqlite', 'node:fs', 'node:path', 'node:crypto'],
  banner: {
    // Inject the shebang so the output file is directly executable
    js: '#!/usr/bin/env node',
  },
});
