/**
 * commands/timeline.ts — `backspace-ai timeline`
 *
 * Displays a chronological timeline of all AI activity across sessions.
 * Shows which files were touched, when, and by which AI tool.
 *
 * Flags:
 *   --file <path>  Filter timeline to a specific file
 *   --limit <n>    Maximum number of events to show (default: 30)
 */

import chalk from 'chalk';
import { BackspaceDB, isInitialized } from '../db.js';

export function timelineCommand(options: { file?: string; limit?: number } = {}): void {
  const cwd = process.cwd();

  if (!isInitialized(cwd)) {
    console.error(
      chalk.red('Backspace is not initialized in this directory.\n') +
      chalk.dim('Run `backspace-ai init` first.'),
    );
    process.exit(1);
  }

  const db = BackspaceDB.open(cwd);
  const limit = options.limit ?? 30;

  try {
    if (options.file) {
      // File-specific timeline
      const events = db.listFileEvents(options.file, limit);

      if (events.length === 0) {
        console.log(chalk.yellow(`No events found for file: ${options.file}`));
        console.log(chalk.dim('Check the path is relative to the project root.'));
        return;
      }

      console.log(chalk.bold(`\n  Timeline for ${chalk.white(options.file)}\n`));
      console.log(chalk.dim('  ' + '─'.repeat(70)));

      for (const event of events) {
        const time = new Date(event.captured_at).toLocaleTimeString();
        const date = new Date(event.captured_at).toLocaleDateString();

        const typeIcon = event.event_type === 'add' ? '+'
          : event.event_type === 'unlink' ? '×'
            : '~';

        const typeColor = event.event_type === 'add' ? chalk.green
          : event.event_type === 'unlink' ? chalk.red
            : chalk.yellow;

        console.log(
          chalk.dim(`  ${date} ${time} `) +
          typeColor(`[${typeIcon}] `) +
          chalk.white(event.event_type.padEnd(8)) +
          chalk.dim(` session:${event.session_id.slice(0, 8)}`) +
          (event.tool ? chalk.cyan(` via ${event.tool}`) : ''),
        );
      }
    } else {
      // Full timeline across all sessions
      const sessions = db.listSessions();

      if (sessions.length === 0) {
        console.log(chalk.yellow('No sessions recorded yet.'));
        console.log(chalk.dim('Run `backspace-ai watch` to start tracking.'));
        return;
      }

      console.log(chalk.bold('\n  AI Activity Timeline\n'));
      console.log(chalk.dim('  ' + '─'.repeat(75)));

      let totalEvents = 0;

      for (const session of sessions) {
        if (totalEvents >= limit) break;

        const started = new Date(session.started_at);
        const statusColor = session.status === 'active' ? chalk.green
          : session.status === 'reverted' ? chalk.magenta
            : chalk.dim;

        console.log(
          chalk.dim(`\n  ${started.toLocaleDateString()} ${started.toLocaleTimeString()} `) +
          chalk.bold(`Session ${session.id.slice(0, 8)} `) +
          statusColor(`[${session.status}]`) +
          chalk.dim(` — ${session.prompt}`),
        );

        const events = db.listSessionEvents(session.id);
        const displayCount = Math.min(events.length, limit - totalEvents);

        for (let i = 0; i < displayCount; i++) {
          const event = events[i];
          const time = new Date(event.captured_at).toLocaleTimeString();

          const typeIcon = event.event_type === 'add' ? '+' : event.event_type === 'unlink' ? '×' : '~';
          const typeColor = event.event_type === 'add' ? chalk.green : event.event_type === 'unlink' ? chalk.red : chalk.yellow;

          console.log(
            chalk.dim(`    ${time} `) +
            typeColor(`${typeIcon} `) +
            chalk.white(event.file_path) +
            (event.tool ? chalk.cyan(` via ${event.tool}`) : ''),
          );
        }

        if (events.length > displayCount) {
          console.log(chalk.dim(`    ... and ${events.length - displayCount} more events`));
        }

        totalEvents += events.length;
      }
    }

    console.log('');
  } finally {
    db.close();
  }
}
