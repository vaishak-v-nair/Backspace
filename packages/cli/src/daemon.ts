/**
 * daemon.ts — Backspace background file watcher
 *
 * Runs as a detached child process, watching the project directory for
 * filesystem mutations. When changes are detected, it captures unified
 * diffs, compresses and encrypts them, and writes snapshot rows to the
 * local SQLite database.
 *
 * Launched by the supervisor (supervisor.ts) via the __daemon-worker flag.
 */

import { execSync } from 'node:child_process';
import chokidar from 'chokidar';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import * as diff from 'diff';
import crypto from 'node:crypto';
import { BackspaceDB, BACKSPACE_DIR, DB_FILENAME, type EventType } from './db.js';
import { encryptData, encryptEventPayload } from './crypto.js';
import { createIgnoreFilter, type IgnoreFilter } from './ignore-engine.js';
import { startSniffer, getLatestPrompt, type SnifferDisposable } from './sniffer.js';

interface FileChange {
  event: 'add' | 'addDir' | 'change' | 'unlink' | 'unlinkDir';
  path: string;
}

export class Daemon {
  private watcher: chokidar.FSWatcher | null = null;
  private db: BackspaceDB;
  private pendingChanges: FileChange[] = [];
  private debounceTimer: NodeJS.Timeout | null = null;
  private cwd: string;
  private sessionId: string | undefined;
  private fileCache: Map<string, string> = new Map(); // path -> file content for diffs
  private ignoreFilter: IgnoreFilter;
  private sniffer: SnifferDisposable | null = null;

  constructor(cwd: string, db: BackspaceDB, sessionId?: string) {
    this.cwd = cwd;
    this.db = db;
    this.sessionId = sessionId;
    this.ignoreFilter = createIgnoreFilter(cwd);
  }

  public static async start(options: { cwd: string; sessionId?: string }): Promise<Daemon> {
    const db = BackspaceDB.open(options.cwd);
    const daemon = new Daemon(options.cwd, db, options.sessionId);
    await daemon.start();
    return daemon;
  }

  public async start(): Promise<void> {
    // Start the AI prompt sniffer to capture prompt context from AI tools
    this.sniffer = startSniffer(this.cwd);

    this.watcher = chokidar.watch(this.cwd, {
      ignored: (filePath: string, _stats?: fs.Stats) => {
        const relPath = path.relative(this.cwd, filePath);
        if (!relPath) return false; // Don't ignore the root dir itself
        return this.ignoreFilter.shouldIgnore(relPath);
      },
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: 50,
        pollInterval: 10
      }
    });

    this.watcher
      .on('all', (event, filePath) => {
        this.handleFileEvent(event, filePath);
      })
      .on('error', (error) => {
        console.error(`[Daemon] Watcher error:`, error);
      });

