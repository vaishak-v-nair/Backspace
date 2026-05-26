import { execSync } from 'child_process';
import chokidar from 'chokidar';
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import * as diff from 'diff';
import crypto from 'crypto';
import { LocalDB, SnapshotPayload, BACKSPACE_DIR, DB_FILENAME } from './db.js';
import { encryptData } from './crypto.js';
import { createIgnoreFilter, type IgnoreFilter } from './ignore-engine.js';
import { startSniffer, getLatestPrompt, type SnifferDisposable } from './sniffer.js';

interface FileChange {
  event: 'add' | 'addDir' | 'change' | 'unlink' | 'unlinkDir';
  path: string;
}

export class Daemon {
  private watcher: chokidar.FSWatcher | null = null;
  private db: LocalDB;
  private pendingChanges: FileChange[] = [];
  private debounceTimer: NodeJS.Timeout | null = null;
  private cwd: string;
  private fileCache: Map<string, string> = new Map(); // path -> file content for diffs
  private ignoreFilter: IgnoreFilter;
  private sniffer: SnifferDisposable | null = null;

  constructor(cwd: string = process.cwd(), db: LocalDB) {
    this.cwd = cwd;
    this.db = db;
    this.ignoreFilter = createIgnoreFilter(cwd);
  }

  public static async start(options: { cwd: string }) {
    const db = new LocalDB(path.join(options.cwd, BACKSPACE_DIR, DB_FILENAME));
    const daemon = new Daemon(options.cwd, db);
    await daemon.start();
    return daemon;
  }

  public async start() {
    // Start the AI prompt sniffer to capture prompt context from AI tools
    this.sniffer = startSniffer(this.cwd);

    this.watcher = chokidar.watch(this.cwd, {
      ignored: (filePath: string, stats?: fs.Stats) => {
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

  private handleFileEvent(event: FileChange['event'], filePath: string) {
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

  private async processBatch() {
    if (this.pendingChanges.length === 0) return;

    const changesToProcess = [...this.pendingChanges];
    this.pendingChanges = []; // clear pending queue

    const snapshots: SnapshotPayload[] = [];
    const filesChangedList: string[] = [];
    const diffPayloads: any[] = [];

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
          patch: "BINARY_FILE_BYPASSED"
        });
        continue;
      }

      // Deep binary check (null-byte sniffing) for files without known binary extensions
      if (change.event !== 'unlink' && this.ignoreFilter.isBinaryFile(change.path)) {
        diffPayloads.push({
          path: relPath,
          event: change.event,
          patch: "BINARY_FILE_BYPASSED"
        });
        continue;
      }

      let currentContent = '';
      if (change.event !== 'unlink') {
        try {
          // Attempt to read the new content gracefully
          currentContent = fs.readFileSync(change.path, 'utf8');
        } catch (err: any) {
          if (err.code === 'EACCES' || err.code === 'EPERM') {
            console.error(`[Daemon] Permission denied reading file ${change.path}`);
          } else if (err.code === 'ENOENT') {
            // File might have been deleted right after change event
            continue;
          } else {
            console.error(`[Daemon] Failed to read file ${change.path}:`, err);
          }
          continue;
        }
      }

      let previousContent = this.fileCache.get(change.path);

      if (change.event === 'unlink' && previousContent === undefined) {
        // The Git Bridge: If chokidar fired unlink before we cached the file,
        // we extract the ghost file directly from Git history.
        try {
          const gitPath = relPath.replace(/\\/g, '/'); // Git uses forward slashes
          previousContent = execSync(`git show HEAD:"${gitPath}"`, {
            cwd: this.cwd,
            encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'ignore']
          });
        } catch (e) {
          // Fallback if not tracked in Git
          previousContent = '';
        }
      } else {
        previousContent = previousContent || '';
      }

      // Update local memory cache
      if (change.event === 'unlink') {
        this.fileCache.delete(change.path);
      } else {
        this.fileCache.set(change.path, currentContent);
      }

      // Generate payload based on the 3 paths of patching
      let patchData = '';
      if (change.event === 'unlink') {
        // Provide the entire original text for reconstruction
        patchData = previousContent;
      } else {
        patchData = diff.createPatch(relPath, previousContent, currentContent, 'Old', 'New');
      }

      diffPayloads.push({
        path: relPath,
        event: change.event,
        patch: patchData
      });
    }

    if (diffPayloads.length > 0) {
      const rawDiffText = JSON.stringify(diffPayloads);

      // Pull prompt context from the AI tool sniffer instead of hardcoding
      const sniffedPrompt = getLatestPrompt();
      const contextPrompt = sniffedPrompt ?? "System: Auto-captured batch change";

      // CORRECT ORDER: Compress FIRST, then encrypt.
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
        // Persist directly into the crash-resilient SQLite system
        // Note: saveCompressedSnapshot also applies brotli, but since our payload
        // is already a JSON string (not raw diff), the double compression is minimal.
        // We pass the encrypted JSON directly — the db method handles its own compression.
        this.db.saveCompressedSnapshot(crypto.randomUUID(), optimizedDbPayload, JSON.stringify(filesChangedList), contextPrompt);
      } catch (err) {
        console.error('[Daemon] Failed to write batch to database:', err);
      }
    }
  }

  public async stop() {
    if (this.sniffer) {
      this.sniffer.close();
    }
    if (this.watcher) {
      await this.watcher.close();
    }
  }
}

export async function startDaemon(options: { cwd: string }) {
  return await Daemon.start(options);
}

// Internal worker hook if running directly
if (process.argv[2] === '__daemon-run') {
  startDaemon({ cwd: process.cwd() });
}
