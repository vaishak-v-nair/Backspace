/**
 * sniffer.ts — Passive prompt capture via log tailing
 *
 * Instead of man-in-the-middling HTTPS traffic (which causes SSL certificate
 * errors and can break the user's AI tooling), we passively tail the local
 * output files of popular AI coding tools:
 *
 *   1. Aider  — `.aider.chat.history.md` in the project root
 *   2. Cursor — workspace conversation state (OS-specific paths)
 *   3. GitHub Copilot Chat — local log/history files
 *
 * This approach is completely passive, requires zero SSL certificates, and
 * cannot accidentally block the user's network traffic.
 *
 * Public API is intentionally kept identical to the old proxy-based sniffer
 * so `daemon.ts` doesn't need major changes.
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import chokidar, { type FSWatcher } from 'chokidar';
import chalk from 'chalk';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PromptLog {
  timestamp: Date;
  prompt: string;
  source: string;
}

interface LogSource {
  /** Human-readable name for logging */
  name: string;
  /** Returns true if this tool's log files can be found on disk */
  detect(): boolean;
  /** Starts watching the log files for new prompts */
  tail(): void;
  /** Stops watching */
  stop(): void;
}

export interface SnifferDisposable {
  close(): void;
}

// ─── In-memory state ──────────────────────────────────────────────────────────

let latestPrompt: PromptLog | null = null;

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Returns the most recently intercepted prompt.
 * Called by daemon.ts to pair with a file diff.
 */
export function getLatestPrompt(): string | null {
  return latestPrompt ? latestPrompt.prompt : null;
}

/**
 * Starts the passive log tailer. Detects which AI tools are present
 * in the project and tails their log/history files.
 *
 * @param cwd  The project root directory.
 * @returns    A disposable with a `.close()` method for clean shutdown.
 */
export function startSniffer(cwd: string): SnifferDisposable {
  const sources: LogSource[] = [
    createAiderSource(cwd),
    createCursorSource(cwd),
    createCopilotSource(),
  ];

  const activeSources: LogSource[] = [];

  for (const source of sources) {
    if (source.detect()) {
      console.log(chalk.green(`[Sniffer] Detected ${source.name} — tailing logs`));
      source.tail();
      activeSources.push(source);
    }
  }

  if (activeSources.length === 0) {
    console.log(
      chalk.yellow('[Sniffer] No AI tool logs detected. Prompt capture is passive — ') +
      chalk.dim('prompts will be tagged as soon as a supported tool is detected.')
    );
  }

  return {
    close() {
      for (const source of activeSources) {
        source.stop();
      }
    },
  };
}

// ─── Internal: update the shared prompt state ─────────────────────────────────

/**
 * Strips potentially malicious vectors from AI prompts before storing them.
 * Mitigates Prompt Injection and XSS if the prompts are later rendered in a dashboard.
 */
function sanitizePrompt(raw: string): string {
  if (!raw) return '';
  // 1. Remove raw HTML/XML tags
  let clean = raw.replace(/<[^>]*>?/gm, '');
  // 2. Remove unicode control characters that could be used for terminal escape sequences
  clean = clean.replace(/[\x00-\x1F\x7F-\x9F]/g, '');
  // 3. Trim
  return clean.trim();
}

function setPrompt(prompt: string, source: string): void {
  if (!prompt || prompt.trim().length === 0) return;

  const safePrompt = sanitizePrompt(prompt);
  if (safePrompt.length === 0) return;

  latestPrompt = {
    timestamp: new Date(),
    prompt: safePrompt,
    source,
  };

  console.log(
    chalk.cyan(`[Sniffer:${source}] `) +
    chalk.dim(`Captured: "${safePrompt.substring(0, 60).trim()}…"`)
  );
}

// ─── Source: Aider ────────────────────────────────────────────────────────────
//
// Aider writes conversation history to `.aider.chat.history.md` in the
// project root. User prompts appear as lines starting with `#### `.

function createAiderSource(cwd: string): LogSource {
  const historyPath = path.join(cwd, '.aider.chat.history.md');
  let watcher: FSWatcher | null = null;
  let lastSize = 0;

  function parseLatestPrompt(): void {
    try {
      const stat = fs.statSync(historyPath);
      if (stat.size <= lastSize) return;

      // Read only the new bytes appended since last check
      const fd = fs.openSync(historyPath, 'r');
      const newBytes = stat.size - lastSize;
      const buf = Buffer.alloc(newBytes);
      fs.readSync(fd, buf, 0, newBytes, lastSize);
      fs.closeSync(fd);
      lastSize = stat.size;

      const newContent = buf.toString('utf8');
      // Find the last user prompt line (#### prefix)
      const lines = newContent.split('\n');
      for (let i = lines.length - 1; i >= 0; i--) {
        const line = lines[i].trim();
        if (line.startsWith('#### ')) {
          setPrompt(line.substring(5), 'Aider');
          break;
        }
      }
    } catch {
      // File may have been deleted or rotated — ignore
    }
  }

  return {
    name: 'Aider',
    detect(): boolean {
      return fs.existsSync(historyPath);
    },
    tail(): void {
      try {
        lastSize = fs.statSync(historyPath).size;
      } catch {
        lastSize = 0;
      }
      watcher = chokidar.watch(historyPath, { persistent: false });
      watcher.on('change', parseLatestPrompt);
    },
    stop(): void {
      watcher?.close();
    },
  };
}

