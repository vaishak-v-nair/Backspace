/**
 * commands/login.ts — `backspace-ai login`
 *
 * Cloud authentication is not available in V1.
 * Backspace operates in 100% local-only mode — zero bytes leave the machine.
 */

import chalk from 'chalk';

export async function loginCommand(): Promise<void> {
  console.log('');
  console.log(chalk.yellow.bold('  ⚠  Cloud features are not yet available'));
  console.log('');
  console.log(chalk.dim('  Backspace V1 is a strict local-first product.'));
  console.log(chalk.dim('  All snapshots, diffs, and encryption keys live entirely on your machine.'));
  console.log(chalk.dim('  Zero bytes of data will ever leave this computer.'));
  console.log('');
  console.log(chalk.dim('  Cloud sync and team features are on the roadmap.'));
  console.log(chalk.dim('  Follow https://github.com/backspace-ai for updates.'));
  console.log('');
  process.exit(0);
}
