/**
 * commands/status.ts — `backspace-ai status`
 *
 * Shows whether Backspace is initialized and if the daemon is running.
 */

import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import { getBackspaceDir, isInitialized, BACKSPACE_DIR, DB_FILENAME } from '../db.js';

export function statusCommand(): void {
  const cwd = process.cwd();

  if (!isInitialized(cwd)) {
    console.log(chalk.yellow('Backspace is not initialized in this directory.'));
    console.log(chalk.dim('Run `backspace-ai init` to get started.'));
    return;
  }

  const backspaceDir = getBackspaceDir(cwd);
  const pidFile = path.join(backspaceDir, 'daemon.pid');
  const dbPath = path.join(backspaceDir, DB_FILENAME);

  console.log(chalk.bold('  Backspace Status\n'));
  console.log(chalk.dim('  Directory : ') + chalk.white(path.join('.', BACKSPACE_DIR)));
  console.log(chalk.dim('  Database  : ') + chalk.white(path.join('.', BACKSPACE_DIR, DB_FILENAME)));

  // Database size
  try {
    const stats = fs.statSync(dbPath);
    const sizeKb = (stats.size / 1024).toFixed(1);
    console.log(chalk.dim('  DB Size   : ') + chalk.white(`${sizeKb} KB`));
  } catch {
    // ignore
  }

  // Daemon status
  if (fs.existsSync(pidFile)) {
    try {
      const pid = parseInt(fs.readFileSync(pidFile, 'utf8'), 10);
      process.kill(pid, 0); // Check if process exists
      console.log(chalk.dim('  Daemon    : ') + chalk.green(`running (PID: ${pid})`));
    } catch {
      console.log(chalk.dim('  Daemon    : ') + chalk.yellow('not running (stale PID file)'));
    }
  } else {
    console.log(chalk.dim('  Daemon    : ') + chalk.dim('not running'));
  }

  console.log('');
}
