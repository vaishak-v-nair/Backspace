/**
 * commands/stop.ts — `backspace-ai stop`
 *
 * Stops the running daemon by reading the PID file and killing the process.
 * Marks the active session as stopped.
 */

import chalk from 'chalk';
import fs from 'node:fs';
import path from 'node:path';
import { BackspaceDB, getBackspaceDir, isInitialized } from '../db.js';

export function stopCommand(): void {
  const cwd = process.cwd();

  if (!isInitialized(cwd)) {
    console.error(
      chalk.red('Backspace is not initialized in this directory.\n') +
      chalk.dim('Run `backspace-ai init` first.'),
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
    } catch (err: unknown) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code === 'ESRCH') {
        console.log(chalk.yellow('⚠ Daemon process was not running (stale PID file cleaned up).'));
      } else {
        throw err;
      }
    }

    // Clean up PID file
    fs.unlinkSync(pidFile);

    // Close the active session in the database
    const db = BackspaceDB.open(cwd);
    try {
      const activeSession = db.getActiveSession();
      if (activeSession) {
        db.stopSession(activeSession.id);
        const duration = Date.now() - activeSession.started_at;
        const seconds = Math.round(duration / 1000);
        const minutes = Math.floor(seconds / 60);
        const durationStr = minutes > 0
          ? `${minutes}m ${seconds % 60}s`
          : `${seconds}s`;

        console.log(
          chalk.green('✓') +
          chalk.bold(' Session closed: ') +
          chalk.dim(activeSession.id.slice(0, 8)) +
          chalk.dim(` (${activeSession.event_count} events in ${durationStr})`),
        );
      }
    } finally {
      db.close();
    }
  } catch (err) {
    console.error(chalk.red('Failed to stop daemon:'), err instanceof Error ? err.message : err);
    process.exit(1);
  }
}
