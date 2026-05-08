/**
 * daemon.ts — Central orchestrator for the Backspace watcher daemon
 *
 * Responsibilities:
 * 1. Starts the sniffer (passive log tailer) in the background.
 * 2. Initialises chokidar to watch the project directory with a strict
 *    ignore engine that respects `.gitignore`, binary files, and size caps.
 * 3. On file change/add, captures the latest intercepted prompt,
 *    computes a before/after diff, and persists a snapshot to SQLite.
 * 4. Debounces rapid file changes (250ms) so that a burst of AI-driven
 *    edits is grouped into a single database snapshot.
 */

import chokidar from 'chokidar';
import fs from 'node:fs';
import path from 'node:path';
import * as Diff from 'diff';
import chalk from 'chalk';
import ora from 'ora';
import type { DatabaseSync } from 'node:sqlite';

import { openDatabase, insertSnapshot } from './db.js';
import { startSniffer, getLatestPrompt } from './sniffer.js';
import { createIgnoreFilter, type IgnoreFilter } from './ignore-engine.js';
import { captureException } from './telemetry.js';

// ─── Configuration ────────────────────────────────────────────────────────────

/** How long to wait after the last file-change event before flushing a snapshot */
const DEBOUNCE_MS = 250;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DaemonOptions {
  /** Project root to watch. Defaults to `process.cwd()`. */
  cwd?: string;
}

// ─── Daemon ───────────────────────────────────────────────────────────────────

/**
 * Starts the Backspace daemon — the long-running background process that
 * captures every file-system mutation made by an AI coding agent.
 *
 * Flow:
 *   1. Open the SQLite database (must already be initialised via `backspace init`).
 *   2. Boot the sniffer (passive log tailer) to capture prompt context.
 *   3. Build the ignore filter from `.gitignore` + hardcoded safety nets.
 *   4. Walk the project tree to build an in-memory content cache.
 *   5. Watch for subsequent add/change/unlink events and debounce them.
 *   6. When the debounce window expires, flush all pending diffs into a
 *      single snapshot row tagged with the latest intercepted prompt.
 */
