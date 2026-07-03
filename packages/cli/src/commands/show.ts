/**
 * commands/show.ts — `backspace-ai show <id>`
 *
 * Pretty-prints the diffs for a session (events) or legacy snapshot.
 * Tries session match first, then falls back to snapshot.
 */

import chalk from 'chalk';
import zlib from 'node:zlib';
import { BackspaceDB, isInitialized } from '../db.js';
import { decryptData } from '../crypto.js';

interface DiffPayload {
  path: string;
  event: string;
  patch: string;
}

/** Decrypts a snapshot's encrypted envelope. */
function decryptPayloads(
  data: { cipher_payload: string; crypto_iv: string; crypto_tag: string; compressed?: boolean },
  cwd: string,
): DiffPayload[] {
  const decryptedBase64 = decryptData(data.cipher_payload, data.crypto_iv, data.crypto_tag, cwd);

  if (data.compressed) {
    const buf = Buffer.from(decryptedBase64, 'base64');
    const decompressed = zlib.brotliDecompressSync(buf).toString('utf8');
    return JSON.parse(decompressed) as DiffPayload[];
  }

  return JSON.parse(decryptedBase64) as DiffPayload[];
}

/** Decompresses a brotli-compressed event payload. */
function decompressPayload(payload: Buffer | null): string {
  if (!payload) return '';
  try {
    return zlib.brotliDecompressSync(payload).toString('utf8');
  } catch {
    return payload.toString('utf8');
  }
}

/** Prints a single diff entry with syntax coloring. */
function printDiff(filePath: string, eventType: string, patch: string): void {
  const eventColor = eventType === 'add'
    ? chalk.green
    : eventType === 'unlink'
      ? chalk.red
      : chalk.yellow;

  console.log(`\n  ${eventColor(`[${eventType}]`)} ${chalk.white(filePath)}`);

  if (!patch) return;

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

export function showCommand(idArg: string): void {
  const cwd = process.cwd();

  if (!isInitialized(cwd)) {
    console.error(
      chalk.red('Backspace is not initialized in this directory.\n') +
      chalk.dim('Run `backspace-ai init` first.'),
    );
    process.exit(1);
  }

  if (!idArg) {
    console.error(
      chalk.red('ID is required.\n') +
      chalk.dim('Usage: backspace-ai show <id>\n') +
      chalk.dim('Run `backspace-ai log` to see valid IDs.'),
    );
    process.exit(1);
  }

  const db = BackspaceDB.open(cwd);

  try {
    // Try session first
    const session = db.findSession(idArg);
    if (session) {
      showSession(db, session.id, cwd);
      return;
    }

    // Fall back to legacy snapshot
    const snapshot = db.findSnapshot(idArg);
    if (snapshot) {
      showLegacySnapshot(snapshot, cwd);
      return;
    }

    console.error(
      chalk.red(`No session or snapshot matching "${idArg}" found.\n`) +
      chalk.dim('Run `backspace-ai log` to see valid IDs.'),
    );
    process.exit(1);
  } finally {
    db.close();
  }
}

function showSession(db: BackspaceDB, sessionId: string, cwd: string): void {
  const session = db.getSession(sessionId);
  if (!session) return;

  const events = db.listSessionEvents(sessionId);

  const statusColor = session.status === 'active'
    ? chalk.green
    : session.status === 'reverted'
      ? chalk.magenta
      : chalk.dim;

  console.log(chalk.bold(`\n  Session: ${session.id.slice(0, 8)}`));
  console.log(chalk.dim(`  Status  : `) + statusColor(session.status));
  console.log(chalk.dim(`  Prompt  : `) + chalk.white(session.prompt));
  console.log(chalk.dim(`  Started : `) + chalk.white(new Date(session.started_at).toLocaleString()));
  if (session.ended_at) {
    console.log(chalk.dim(`  Ended   : `) + chalk.white(new Date(session.ended_at).toLocaleString()));
  }
  if (session.tool) {
    console.log(chalk.dim(`  Tool    : `) + chalk.white(session.tool));
  }
  console.log(chalk.dim(`  Events  : `) + chalk.white(events.length.toString()));
  console.log(chalk.dim('  ' + '─'.repeat(60)));

  if (events.length === 0) {
    console.log(chalk.dim('\n  No events recorded in this session.'));
    console.log('');
    return;
  }

  for (const event of events) {
    const patch = decompressPayload(event.diff_payload);
    printDiff(event.file_path, event.event_type, patch);
  }

  console.log('');
}

function showLegacySnapshot(
  snapshot: { id: string; timestamp: Date; prompt_context: string; diff_data: unknown },
  cwd: string,
): void {
  if (!snapshot.diff_data) {
    console.error(chalk.red('Snapshot data is empty or corrupted.'));
    process.exit(1);
  }

  let diffPayloads: DiffPayload[];
  try {
    const rawData = snapshot.diff_data;
    if (rawData && typeof rawData === 'object' && !Array.isArray(rawData)) {
      const envelope = rawData as { cipher_payload?: string; crypto_iv?: string; crypto_tag?: string; compressed?: boolean };
      if (envelope.cipher_payload && envelope.crypto_iv && envelope.crypto_tag) {
        diffPayloads = decryptPayloads(
          envelope as { cipher_payload: string; crypto_iv: string; crypto_tag: string; compressed?: boolean },
          cwd,
        );
      } else {
        diffPayloads = [];
      }
    } else if (Array.isArray(rawData)) {
      diffPayloads = rawData as DiffPayload[];
    } else {
      diffPayloads = [];
    }
  } catch {
    console.error(
      chalk.red(`Failed to decrypt snapshot ${snapshot.id.slice(0, 8)}.\n`) +
      chalk.dim('The encryption key may have changed.'),
    );
    return;
  }

  console.log(chalk.bold(`\n  Snapshot: ${snapshot.id.slice(0, 8)}`));
  console.log(chalk.dim(`  Time   : ${snapshot.timestamp.toLocaleString()}`));
  console.log(chalk.dim(`  Prompt : ${snapshot.prompt_context}`));
  console.log(chalk.dim(`  Files  : ${diffPayloads.length}\n`));
  console.log(chalk.dim('  ' + '─'.repeat(60)));

  for (const payload of diffPayloads) {
    if (payload.patch === 'BINARY_FILE_BYPASSED') {
      console.log(chalk.dim(`\n  ${payload.path} — binary file (skipped)`));
      continue;
    }
    printDiff(payload.path, payload.event, payload.patch);
  }

  console.log('');
}
