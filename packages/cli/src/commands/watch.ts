/**
 * watch.ts — `backspace watch` command handler
 *
 * Thin wrapper that delegates to the daemon orchestrator.
 */

import chalk from 'chalk';
import { isInitialized } from '../db.js';
import { startDaemon } from '../daemon.js';

export function watchCommand(): void {
  const cwd = process.cwd();

  if (!isInitialized(cwd)) {
    console.error(
      chalk.red(
        'Backspace is not initialized in this directory.\n' +
          'Run `backspace init` first.'
      )
    );
    process.exit(1);
  }

  startDaemon({ cwd });
}
