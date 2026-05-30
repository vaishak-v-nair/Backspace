/**
 * commands/show.ts — `backspace-ai show <id>`
 *
 * Pretty-prints the diffs for a specific snapshot.
 */

import chalk from 'chalk';
import path from 'path';
import { LocalDB, BACKSPACE_DIR, DB_FILENAME, isInitialized } from '../db.js';
import { decryptData } from '../crypto.js';

export function showCommand(snapshotId: string): void {
  const cwd = process.cwd();

  if (!isInitialized(cwd)) {
    console.error(
      chalk.red('Backspace is not initialized in this directory.\n') +
      chalk.dim('Run `backspace-ai init` first.')
    );
    process.exit(1);
  }

  if (!snapshotId) {
    console.error(
      chalk.red('Snapshot ID is required.\n') +
      chalk.dim('Usage: backspace-ai show <id>\n') +
      chalk.dim('Run `backspace-ai log` to see valid IDs.')
    );
    process.exit(1);
  }

  const dbPath = path.join(cwd, BACKSPACE_DIR, DB_FILENAME);
  const db = new LocalDB(dbPath);

  // Support partial ID matching
  const snapshots = db.getRecentSnapshots(100);
  const match = snapshots.find((s: { id: string }) => s.id.startsWith(snapshotId));

  if (!match) {
    console.error(
      chalk.red(`Snapshot "${snapshotId}" not found.\n`) +
      chalk.dim('Run `backspace-ai log` to see valid IDs.')
    );
    process.exit(1);
  }

  const snapshot = db.getSnapshotById(match.id);

  if (!snapshot || !snapshot.diff_payload) {
    console.error(chalk.red('Snapshot data is empty or corrupted.'));
    process.exit(1);
  }

  // Parse the diff payload (may be encrypted)
  let diffPayloads;
  try {
    const rawPayload = JSON.parse(snapshot.diff_payload);

    if (rawPayload.cipher_payload) {
      const decryptedStr = decryptData(rawPayload.cipher_payload, rawPayload.crypto_iv, rawPayload.crypto_tag, cwd);
      diffPayloads = JSON.parse(decryptedStr);
    } else {
      diffPayloads = Array.isArray(rawPayload) ? rawPayload : [rawPayload];
    }
  } catch {
    console.error(chalk.red('Failed to parse snapshot data.'));
    process.exit(1);
  }

  console.log(chalk.bold(`\n  Snapshot: ${match.id.slice(0, 8)}`));
  console.log(chalk.dim(`  Time   : ${new Date(snapshot.timestamp).toLocaleString()}`));
  console.log(chalk.dim(`  Prompt : ${snapshot.prompt || 'Auto-capture'}`));
  console.log(chalk.dim(`  Files  : ${diffPayloads.length}\n`));
  console.log(chalk.dim('  ' + '─'.repeat(60)));

  for (const payload of diffPayloads) {
    if (payload.patch === 'BINARY_FILE_BYPASSED') {
      console.log(chalk.dim(`\n  ${payload.path} — binary file (skipped)`));
      continue;
    }

    const eventColor = payload.event === 'add' ? chalk.green : payload.event === 'unlink' ? chalk.red : chalk.yellow;
    console.log(`\n  ${eventColor(`[${payload.event}]`)} ${chalk.white(payload.path)}`);

    if (payload.patch) {
      const lines = payload.patch.split('\n');
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
  }

  console.log('');
}
