/**
 * commands/inspect.ts — `backspace-ai inspect <event-id>`
 *
 * Shows detailed provenance information for a single event.
 * Answers: "What exactly happened to this file, when, why, and by whom?"
 */

import chalk from 'chalk';
import zlib from 'node:zlib';
import { BackspaceDB, isInitialized } from '../db.js';

/** Decompresses a brotli-compressed event payload. */
function decompressPayload(payload: Buffer | null): string {
  if (!payload) return '';
  try {
    return zlib.brotliDecompressSync(payload).toString('utf8');
  } catch {
    return payload.toString('utf8');
  }
}

export function inspectCommand(eventId: string): void {
  const cwd = process.cwd();

  if (!isInitialized(cwd)) {
    console.error(
      chalk.red('Backspace is not initialized in this directory.\n') +
      chalk.dim('Run `backspace-ai init` first.'),
    );
    process.exit(1);
  }

  if (!eventId) {
    console.error(
      chalk.red('Event ID is required.\n') +
      chalk.dim('Usage: backspace-ai inspect <event-id>\n') +
      chalk.dim('Run `backspace-ai show <session-id>` to see event IDs.'),
    );
    process.exit(1);
  }

  const db = BackspaceDB.open(cwd);

  try {
    const event = db.getEvent(eventId);

    if (!event) {
      console.error(
        chalk.red(`Event "${eventId}" not found.\n`) +
        chalk.dim('Run `backspace-ai log` to see sessions, then `backspace-ai show <id>` to see events.'),
      );
      process.exit(1);
    }

    // Look up the parent session for context
    const session = db.getSession(event.session_id);

    const typeColor = event.event_type === 'add' ? chalk.green
      : event.event_type === 'unlink' ? chalk.red
        : chalk.yellow;

    console.log(chalk.bold('\n  Event Provenance\n'));
    console.log(chalk.dim('  ' + '─'.repeat(60)));

    // Event metadata
    console.log(chalk.dim('  Event ID    : ') + chalk.white(event.id));
    console.log(chalk.dim('  File        : ') + chalk.white(event.file_path));
    console.log(chalk.dim('  Type        : ') + typeColor(event.event_type));
    console.log(chalk.dim('  Captured    : ') + chalk.white(new Date(event.captured_at).toLocaleString()));
    console.log(chalk.dim('  Sequence    : ') + chalk.white(event.sequence.toString()));

    // Provenance fields
    if (event.tool) {
      console.log(chalk.dim('  AI Tool     : ') + chalk.cyan(event.tool));
    }
    if (event.prompt) {
      console.log(chalk.dim('  Prompt      : ') + chalk.white(event.prompt));
    }

    // Integrity hashes
    if (event.before_hash) {
      console.log(chalk.dim('  Before Hash : ') + chalk.white(event.before_hash));
    }
    if (event.after_hash) {
      console.log(chalk.dim('  After Hash  : ') + chalk.white(event.after_hash));
    }

    // Session context
    if (session) {
      console.log(chalk.dim('\n  Session     : ') + chalk.white(`${session.id.slice(0, 8)} (${session.status})`));
      console.log(chalk.dim('  Session Lbl : ') + chalk.white(session.prompt));
      if (session.tool) {
        console.log(chalk.dim('  Session Tool: ') + chalk.cyan(session.tool));
      }
    }

    // Diff content
    console.log(chalk.dim('\n  ' + '─'.repeat(60)));
    console.log(chalk.bold('  Diff:\n'));

    const patch = decompressPayload(event.diff_payload);
    if (!patch) {
      console.log(chalk.dim('  (no diff data)'));
    } else {
      const lines = patch.split('\n');
      for (const line of lines) {
        if (line.startsWith('+') && !line.startsWith('+++')) {
          console.log(chalk.green(`  ${line}`));
        } else if (line.startsWith('-') && !line.startsWith('---')) {
          console.log(chalk.red(`  ${line}`));
        } else if (line.startsWith('@@')) {
          console.log(chalk.cyan(`  ${line}`));
        } else {
          console.log(chalk.dim(`  ${line}`));
        }
      }
    }

    console.log('');
  } finally {
    db.close();
  }
}
