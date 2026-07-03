/**
 * commands/status.ts — `backspace-ai status`
 *
 * Shows whether Backspace is initialized, if the daemon is running,
 * and the currently active session (if any).
 */

import chalk from 'chalk';
import fs from 'node:fs';
import path from 'node:path';
import { BackspaceDB, getBackspaceDir, isInitialized, BACKSPACE_DIR, DB_FILENAME } from '../db.js';

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

  console.log(chalk.bold('\n  Backspace Status\n'));
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
  let daemonRunning = false;
  if (fs.existsSync(pidFile)) {
    try {
      const pid = parseInt(fs.readFileSync(pidFile, 'utf8'), 10);
      process.kill(pid, 0); // Check if process exists
      console.log(chalk.dim('  Daemon    : ') + chalk.green(`running (PID: ${pid})`));
      daemonRunning = true;
    } catch {
      console.log(chalk.dim('  Daemon    : ') + chalk.yellow('not running (stale PID file)'));
    }
  } else {
    console.log(chalk.dim('  Daemon    : ') + chalk.dim('not running'));
  }

  // Active session
  const db = BackspaceDB.open(cwd);
  try {
    const activeSession = db.getActiveSession();
    if (activeSession) {
      const elapsed = Date.now() - activeSession.started_at;
      const seconds = Math.round(elapsed / 1000);
      const minutes = Math.floor(seconds / 60);
      const hours = Math.floor(minutes / 60);
      const durationStr = hours > 0
        ? `${hours}h ${minutes % 60}m`
        : minutes > 0
          ? `${minutes}m ${seconds % 60}s`
          : `${seconds}s`;

      console.log(chalk.dim('  Session   : ') + chalk.green(`active (${activeSession.id.slice(0, 8)})`));
      console.log(chalk.dim('  Prompt    : ') + chalk.white(activeSession.prompt));
      console.log(chalk.dim('  Duration  : ') + chalk.white(durationStr));
      console.log(chalk.dim('  Events    : ') + chalk.white(activeSession.event_count.toString()));
    } else if (daemonRunning) {
      console.log(chalk.dim('  Session   : ') + chalk.yellow('daemon running without session (legacy mode)'));
    } else {
      console.log(chalk.dim('  Session   : ') + chalk.dim('no active session'));
    }

    // Session summary
    const allSessions = db.listSessions(5);
    if (allSessions.length > 0) {
      const total = allSessions.length;
      const stopped = allSessions.filter((s) => s.status === 'stopped').length;
      const reverted = allSessions.filter((s) => s.status === 'reverted').length;
      console.log(chalk.dim('  History   : ') + chalk.white(`${total} recent (${stopped} stopped, ${reverted} reverted)`));
    }
  } finally {
    db.close();
  }

  console.log('');
}