// ─── Source: Cursor ───────────────────────────────────────────────────────────
//
// Cursor stores workspace state in the VS Code-style storage directory.
// We watch for changes to the workspace state and look for recent
// conversation entries.

function getCursorStoragePath(): string | null {
  const platform = os.platform();
  const home = os.homedir();

  let basePath: string;
  if (platform === 'win32') {
    basePath = path.join(home, 'AppData', 'Roaming', 'Cursor', 'User', 'workspaceStorage');
  } else if (platform === 'darwin') {
    basePath = path.join(home, 'Library', 'Application Support', 'Cursor', 'User', 'workspaceStorage');
  } else {
    basePath = path.join(home, '.config', 'Cursor', 'User', 'workspaceStorage');
  }

  return fs.existsSync(basePath) ? basePath : null;
}

function createCursorSource(cwd: string): LogSource {
  let watcher: FSWatcher | null = null;
  const storagePath = getCursorStoragePath();

  function scanForPrompts(): void {
    if (!storagePath) return;

    try {
      // Look through workspace storage directories for state.vscdb files
      const dirs = fs.readdirSync(storagePath);
      for (const dir of dirs.slice(-5)) { // Check last 5 workspace dirs
        const stateDbPath = path.join(storagePath, dir, 'state.vscdb');
        if (!fs.existsSync(stateDbPath)) continue;

        // Read the last modified workspace state file as text
        // and look for conversation-like JSON content
        try {
          const stat = fs.statSync(stateDbPath);
          // Only process recently modified files (within last 30 seconds)
          if (Date.now() - stat.mtimeMs > 30_000) continue;

          // For Cursor's SQLite state DB, we look for the chat state
          // in the raw file bytes (avoids needing better-sqlite3 as a dep)
          const content = fs.readFileSync(stateDbPath);
          const text = content.toString('utf8');

          // Cursor stores conversation state as JSON blobs
          // Look for the pattern of user messages
          const matches = text.match(/"role"\s*:\s*"user"\s*,\s*"content"\s*:\s*"([^"]{10,200})"/g);
          if (matches && matches.length > 0) {
            const lastMatch = matches[matches.length - 1];
            const contentMatch = lastMatch.match(/"content"\s*:\s*"([^"]+)"/);
            if (contentMatch) {
              setPrompt(contentMatch[1], 'Cursor');
            }
          }
        } catch {
          // Individual workspace dir unreadable — skip
        }
      }
    } catch {
      // Storage path unreadable
    }
  }

  return {
    name: 'Cursor',
    detect(): boolean {
      return storagePath !== null;
    },
    tail(): void {
      if (!storagePath) return;
      watcher = chokidar.watch(storagePath, {
        persistent: false,
        depth: 2,
        ignored: /node_modules/,
      });
      watcher.on('change', scanForPrompts);
    },
    stop(): void {
      watcher?.close();
    },
  };
}

// ─── Source: GitHub Copilot Chat ──────────────────────────────────────────────
//
// GitHub Copilot stores conversation logs in a platform-specific directory.

function getCopilotLogPath(): string | null {
  const platform = os.platform();
  const home = os.homedir();

  let basePath: string;
  if (platform === 'win32') {
    basePath = path.join(home, 'AppData', 'Local', 'github-copilot');
  } else if (platform === 'darwin') {
    basePath = path.join(home, 'Library', 'Caches', 'github-copilot');
  } else {
    basePath = path.join(home, '.config', 'github-copilot');
  }

  return fs.existsSync(basePath) ? basePath : null;
}

function createCopilotSource(): LogSource {
  let watcher: FSWatcher | null = null;
  const logPath = getCopilotLogPath();

  function scanLogFiles(): void {
    if (!logPath) return;

    try {
      const files = fs.readdirSync(logPath).filter(f => f.endsWith('.log'));
      if (files.length === 0) return;

      // Sort by modification time, take the most recent
      const sorted = files
        .map(f => ({ name: f, mtime: fs.statSync(path.join(logPath, f)).mtimeMs }))
        .sort((a, b) => b.mtime - a.mtime);

      const latestLog = path.join(logPath, sorted[0].name);
      const content = fs.readFileSync(latestLog, 'utf8');

      // Look for user prompt patterns in Copilot log output
      const lines = content.split('\n');
      for (let i = lines.length - 1; i >= 0; i--) {
        const line = lines[i];
        // Copilot chat logs often contain "user:" or "prompt:" markers
        const promptMatch = line.match(/(?:user|prompt|query)\s*[:=]\s*(.{10,200})/i);
        if (promptMatch) {
          setPrompt(promptMatch[1], 'Copilot');
          break;
        }
      }
    } catch {
      // Log dir unreadable
    }
  }

  return {
    name: 'GitHub Copilot',
    detect(): boolean {
      return logPath !== null;
    },
    tail(): void {
      if (!logPath) return;
      watcher = chokidar.watch(logPath, {
        persistent: false,
        depth: 1,
      });
      watcher.on('change', scanLogFiles);
    },
    stop(): void {
      watcher?.close();
    },
  };
}
