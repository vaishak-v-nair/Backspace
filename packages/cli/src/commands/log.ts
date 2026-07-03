/**
 * commands/log.ts — `backspace-ai log`
 *
 * Displays a unified timeline of sessions and legacy snapshots.
 * Sessions (from the provenance engine) are shown first, followed by
 * any legacy snapshots that predate session tracking.
 */

import chalk from 'chalk';
import { BackspaceDB, isInitialized } from '../db.js';

export function logCommand(): void {
  const cwd = process.cwd();

  if (!isInitialized(cwd)) {
    console.error(
      chalk.red('Backspace is not initialized in this directory.\n') +
      chalk.dim('Run `backspace-ai init` first.'),
    );
    process.exit(1);
  }

  const db = BackspaceDB.open(cwd);

  try {
    const sessions = db.listSessions();
    const snapshots = db.listSnapshots();

    if (sessions.length === 0 && snapshots.length === 0) {
      console.log(chalk.yellow('No sessions or snapshots recorded yet.'));
      console.log(chalk.dim('Run `backspace-ai watch` and make some changes to capture events.'));
      return;
    }

    // ── Sessions ──────────────────────────────────────────────────────────
    if (sessions.length > 0) {
      console.log(chalk.bold('\n  Sessions\n'));

      const idWidth = 10;
      const statusWidth = 10;
      const eventsWidth = 8;
      const timeWidth = 22;

      console.log(
        chalk.dim('  ') +
        chalk.cyan('ID'.padEnd(idWidth)) +
        chalk.cyan('Status'.padEnd(statusWidth)) +
        chalk.cyan('Events'.padEnd(eventsWidth)) +
        chalk.cyan('Started'.padEnd(timeWidth)) +
        chalk.cyan('Prompt'),
      );
      console.log(chalk.dim('  ' + '─'.repeat(75)));

      for (const session of sessions) {
        const shortId = session.id.slice(0, 8);
        const time = new Date(session.started_at).toLocaleString();
        const eventCount = session.event_count.toString();
        const prompt = session.prompt.slice(0, 35);

        const statusColor = session.status === 'active'
          ? chalk.green
          : session.status === 'reverted'
            ? chalk.magenta
            : chalk.dim;

        console.log(
          chalk.dim('  ') +
          chalk.white(shortId.padEnd(idWidth)) +
          statusColor(session.status.padEnd(statusWidth)) +
          chalk.yellow(eventCount.padEnd(eventsWidth)) +
          chalk.dim(time.padEnd(timeWidth)) +
          chalk.dim(prompt),
        );
      }
      console.log('');
    }

    // ── Legacy snapshots ──────────────────────────────────────────────────
    if (snapshots.length > 0) {
      console.log(chalk.bold('  Legacy Snapshots\n'));

      const idWidth = 10;
      const timeWidth = 22;
      const filesWidth = 8;

      console.log(
        chalk.dim('  ') +
        chalk.cyan('ID'.padEnd(idWidth)) +
        chalk.cyan('Timestamp'.padEnd(timeWidth)) +
        chalk.cyan('Files'.padEnd(filesWidth)) +
        chalk.cyan('Prompt'),
      );
      console.log(chalk.dim('  ' + '─'.repeat(70)));

      for (const snap of snapshots) {
        const shortId = snap.id.slice(0, 8);
        const time = snap.timestamp.toLocaleString();
        const fileCount = snap.file_paths.length.toString();
        const prompt = snap.prompt_context.slice(0, 40);

        console.log(
          chalk.dim('  ') +
          chalk.white(shortId.padEnd(idWidth)) +
          chalk.dim(time.padEnd(timeWidth)) +
          chalk.yellow(fileCount.padEnd(filesWidth)) +
          chalk.dim(prompt),
        );
      }
      console.log('');
    }
  } finally {
    db.close();
  }
}