    console.log(`[Daemon] Watching ${this.cwd} for changes...`);
  }

  private handleFileEvent(event: FileChange['event'], filePath: string): void {
    const relPath = path.relative(this.cwd, filePath);

    // Use the production-grade ignore filter for binary/oversized/ignored files
    if (event !== 'unlink' && event !== 'unlinkDir') {
      if (this.ignoreFilter.shouldSkip(relPath, filePath)) return;
    } else {
      // For deletions, only check ignore rules (file is already gone, can't check size/binary)
      if (this.ignoreFilter.shouldIgnore(relPath)) return;
    }

    console.log(`[Daemon] Event: ${event} on ${filePath}`);
    this.pendingChanges.push({ event, path: filePath });

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    // 250ms debounce
    // If an AI changes 15 files in 50ms, this groups them all into one transaction
    this.debounceTimer = setTimeout(() => {
      this.processBatch();
    }, 250);
  }

  private processBatch(): void {
    if (this.pendingChanges.length === 0) return;

    const changesToProcess = [...this.pendingChanges];
    this.pendingChanges = []; // clear pending queue

    const filesChangedList: string[] = [];
    const diffPayloads: Array<{
      path: string;
      event: string;
      patch: string;
      beforeHash: string | null;
      afterHash: string | null;
    }> = [];

    for (const change of changesToProcess) {
      // Only process files for content diffs (skip directories)
      if (change.event === 'addDir' || change.event === 'unlinkDir') continue;

      const relPath = path.relative(this.cwd, change.path);
      filesChangedList.push(relPath);

      // Binary file filtering using the comprehensive ignore-engine
      if (this.ignoreFilter.isBinaryPath(relPath)) {
        diffPayloads.push({
          path: relPath,
          event: change.event,
          patch: 'BINARY_FILE_BYPASSED',
          beforeHash: null,
          afterHash: null
        });
        continue;
      }

      // Deep binary check (null-byte sniffing) for files without known binary extensions
      if (change.event !== 'unlink' && this.ignoreFilter.isBinaryFile(change.path)) {
        diffPayloads.push({
          path: relPath,
          event: change.event,
          patch: 'BINARY_FILE_BYPASSED',
          beforeHash: null,
          afterHash: null
        });
        continue;
      }

      let currentContent = '';
      if (change.event !== 'unlink') {
        try {
          // Attempt to read the new content gracefully
          currentContent = fs.readFileSync(change.path, 'utf8');
        } catch (err: unknown) {
          const code = (err as NodeJS.ErrnoException).code;
          if (code === 'EACCES' || code === 'EPERM') {
            console.error(`[Daemon] Permission denied reading file ${change.path}`);
          } else if (code === 'ENOENT') {
            // File might have been deleted right after change event
            continue;
          } else {
            console.error(`[Daemon] Failed to read file ${change.path}:`, err);
          }
          continue;
        }
      }

      let previousContent = this.fileCache.get(change.path);

      if (previousContent === undefined && change.event !== 'add') {
        // The Git Bridge: first time we see this file (change), or chokidar
        // fired unlink before we cached it — recover the baseline from Git
        // history. Without this, the patch baseline would be '' and a later
        // revert would truncate the file to empty instead of restoring it.
        try {
          const gitPath = relPath.replace(/\\/g, '/'); // Git uses forward slashes
          previousContent = execSync(`git show HEAD:"${gitPath}"`, {
            cwd: this.cwd,
            encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'ignore']
          });
        } catch {
          // Not tracked in Git — baseline is unrecoverable
          previousContent = undefined;
        }
      }

      // Update local memory cache
      if (change.event === 'unlink') {
        this.fileCache.delete(change.path);
      } else {
        this.fileCache.set(change.path, currentContent);
      }

      // Generate payload based on the 3 paths of patching
      let patchData = '';
      let beforeHash: string | null = null;
      let afterHash: string | null = null;

      if (change.event !== 'add' && previousContent === undefined) {
        // Baseline unknown (untracked file never cached): a patch against ''
        // would make revert wipe the file. Record the event as unrevertable
        // instead of fabricating a destructive baseline.
        patchData = 'BASELINE_UNKNOWN';
        afterHash = change.event === 'unlink'
          ? null
          : crypto.createHash('sha256').update(currentContent).digest('hex').slice(0, 32);
      } else if (change.event === 'unlink') {
        // Provide the entire original text for reconstruction
        patchData = previousContent as string;
        beforeHash = crypto.createHash('sha256').update(patchData).digest('hex').slice(0, 32);
      } else {
        const baseline = change.event === 'add' ? '' : (previousContent as string);
        patchData = diff.createPatch(relPath, baseline, currentContent, 'Old', 'New');
        beforeHash = change.event === 'add'
          ? null
          : crypto.createHash('sha256').update(baseline).digest('hex').slice(0, 32);
        afterHash = crypto.createHash('sha256').update(currentContent).digest('hex').slice(0, 32);
      }

      diffPayloads.push({
        path: relPath,
        event: change.event,
        patch: patchData,
        beforeHash,
        afterHash
      });
    }

    if (diffPayloads.length > 0) {
      const rawDiffText = JSON.stringify(diffPayloads);

      // Pull prompt context from the AI tool sniffer instead of hardcoding
      const sniffedPrompt = getLatestPrompt();
      const contextPrompt = sniffedPrompt ?? 'System: Auto-captured batch change';

      // ── Write per-file events (provenance chain) ──────────────────────────
      if (this.sessionId) {
        try {
          for (const payload of diffPayloads) {
            if (payload.patch === 'BINARY_FILE_BYPASSED') continue;

            // Map chokidar event names to our EventType
            let eventType: EventType;
            if (payload.event === 'add' || payload.event === 'addDir') {
              eventType = 'add';
            } else if (payload.event === 'unlink' || payload.event === 'unlinkDir') {
              eventType = 'unlink';
            } else {
              eventType = 'change';
            }

            // Compress + encrypt the diff/patch data for storage
            const patchBuffer = payload.patch
              ? encryptEventPayload(payload.patch, this.cwd)
              : null;

            const sequence = this.db.getNextSequence(this.sessionId);

            this.db.insertEvent({
              id: crypto.randomUUID(),
              session_id: this.sessionId,
              file_path: payload.path,
              event_type: eventType,
              tool: null, // Will be populated from sniffer source in future
              prompt: contextPrompt,
              before_hash: payload.beforeHash,
              after_hash: payload.afterHash,
              diff_payload: patchBuffer,
              captured_at: Date.now(),
              sequence,
            });

            this.db.incrementSessionEventCount(this.sessionId);
          }
        } catch (err) {
          console.error('[Daemon] Failed to write events to database:', err);
        }
      }

      // ── Write legacy snapshot (backward compatibility) ─────────────────────
      // Compress FIRST, then encrypt.
      // Encrypted data has maximum entropy — compressing after encryption is a no-op.
      const compressedPayload = zlib.brotliCompressSync(Buffer.from(rawDiffText, 'utf8'));

      // Encrypt the compressed payload locally before it ever commits to disk
      const secureBlock = encryptData(compressedPayload.toString('base64'), this.cwd);

      const optimizedDbPayload = JSON.stringify({
        cipher_payload: secureBlock.encryptedPayload,
        crypto_iv: secureBlock.iv,
        crypto_tag: secureBlock.tag,
        compressed: true // Flag so the reader knows to decompress after decryption
      });

      try {
        // Persist directly into the crash-resilient SQLite system.
        // saveSnapshot applies brotli compression on the JSON envelope string.
        this.db.saveSnapshot(
          crypto.randomUUID(),
          optimizedDbPayload,
          JSON.stringify(filesChangedList),
          contextPrompt,
        );
      } catch (err) {
        console.error('[Daemon] Failed to write batch to database:', err);
      }
    }
  }

  public async stop(): Promise<void> {
    if (this.sniffer) {
      this.sniffer.close();
    }
    if (this.watcher) {
      await this.watcher.close();
    }
    this.db.close();
  }
}

export async function startDaemon(options: { cwd: string; sessionId?: string }): Promise<Daemon> {
  return await Daemon.start(options);
}
