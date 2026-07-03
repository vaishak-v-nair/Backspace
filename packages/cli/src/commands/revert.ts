/**
 * commands/revert.ts — `backspace-ai revert`
 *
 * Reverses all file changes for a session or legacy snapshot.
 *
 * For sessions (provenance engine):
 *   Reads individual events in reverse sequence order and applies
 *   the inverse operation for each file mutation.
 *
 * For legacy snapshots:
 *   Decrypts the batch envelope and applies inverse patches.
 *
 * Flags:
 *   --quiet   Suppress post-revert analysis output
 *   --id <id> Revert a specific session/snapshot by ID (skip interactive prompt)
 *   --latest  Automatically revert the most recent session/snapshot
 */

import prompts from 'prompts';
import * as diff from 'diff';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import chalk from 'chalk';
import { BackspaceDB, isInitialized, type EventRow } from '../db.js';
import { decryptData } from '../crypto.js';
import { printRevertAnalysis } from '../analysis.js';

interface DiffPayload {
  path: string;
  event: string;
  patch: string;
}

// ── Decryption helpers ──────────────────────────────────────────────────────

/**
 * Decrypts an encrypted snapshot envelope into the original diff payloads.
 *
 * Pipeline (mirrors daemon.ts encryption in reverse):
 *   AES-256-GCM decrypt → base64 decode → brotli decompress → JSON parse
 */