export function startDaemon(opts: DaemonOptions = {}): void {
  const cwd = opts.cwd ?? process.cwd();

  // ── 1. Open the database ────────────────────────────────────────────────
  let db: DatabaseSync;
  try {
    db = openDatabase(cwd);
  } catch (err: any) {
    console.error(chalk.red(err.message));
    process.exit(1);
  }

  // ── 2. Start the sniffer (passive log tailer) ───────────────────────────
  const snifferDisposable = startSniffer(cwd);

  // ── 3. Build the ignore filter ──────────────────────────────────────────
  const filter = createIgnoreFilter(cwd);

  console.log(
    chalk.cyan.bold('\n  ⏪  Backspace Daemon started\n') +
      chalk.dim(`     Project : ${cwd}\n`) +
      chalk.dim(`     Filter  : .gitignore + hardcoded safety nets\n`) +
      chalk.dim(`     Sniffer : passive log tailing (Aider, Cursor, Copilot)\n`)
  );

  // ── 4. In-memory file cache (path → last-known content) ─────────────────
  const fileCache = new Map<string, string>();

  // Pending changes accumulated during the debounce window
  const pendingChanges = new Set<string>();
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let isReady = false;

  // ── 5. Set up chokidar watcher ──────────────────────────────────────────
  //
  // We use the ignore filter's `shouldIgnore` for directory-level pruning,
  // and `shouldSkip` for individual file-level filtering (binary + size).
  const watcher = chokidar.watch(cwd, {
    ignored: (filePath: string) => {
      const rel = path.relative(cwd, filePath);
      if (rel === '') return false; // Don't ignore the root directory
      return filter.shouldIgnore(rel);
    },
    persistent: true,
    ignoreInitial: false,
  });

  const spinner = ora('Scanning initial files…').start();

  // ── 6. Flush pending changes into a single snapshot ─────────────────────

  function flushPendingChanges(): void {
    if (pendingChanges.size === 0) return;

    try {
      spinner.start('Calculating diffs…');

      const diffData: Record<string, string> = {};
      const filePaths: string[] = [];

      for (const relativePath of pendingChanges) {
        const absolutePath = path.join(cwd, relativePath);

        // Pre-flight checks: skip binary / oversized files even if chokidar let them through
        if (filter.isBinaryPath(relativePath)) continue;
        if (filter.isOversized(absolutePath)) continue;

        const oldContent = fileCache.get(relativePath) ?? '';
        let newContent = '';

        if (fs.existsSync(absolutePath)) {
          try {
            // Deep binary check on the actual file bytes
            if (filter.isBinaryFile(absolutePath)) continue;
            newContent = fs.readFileSync(absolutePath, 'utf8');
          } catch {
            // Unreadable — skip silently
            continue;
          }
        }

        // Skip if nothing actually changed
        if (oldContent === newContent) continue;

        // Compute unified diff
        const patch = Diff.createPatch(relativePath, oldContent, newContent);
        diffData[relativePath] = patch;
        filePaths.push(relativePath);

        // Update the in-memory cache
        if (newContent === '') {
          fileCache.delete(relativePath);
        } else {
          fileCache.set(relativePath, newContent);
        }
      }

      pendingChanges.clear();

      if (filePaths.length === 0) {
        spinner.stop();
        return;
      }

      // Grab the latest prompt that was intercepted by the sniffer
      const promptContext =
        getLatestPrompt() ?? '(no prompt captured — manual edit or agent not detected)';

      const snapshotId = insertSnapshot(db, {
        prompt_context: promptContext,
        file_paths: filePaths,
        diff_data: diffData,
      });

      spinner.succeed(
        `Snapshot ${chalk.green(snapshotId.substring(0, 8))} — ` +
          `${filePaths.length} file(s) captured`
      );
      console.log(chalk.dim(`  Prompt : "${promptContext.substring(0, 80)}…"\n`));
    } catch (err: any) {
      spinner.fail(`Snapshot failed: ${err.message}`);
      captureException(err);
      pendingChanges.clear();
    }
  }

  // ── 7. Debounced scheduler ──────────────────────────────────────────────

  function scheduleFlush(relativePath: string): void {
    if (!isReady) return;
    pendingChanges.add(relativePath);

    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(flushPendingChanges, DEBOUNCE_MS);
  }

  // ── 8. Wire up chokidar events ─────────────────────────────────────────

  watcher
    .on('add', (filePath) => {
      const rel = path.relative(cwd, filePath);
      if (!isReady) {
        // During the initial scan, populate the cache — skip binaries/oversized
        if (filter.isBinaryPath(rel) || filter.isOversized(filePath)) return;
        try {
          if (filter.isBinaryFile(filePath)) return;
          fileCache.set(rel, fs.readFileSync(filePath, 'utf8'));
        } catch {
          // Ignore unreadable files during initial scan
        }
      } else {
        scheduleFlush(rel);
      }
    })
    .on('change', (filePath) => {
      scheduleFlush(path.relative(cwd, filePath));
    })
    .on('unlink', (filePath) => {
      scheduleFlush(path.relative(cwd, filePath));
    })
    .on('ready', () => {
      isReady = true;
      spinner.succeed(
        `Initial scan complete — watching ${chalk.cyan(fileCache.size.toLocaleString())} files`
      );
      console.log(chalk.dim('  Waiting for changes… Press Ctrl+C to stop.\n'));
    });

  // ── 9. Graceful shutdown ────────────────────────────────────────────────

  function shutdown(): void {
    console.log(chalk.yellow('\n\n  Shutting down Backspace daemon…'));

    // Flush any remaining changes before exiting
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      flushPendingChanges();
    }

    watcher.close();
    snifferDisposable.close();
    db.close();

    console.log(chalk.green('  Done. Goodbye!\n'));
    process.exit(0);
  }

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}
