/**
 * commands/log.ts — `backspace-ai log`
 *
 * Displays a table of all snapshots (sessions) in the database.
 */

import chalk from 'chalk';
import path from 'path';
import { LocalDB, BACKSPACE_DIR, DB_FILENAME, isInitialized } from '../db.js';

export function logCommand(): void {
  const cwd = process.cwd();

  if (!isInitialized(cwd)) {
    console.error(
      chalk.red('Backspace is not initialized in this directory.\n') +
      chalk.dim('Run `backspace-ai init` first.')
    );
    process.exit(1);
  }

  const dbPath = path.join(cwd, BACKSPACE_DIR, DB_FILENAME);
  const db = new LocalDB(dbPath);
  const snapshots = db.getRecentSnapshots(25);

  if (snapshots.length === 0) {
    console.log(chalk.yellow('No snapshots recorded yet.'));
    console.log(chalk.dim('Run `backspace-ai watch` and make some changes to capture snapshots.'));
    return;
  }

  console.log(chalk.bold('\n  Snapshot History\n'));

  // Table header
  const idWidth = 10;
  const timeWidth = 22;
  const filesWidth = 8;
  const promptWidth = 40;

  console.log(
    chalk.dim('  ') +
    chalk.cyan('ID'.padEnd(idWidth)) +
    chalk.cyan('Timestamp'.padEnd(timeWidth)) +
    chalk.cyan('Files'.padEnd(filesWidth)) +
    chalk.cyan('Prompt')
  );
  console.log(chalk.dim('  ' + '─'.repeat(idWidth + timeWidth + filesWidth + promptWidth)));

  for (const snap of snapshots) {
    const shortId = snap.id.slice(0, 8);
    const time = new Date(snap.timestamp).toLocaleString();
    let fileCount: string;
    try {
      fileCount = Array.isArray(snap.files_changed) ? snap.files_changed.length.toString() : '?';
    } catch {
      fileCount = '?';
    }
    const prompt = (snap.prompt || 'Auto-capture').slice(0, promptWidth);

    console.log(
      chalk.dim('  ') +
      chalk.white(shortId.padEnd(idWidth)) +
      chalk.dim(time.padEnd(timeWidth)) +
      chalk.yellow(fileCount.padEnd(filesWidth)) +
      chalk.dim(prompt)
    );
  }

  console.log('');
}