function decryptEnvelope(
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

/** Decompresses an event's brotli-compressed diff payload. */
function decompressEventPayload(payload: Buffer | null): string {
  if (!payload) return '';
  try {
    return zlib.brotliDecompressSync(payload).toString('utf8');
  } catch {
    return payload.toString('utf8');
  }
}

// ── Session-based revert ────────────────────────────────────────────────────

async function revertSession(
  db: BackspaceDB,
  sessionId: string,
  cwd: string,
  options: { quiet?: boolean },
): Promise<void> {
  const session = db.findSession(sessionId);
  if (!session) {
    console.error(
      chalk.red(`Session "${sessionId}" not found.\n`) +
      chalk.dim('Run `backspace-ai log` to see valid IDs.'),
    );
    return;
  }

  if (session.status === 'reverted') {
    console.log(chalk.yellow(`Session ${session.id.slice(0, 8)} has already been reverted.`));
    return;
  }

  const events = db.listSessionEventsReverse(session.id);
  if (events.length === 0) {
    console.log(chalk.yellow(`Session ${session.id.slice(0, 8)} has no events to revert.`));
    return;
  }

  console.log(
    chalk.blue(`\nReverting session ${session.id.slice(0, 8)}`) +
    chalk.dim(` — ${events.length} events, "${session.prompt}"...`),
  );

  const startTime = Date.now();
  let successCount = 0;
  let failureCount = 0;
  const diffPayloads: DiffPayload[] = [];

  // Process events in reverse sequence order (latest first)
  for (const event of events) {
    const absolutePath = path.resolve(cwd, event.file_path);
    const patchText = decompressEventPayload(event.diff_payload);

    // Build DiffPayload for analysis at the end
    diffPayloads.push({
      path: event.file_path,
      event: event.event_type,
      patch: patchText,
    });

    try {
      if (event.event_type === 'add') {
        // The AI created this file → delete it
        if (fs.existsSync(absolutePath)) {
          fs.unlinkSync(absolutePath);
          console.log(chalk.green(`  🗑️ Deleted ${event.file_path}`));
          successCount++;
        } else {
          console.log(chalk.dim(`  ⊘ Already gone: ${event.file_path}`));
          successCount++;
        }
      } else if (event.event_type === 'unlink') {
        // The AI deleted this file → recreate it from the stored content
        fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
        fs.writeFileSync(absolutePath, patchText, 'utf8');
        console.log(chalk.green(`  📝 Recreated ${event.file_path}`));
        successCount++;
      } else if (event.event_type === 'change') {
        // The AI modified this file → apply the inverse patch
        if (!fs.existsSync(absolutePath)) {
          console.error(chalk.red(`  ❌ Cannot revert ${event.file_path} — file was deleted manually`));
          failureCount++;
          continue;
        }

        const currentDiskContent = fs.readFileSync(absolutePath, 'utf8');
        const parsedPatches = diff.parsePatch(patchText);
        const reversedPatches = diff.reversePatch(parsedPatches);
        const revertedContent = diff.applyPatch(currentDiskContent, reversedPatches as diff.ParsedDiff[]);

        if (typeof revertedContent === 'string') {
          fs.writeFileSync(absolutePath, revertedContent, 'utf8');
          console.log(chalk.green(`  ↩️  Reverted ${event.file_path}`));
          successCount++;
        } else {
          console.error(chalk.red(`  ❌ Hunk rejection on ${event.file_path} — file was modified after capture`));
          failureCount++;
        }
      }
    } catch (err) {
      console.error(chalk.red(`  ❌ Failed to revert ${event.file_path}:`), err instanceof Error ? err.message : err);
      failureCount++;
      // Stop on first failure — do NOT continue partial rollback
      console.error(chalk.red('\nRevert aborted — partial rollback detected. Manual intervention required.'));
      return;
    }
  }

  // Mark session as reverted
  if (failureCount === 0) {
    db.revertSession(session.id);
  }

  // ── Post-revert output ──────────────────────────────────────────────────
  if (options.quiet) {
    const elapsed = Date.now() - startTime;
    if (failureCount === 0) {
      console.log(chalk.green.bold(`\n✓ ${successCount} files reverted in ${elapsed}ms`));
    } else {
      console.log(chalk.yellow.bold(`\n⚠️ Revert partially completed with ${failureCount} failure(s).`));
    }
  } else {
    printRevertAnalysis(diffPayloads, successCount, failureCount);
  }
}

// ── Legacy snapshot revert ──────────────────────────────────────────────────

async function revertLegacySnapshot(
  db: BackspaceDB,
  snapshotId: string,
  cwd: string,
  options: { quiet?: boolean },
): Promise<void> {
  const snapshot = db.findSnapshot(snapshotId);

  if (!snapshot) {
    console.error(
      chalk.red(`Snapshot "${snapshotId}" not found.\n`) +
      chalk.dim('Run `backspace-ai log` to see valid IDs.'),
    );
    return;
  }

  // Decrypt the diff payloads
  let diffPayloads: DiffPayload[];
  try {
    const rawPayload = snapshot.diff_data;

    if (rawPayload && typeof rawPayload === 'object' && !Array.isArray(rawPayload)) {
      const envelope = rawPayload as { cipher_payload?: string; crypto_iv?: string; crypto_tag?: string; compressed?: boolean };
      if (envelope.cipher_payload && envelope.crypto_iv && envelope.crypto_tag) {
        diffPayloads = decryptEnvelope(
          envelope as { cipher_payload: string; crypto_iv: string; crypto_tag: string; compressed?: boolean },
          cwd,
        );
      } else {
        diffPayloads = [];
      }
    } else if (Array.isArray(rawPayload)) {
      diffPayloads = rawPayload as DiffPayload[];
    } else {
      diffPayloads = [];
    }
  } catch {
    console.error(chalk.red(`Failed to parse snapshot ${snapshotId}.`));
    console.error(chalk.dim('The snapshot data may be corrupted or the encryption key may have changed.'));
    return;
  }

  if (diffPayloads.length === 0) {
    console.log(chalk.yellow(`Snapshot ${snapshotId} has no revertable changes.`));
    return;
  }

  console.log(chalk.blue(`\nReverting snapshot ${snapshot.id.slice(0, 8)}...`));

  const startTime = Date.now();
  let successCount = 0;
  let failureCount = 0;

  for (const payload of diffPayloads) {
    const absolutePath = path.resolve(cwd, payload.path);
    const fileExists = fs.existsSync(absolutePath);

    if (payload.event === 'add' || payload.event === 'addDir') {
      if (payload.patch === 'BINARY_FILE_BYPASSED') continue;
      if (fileExists) {
        fs.unlinkSync(absolutePath);
        console.log(chalk.green(`  🗑️ Deleted new file ${payload.path}`));
        successCount++;
      }
      continue;
    }

    if (payload.event === 'unlink' || payload.event === 'unlinkDir') {
      if (payload.patch === 'BINARY_FILE_BYPASSED') continue;
      fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
      fs.writeFileSync(absolutePath, payload.patch, 'utf8');
      console.log(chalk.green(`  📝 Recreated deleted file ${payload.path}`));
      successCount++;
      continue;
    }

    // change event
    if (fileExists) {
      if (payload.patch === 'BINARY_FILE_BYPASSED') continue;
      const currentDiskContent = fs.readFileSync(absolutePath, 'utf8');
      const parsedPatches = diff.parsePatch(payload.patch);
      const reversedPatches = diff.reversePatch(parsedPatches);
      const revertedContent = diff.applyPatch(currentDiskContent, reversedPatches as diff.ParsedDiff[]);

      if (typeof revertedContent === 'string') {
        fs.writeFileSync(absolutePath, revertedContent, 'utf8');
        console.log(chalk.green(`  ↩️  Reverted changes in ${payload.path}`));
        successCount++;
      } else {
        console.error(chalk.red(`  ❌ Hunk rejection on ${payload.path}`));
        failureCount++;
      }
    } else {
      console.error(chalk.red(`  ❌ Cannot revert ${payload.path} — file was deleted manually`));
      failureCount++;
    }
  }

  if (options.quiet) {
    const elapsed = Date.now() - startTime;
    if (failureCount === 0) {
      console.log(chalk.green.bold(`\n✓ ${successCount} files reverted in ${elapsed}ms`));
    } else {
      console.log(chalk.yellow.bold(`\n⚠️ Revert partially completed with ${failureCount} failure(s).`));
    }
  } else {
    printRevertAnalysis(diffPayloads, successCount, failureCount);
  }
}

// ── Main command entry point ────────────────────────────────────────────────

export async function revertCommand(
  options: { quiet?: boolean; id?: string; latest?: boolean } = {},
): Promise<void> {
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
    const sessions = db.listSessions(10);
    const snapshots = db.listSnapshots(10);

    if (sessions.length === 0 && snapshots.length === 0) {
      console.log(chalk.yellow('No sessions or snapshots found in history.'));
      console.log(chalk.dim('Run `backspace-ai watch` and make some changes first.'));
      return;
    }

    // --latest: auto-select the most recent item
    if (options.latest) {
      if (sessions.length > 0) {
        await revertSession(db, sessions[0].id, cwd, options);
      } else {
        await revertLegacySnapshot(db, snapshots[0].id, cwd, options);
      }
      return;
    }

    // --id: match by ID prefix
    if (options.id) {
      // Try sessions first, then snapshots
      const sessionMatch = sessions.find((s) => s.id.startsWith(options.id!));
      if (sessionMatch) {
        await revertSession(db, sessionMatch.id, cwd, options);
        return;
      }

      const snapshotMatch = snapshots.find((s) => s.id.startsWith(options.id!));
      if (snapshotMatch) {
        await revertLegacySnapshot(db, snapshotMatch.id, cwd, options);
        return;
      }

      console.error(
        chalk.red(`No session or snapshot matching "${options.id}" found.\n`) +
        chalk.dim('Run `backspace-ai log` to see valid IDs.'),
      );
      return;
    }

    // Interactive mode: build choices from sessions + snapshots
    type Choice = { title: string; value: string; description: string; type: 'session' | 'snapshot' };
    const choices: Choice[] = [];

    for (const session of sessions) {
      const statusIcon = session.status === 'active' ? '●' : session.status === 'reverted' ? '↩' : '○';
      choices.push({
        title: `${statusIcon} Session ${session.id.slice(0, 8)} — ${session.prompt}`,
        value: `session:${session.id}`,
        description: `${session.event_count} events | ${new Date(session.started_at).toLocaleString()}`,
        type: 'session',
      });
    }

    for (const snap of snapshots) {
      choices.push({
        title: `◇ Snapshot ${snap.id.slice(0, 8)} — ${snap.prompt_context}`,
        value: `snapshot:${snap.id}`,
        description: `${snap.file_paths.length} files | ${snap.timestamp.toLocaleString()}`,
        type: 'snapshot',
      });
    }

    const response = await prompts({
      type: 'select',
      name: 'selection',
      message: 'Select a session or snapshot to revert',
      choices,
    });

    if (!response.selection) {
      console.log(chalk.dim('Revert cancelled.'));
      return;
    }

    const [type, id] = (response.selection as string).split(':');
    if (type === 'session') {
      await revertSession(db, id, cwd, options);
    } else {
      await revertLegacySnapshot(db, id, cwd, options);
    }
  } finally {
    db.close();
  }
}
