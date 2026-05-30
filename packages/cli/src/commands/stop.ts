/**
 * commands/stop.ts — `backspace-ai stop`
 *
 * Stops the running daemon by reading the PID file and killing the process.
 * Marks the session as ended.
 */

import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import { getBackspaceDir, isInitialized } from '../db.js';

export function stopCommand(): void {
  const cwd = process.cwd();

  if (!isInitialized(cwd)) {
    console.error(
      chalk.red('Backspace is not initialized in this directory.\n') +
      chalk.dim('Run `backspace-ai init` first.')
    );
    process.exit(1);
  }

  const pidFile = path.join(getBackspaceDir(cwd), 'daemon.pid');

  if (!fs.existsSync(pidFile)) {
    console.log(chalk.yellow('No active daemon found.'));
    console.log(chalk.dim('Run `backspace-ai watch` to start one.'));
    return;
  }

  try {
    const pid = parseInt(fs.readFileSync(pidFile, 'utf8'), 10);

    // Attempt to kill the daemon process
    try {
      process.kill(pid, 'SIGTERM');
      console.log(chalk.green('✓') + chalk.bold(' Daemon stopped') + chalk.dim(` (PID: ${pid})`));
    } catch (err: any) {
      if (err.code === 'ESRCH') {
        console.log(chalk.yellow('⚠ Daemon process was not running (stale PID file cleaned up).'));
      } else {
        throw err;
      }
    }

    // Clean up PID file
    fs.unlinkSync(pidFile);
  } catch (err) {
    console.error(chalk.red('Failed to stop daemon:'), err instanceof Error ? err.message : err);
    process.exit(1);
  }
}
